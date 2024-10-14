// App.jsx

import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Pane,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const FogLayer = ({ revealedAreas }) => {
  const map = useMapEvents({});

  useEffect(() => {
    const fogPane = map.createPane("fogPane");
    fogPane.style.zIndex = 500;
    fogPane.style.pointerEvents = "none";

    // Створюємо повний чорний прямокутник, який покриває всю карту
    const fog = L.rectangle(map.getBounds(), {
      pane: "fogPane",
      color: "#000",
      weight: 0,
      fillOpacity: 0.2,
    }).addTo(map);

    // Вирізаємо прозорі кола в місцях відкритих областей
    revealedAreas.forEach(({ lat, lng, radius }) => {
      const circle = L.circle([lat, lng], {
        radius,
        pane: "fogPane",
        color: "#000",
        weight: 0,
        fillColor: "#000",
        fillOpacity: 0,
      }).addTo(map);

      // Застосовуємо SVG-фільтр для вирізання отворів
      circle
        .getElement()
        .setAttribute("style", "mix-blend-mode: destination-out;");
    });

    // Оновлюємо туман при зміні карти
    map.on("moveend", () => {
      fog.setBounds(map.getBounds());
    });

    return () => {
      map.removeLayer(fog);
    };
  }, [map, revealedAreas]);

  return null;
};

const MapWithFog = () => {
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(50); // Радіус у метрах
  const [revealedAreas, setRevealedAreas] = useState([]);

  useEffect(() => {
    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);

          setRevealedAreas((areas) => [
            ...areas,
            { lat: latitude, lng: longitude, radius },
          ]);
        },
        (err) => {
          console.error(err);
        },
        { enableHighAccuracy: true },
      );
    };

    // Оновлюємо геопозицію кожну секунду
    updatePosition();
    const interval = setInterval(updatePosition, 1000);

    return () => clearInterval(interval);
  }, [radius]);

  return (
    <div>
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          padding: "10px",
          background: "gray",
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
      </div>
      <MapContainer
        center={position || [50.4501, 30.5234]} // Якщо позиція ще не відома, центр на Києві
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
        whenCreated={(map) => {
          // Виправлення для відображення картки на мобільних пристроях
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
        <FogLayer revealedAreas={revealedAreas} />
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
