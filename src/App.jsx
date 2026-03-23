import React, { useState, useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import { geoCentroid } from "d3-geo";

const WORLD_GEOJSON = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const US_GEOJSON = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

const STATE_CAPITALS = {
  "Alabama": "Montgomery", "Alaska": "Juneau", "Arizona": "Phoenix", "Arkansas": "Little Rock",
  "California": "Sacramento", "Colorado": "Denver", "Connecticut": "Hartford", "Delaware": "Dover",
  "Florida": "Tallahassee", "Georgia": "Atlanta", "Hawaii": "Honolulu", "Idaho": "Boise",
  "Illinois": "Springfield", "Indiana": "Indianapolis", "Iowa": "Des Moines", "Kansas": "Topeka",
  "Kentucky": "Frankfort", "Louisiana": "Baton Rouge", "Maine": "Augusta", "Maryland": "Annapolis",
  "Massachusetts": "Boston", "Michigan": "Lansing", "Minnesota": "St. Paul", "Mississippi": "Jackson",
  "Missouri": "Jefferson City", "Montana": "Helena", "Nebraska": "Lincoln", "Nevada": "Carson City",
  "New Hampshire": "Concord", "New Jersey": "Trenton", "New Mexico": "Santa Fe", "New York": "Albany",
  "North Carolina": "Raleigh", "North Dakota": "Bismarck", "Ohio": "Columbus", "Oklahoma": "Oklahoma City",
  "Oregon": "Salem", "Pennsylvania": "Harrisburg", "Rhode Island": "Providence", "South Carolina": "Columbia",
  "South Dakota": "Pierre", "Tennessee": "Nashville", "Texas": "Austin", "Utah": "Salt Lake City",
  "Vermont": "Montpelier", "Virginia": "Richmond", "Washington": "Olympia", "West Virginia": "Charleston",
  "Wisconsin": "Madison", "Wyoming": "Cheyenne"
};

export default function App() {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverD, setHoverD] = useState(null);
  
  const [cameraTarget, setCameraTarget] = useState("world");
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [showCapitals, setShowCapitals] = useState(false);
  const [info, setInfo] = useState({ name: "", type: "", message: "" });

  // Keep canvas sized correctly
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch map data safely
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(WORLD_GEOJSON).then(r => r.json()),
      fetch(US_GEOJSON).then(r => r.json())
    ])
    .then(([world, usa]) => {
      const worldFeatures = world.features.filter(f => {
        const name = f.properties.ADMIN || f.properties.name;
        return name !== "United States of America" && name !== "United States";
      }).map(f => ({
        ...f,
        properties: { ...f.properties, isState: false, displayName: f.properties.ADMIN || f.properties.name }
      }));

      const stateFeatures = usa.features.map(f => ({
        ...f,
        properties: { ...f.properties, isState: true, displayName: f.properties.name }
      }));

      setFeatures([...worldFeatures, ...stateFeatures]);
      setIsLoading(false);
    })
    .catch(err => console.error("Map data error:", err));
  }, []);

  // Move camera
  useEffect(() => {
    if (!globeRef.current) return;
    if (cameraTarget === "world") {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1500);
    } else if (cameraTarget === "usa") {
      globeRef.current.pointOfView({ lat: 39.8, lng: -98.5, altitude: 0.8 }, 1500);
    }
  }, [cameraTarget]);

  // OPTIMIZED: Calculate native WebGL text labels once
  const labelsData = useMemo(() => {
    return features.filter(f => f.properties.isState).map(f => {
      const centroid = geoCentroid(f);
      if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
      
      const stateName = f.properties.displayName;
      const capitalName = STATE_CAPITALS[stateName];
      
      return {
        lat: centroid[1],
        lng: centroid[0],
        // Use a newline character to stack State and Capital cleanly
        text: showCapitals && capitalName ? `${stateName}\n⭐ ${capitalName}` : stateName
      };
    }).filter(Boolean);
  }, [features, showCapitals]);

  const handlePolygonClick = (polygon) => {
    const { displayName, isState } = polygon.properties;
    const capital = STATE_CAPITALS[displayName];

    if (isState) {
      setInfo({
        name: displayName,
        type: "STATE",
        message: `${displayName} is a STATE. It is a smaller puzzle piece that belongs to the country of the United States.${capital ? ` Its capital city is ${capital}.` : ""}`
      });
    } else {
      setInfo({
        name: displayName,
        type: "COUNTRY",
        message: `${displayName} is a COUNTRY. It has its own borders, laws, and highest leaders.`
      });
    }
    setIsPopupVisible(true);
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative", backgroundColor: "#020617" }}>
      
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000, backgroundColor: "rgba(255, 255, 255, 0.95)", padding: "1rem 1.5rem", borderRadius: "1rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
        <h1 style={{ margin: "0 0 0.5rem 0", color: "#2563eb", fontSize: "2rem", fontWeight: "900" }}>3D Earth Explorer!</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setCameraTarget("world")} 
            style={{ padding: "0.5rem 1rem", fontSize: "1rem", fontWeight: "bold", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: cameraTarget === "world" ? "#16a34a" : "#f1f5f9", color: cameraTarget === "world" ? "white" : "#475569", border: "none", transition: "all 0.2s" }}
          >
            🌍 World
          </button>
          <button 
            onClick={() => setCameraTarget("usa")} 
            style={{ padding: "0.5rem 1rem", fontSize: "1rem", fontWeight: "bold", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: cameraTarget === "usa" ? "#2563eb" : "#f1f5f9", color: cameraTarget === "usa" ? "white" : "#475569", border: "none", transition: "all 0.2s" }}
          >
            🇺🇸 USA
          </button>
          <div style={{ width: "2px", backgroundColor: "#cbd5e1", margin: "0 0.25rem" }}></div>
          <button 
            onClick={() => setShowCapitals(!showCapitals)} 
            style={{ padding: "0.5rem 1rem", fontSize: "1rem", fontWeight: "bold", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: showCapitals ? "#ef4444" : "#f1f5f9", color: showCapitals ? "white" : "#475569", border: "none", transition: "all 0.2s" }}
          >
            {showCapitals ? "⭐ Hide Capitals" : "⭐ Show Capitals"}
          </button>
        </div>
      </div>

      {isPopupVisible && (
        <div style={{ position: "absolute", bottom: "30px", left: "20px", zIndex: 1000, backgroundColor: "rgba(255, 255, 255, 0.98)", padding: "1.5rem", paddingTop: "2.5rem", borderRadius: "1.5rem", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)", maxWidth: "400px", backdropFilter: "blur(4px)", borderLeft: `6px solid ${info.type === "COUNTRY" ? "#16a34a" : "#2563eb"}` }}>
          <button
            onClick={() => setIsPopupVisible(false)}
            style={{ position: "absolute", top: "10px", right: "10px", width: "24px", height: "24px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "16px", lineHeight: 0, padding: 0 }}
          >
            ×
          </button>
          <h2 style={{ fontSize: "1.8rem", margin: "0 0 0.5rem 0", color: "#0f172a" }}>{info.name}</h2>
          <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", backgroundColor: info.type === "COUNTRY" ? "#16a34a" : "#2563eb", color: "white", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            {info.type}
          </span>
          <p style={{ fontSize: "1.1rem", margin: 0, color: "#475569", lineHeight: "1.5" }}>{info.message}</p>
        </div>
      )}

      {isLoading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#020617", zIndex: 2000 }}>
          <h2 style={{ fontSize: "2rem", color: "#60a5fa", fontWeight: "bold" }}>Constructing 3D Earth...</h2>
        </div>
      )}

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        polygonsData={features}
        polygonAltitude={0.01} 
        polygonCapColor={d => 
          d === hoverD ? 'rgba(255, 255, 255, 0.5)' : 
          (d.properties.isState ? 'rgba(37, 99, 235, 0.3)' : 'rgba(22, 163, 74, 0.2)')
        }
        polygonSideColor={() => 'rgba(0, 0, 0, 0.15)'}
        polygonStrokeColor={() => '#ffffff'}
        
        onPolygonHover={setHoverD}
        onPolygonClick={handlePolygonClick}
        
        polygonLabel={({ properties: d }) => `
          <div class="globe-tooltip">
            <div>${d.displayName}</div>
          </div>
        `}

        // OPTIMIZED NATIVE WEBGL TEXT
        labelsData={labelsData}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={d => d.text}
        
        // These settings guarantee the text stays small but extremely readable
        labelSize={0.4} 
        labelDotRadius={0.1}
        labelColor={() => 'rgba(255, 255, 255, 0.95)'}
        labelResolution={4} // Multiplies the internal canvas rendering scale for crispness
        labelAltitude={0.015} // Keeps the text clinging tightly to the globe surface
      />
    </div>
  );
}
