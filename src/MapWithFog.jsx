// MapWithFog.jsx

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Виправлення для іконок Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const FogLayer = ({ revealedAreas, fogOpacity }) => {
  const map = useMap();

  useEffect(() => {
    const fogPane = map.getPane("fogPane") || map.createPane("fogPane");
    fogPane.style.zIndex = 500;
    fogPane.style.pointerEvents = "none";

    // Отримуємо координати зовнішнього полігону (всього екрану)
    const bounds = map.getBounds();
    const outerRing = [
      [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
      [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
    ];

    // Створюємо отвори для відкритих областей
    const holes = revealedAreas.map(({ lat, lng, radius }) => {
      const circlePoints = generateCirclePoints([lat, lng], radius, 64);
      return circlePoints;
    });

    // Комбінуємо зовнішній полігон і отвори
    const polygonLatLngs = [outerRing, ...holes];

    // Створюємо полігон туману з отворами
    const fogPolygon = L.polygon(polygonLatLngs, {
      pane: "fogPane",
      color: "#000",
      weight: 0,
      fillOpacity: fogOpacity,
      fillRule: "evenodd", // Важливо для роботи отворів
    }).addTo(map);

    // Додаємо градієнт для краю прозорого отвору
    revealedAreas.forEach(({ lat, lng, radius }) => {
      L.circle([lat, lng], {
        radius,
        color: "rgba(0, 0, 0, 0.5)",
        weight: 1,
        fillOpacity: 0,
        pane: "fogPane",
      }).addTo(map);
    });

    // Оновлюємо туман при зміні карти
    const onMoveEnd = () => {
      fogPolygon.remove();

      const bounds = map.getBounds();
      const outerRing = [
        [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
        [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
        [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
        [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
      ];

      const holes = revealedAreas.map(({ lat, lng, radius }) => {
        const circlePoints = generateCirclePoints([lat, lng], radius, 64);
        return circlePoints;
      });

      const polygonLatLngs = [outerRing, ...holes];

      fogPolygon.setLatLngs(polygonLatLngs).addTo(map);
    };

    map.on("moveend", onMoveEnd);

    return () => {
      map.off("moveend", onMoveEnd);
      fogPolygon.remove();
    };
  }, [map, revealedAreas, fogOpacity]);

  return null;
};

// Функція для генерації точок кола
function generateCirclePoints(centerLatLng, radiusInMeters, numPoints = 64) {
  const latlngs = [];
  const centerLat = centerLatLng[0];
  const centerLng = centerLatLng[1];
  const earthRadius = 6371000; // Радіус Землі в метрах

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const dx = radiusInMeters * Math.cos(angle);
    const dy = radiusInMeters * Math.sin(angle);

    const deltaLat = (dy / earthRadius) * (180 / Math.PI);
    const deltaLng =
      (dx / (earthRadius * Math.cos((centerLat * Math.PI) / 180))) *
      (180 / Math.PI);

    const lat = centerLat + deltaLat;
    const lng = centerLng + deltaLng;

    latlngs.push([lat, lng]);
  }

  return latlngs;
}

const CenterMapOnPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      console.log("Переміщуємо карту до:", position);
      map.setView(position);
    } else {
      console.log("position недоступна");
    }
  }, [position, map]);

  return null;
};

const MapWithFog = () => {
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(50);
  const [fogOpacity, setFogOpacity] = useState(0.7);
  const [revealedAreas, setRevealedAreas] = useState([]);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const intervalRef = useRef(null);

  const updatePosition = () => {
    if (!navigator.geolocation) {
      alert("Геолокація не підтримується вашим браузером");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPosition = [latitude, longitude];
        console.log("Поточна позиція:", newPosition);
        setPosition(newPosition);

        setRevealedAreas((areas) => [
          ...areas,
          { lat: latitude, lng: longitude, radius },
        ]);

        setUpdateCount((count) => count + 1);
      },
      (err) => {
        console.error("Помилка отримання геолокації:", err);
        alert(
          "Не вдалося отримати ваше місцезнаходження. Перевірте налаштування браузера."
        );
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (autoUpdate) {
      intervalRef.current = setInterval(updatePosition, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [autoUpdate]);

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
        <button
          onClick={() => {
            if (position) {
              console.log("Центрування на позицію:", position);
            } else {
              alert(
                'Позиція не доступна. Натисніть "Оновити позицію" та перевірте дозволи геолокації.'
              );
            }
          }}
          style={{ marginTop: "5px" }}
        >
          Показати моє місцезнаходження
        </button>
        <br />
        <button
          onClick={() => setAutoUpdate((prev) => !prev)}
          style={{ marginTop: "5px" }}
        >
          {autoUpdate
            ? "Зупинити автоматичне оновлення"
            : "Запустити автоматичне оновлення"}
        </button>
        <br />
        <span>Кількість оновлень геопозиції: {updateCount}</span>
      </div>
      <MapContainer
        center={position || [50.4501, 30.5234]}
        zoom={100}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && (
          <>
            <Circle
              center={position}
              radius={5}
              pathOptions={{ color: "blue" }}
            />
            <CenterMapOnPosition position={position} />
          </>
        )}
        <FogLayer revealedAreas={revealedAreas} fogOpacity={fogOpacity} />
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
