// MapWithFog.jsx

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";

const FogLayer = ({ revealedAreas, fogOpacity }) => {
  const map = useMap();

  useEffect(() => {
    const fogPane = map.getPane("fogPane") || map.createPane("fogPane");
    fogPane.style.zIndex = 500;
    fogPane.style.pointerEvents = "none";

    const fog = L.rectangle(map.getBounds(), {
      pane: "fogPane",
      color: "#000",
      weight: 0,
      fillOpacity: fogOpacity,
    }).addTo(map);

    revealedAreas.forEach(({ lat, lng, radius }) => {
      const circle = L.circle([lat, lng], {
        radius,
        pane: "fogPane",
        color: "#000",
        weight: 0,
        fillColor: "#000",
        fillOpacity: 0,
      }).addTo(map);

      circle
        .getElement()
        .setAttribute("style", "mix-blend-mode: destination-out;");
    });

    const onMoveEnd = () => {
      fog.setBounds(map.getBounds());
    };

    map.on("moveend", onMoveEnd);

    return () => {
      map.off("moveend", onMoveEnd);
      map.removeLayer(fog);
    };
  }, [map, revealedAreas, fogOpacity]);

  return null;
};

const MapWithFog = () => {
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(50);
  const [fogOpacity, setFogOpacity] = useState(0.7);
  const [revealedAreas, setRevealedAreas] = useState([]);
  const mapRef = useRef(null);

  // Видаляємо щосекундне оновлення позиції
  const updatePosition = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPosition = [latitude, longitude];
        setPosition(newPosition);

        setRevealedAreas((areas) => [
          ...areas,
          { lat: latitude, lng: longitude, radius },
        ]);

        // Центруємо карту на позиції користувача
        if (mapRef.current) {
          mapRef.current.setView(newPosition);
        }
      },
      (err) => {
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    // Виконуємо перше оновлення позиції
    updatePosition();
  }, [radius]);

  return (
    <div>
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          padding: "10px",
          background: "white",
        }}
      >
        <label>
          Радіус відкриття (метрів): {radius}
          <input
            type="range"
            min="10"
            max="100"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
        <br />
        <label>
          Прозорість туману: {fogOpacity}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={fogOpacity}
            onChange={(e) => setFogOpacity(Number(e.target.value))}
          />
        </label>
        <br />
        <button onClick={updatePosition}>Оновити позицію</button>
      </div>
      <MapContainer
        center={position || [50.4501, 30.5234]}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
          setTimeout(() => {
            map.invalidateSize();
          }, 0);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && (
          <Circle
            center={position}
            radius={5}
            pathOptions={{ color: "blue" }}
          />
        )}
        <FogLayer revealedAreas={revealedAreas} fogOpacity={fogOpacity} />
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
