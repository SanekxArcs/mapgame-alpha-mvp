// MapWithFog.jsx

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// CanvasOverlay компонент
const CanvasOverlay = ({ revealedAreas, fogOpacity, mapSize, radius }) => {
  const map = useMap();
  const zoom = map.getZoom();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = mapSize.width;
    canvas.height = mapSize.height;

    // Очищуємо попередній стан полотна
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Малюємо темний туман на всій карті
    ctx.filter = "blur(0px)";
    ctx.fillStyle = `rgba(0, 0, 0, ${fogOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Створюємо отвори для розкритих областей з плавними градієнтними краями
    revealedAreas.forEach(({ lat, lng }) => {
      const adjustedRadius = radius / Math.pow(2, 15 - zoom); // Масштабуємо радіус залежно від рівня zoom
      const point = map.latLngToContainerPoint([lat, lng]);
      const gradientRadius = adjustedRadius * 1;
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        gradientRadius
      );
      gradient.addColorStop(0, `rgba(0, 0, 0, ${fogOpacity * 0.5})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, gradientRadius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    });
  }, [revealedAreas, fogOpacity, mapSize, radius, zoom]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 400,
      }}
    />
  );
};

const CenterMapOnPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
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
  const [updateInterval, setUpdateInterval] = useState(1000);
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
    updatePosition(); // Оновлення позиції та центрування при завантаженні сторінки
    if (autoUpdate) {
      intervalRef.current = setInterval(updatePosition, updateInterval);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoUpdate, updateInterval]);

  const mapSize = { width: window.innerWidth, height: window.innerHeight };

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
        <label>
          Інтервал оновлення (мс): {updateInterval}
          <input
            type="number"
            min="500"
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
          />
        </label>
        <br />
        <button onClick={updatePosition}>Оновити позицію</button>
        <button
          onClick={() => {
            if (position) {
              console.log("Центрування на позицію:", position);
              setPosition(position);
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
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && (
          <>
            <CircleMarker
              center={position}
              radius={8}
              pathOptions={{ color: "blue", fillColor: "blue", fillOpacity: 1 }}
            />
            <CenterMapOnPosition position={position} />
          </>
        )}
        <CanvasOverlay
          revealedAreas={revealedAreas}
          fogOpacity={fogOpacity}
          mapSize={mapSize}
          radius={radius}
        />
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
