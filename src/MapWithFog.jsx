// MapWithFog.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import personIconWalking from "./assets/person-walking.webp"; // Icon of a walking person
import personIconStanding from "./assets/person-standing.gif"; // Icon of a standing person
import {
  Settings,
  Plus,
  Minus,
  CircleX,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

// CanvasOverlay component
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

    // Clear previous canvas state
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dark fog over the entire map
    ctx.filter = "blur(0px)";
    ctx.fillStyle = `rgba(0, 0, 0, ${fogOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create holes for revealed areas with smooth gradient edges
    revealedAreas.forEach(({ lat, lng }) => {
      const adjustedRadius = radius / Math.pow(2, 15 - zoom); // Scale radius based on zoom level
      const point = map.latLngToContainerPoint([lat, lng]);
      const gradientRadius = adjustedRadius;
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        gradientRadius
      );
      gradient.addColorStop(0, `rgba(0, 0, 0, ${fogOpacity})`);
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
  const [fogOpacity, setFogOpacity] = useState(0.95);
  const [revealedAreas, setRevealedAreas] = useState(() => {
    const savedAreas = localStorage.getItem("revealedAreas");
    return savedAreas ? JSON.parse(savedAreas) : [];
  });
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(1.0); // Update interval in seconds
  const [updateCount, setUpdateCount] = useState(0);
  const [points, setPoints] = useState(() => {
    const savedPoints = localStorage.getItem("points");
    return savedPoints ? Number(savedPoints) : 0;
  });
  const intervalRef = useRef(null);
  const [isWalking, setIsWalking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const updatePosition = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPosition = [latitude, longitude];
        setIsWalking(true);
        setTimeout(() => setIsWalking(false), 1000); // Walking animation for 1 second
        setPosition(newPosition);

        setRevealedAreas((areas) => {
          const isAreaRevealed = areas.some(
            (area) =>
              Math.abs(area.lat - latitude) < 0.0001 &&
              Math.abs(area.lng - longitude) < 0.0001
          );
          if (!isAreaRevealed) {
            setPoints((prevPoints) => prevPoints + 10); // Add 10 points for a new area
            return [...areas, { lat: latitude, lng: longitude }];
          }
          return areas;
        });

        setUpdateCount((count) => count + 1);
      },
      (err) => {
        console.error("Error getting geolocation:", err);
        alert(
          "Failed to get your location. Please check your browser settings."
        );
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    updatePosition(); // Update position and center map on page load
    if (autoUpdate) {
      intervalRef.current = setInterval(updatePosition, updateInterval * 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoUpdate, updateInterval]);

  useEffect(() => {
    localStorage.setItem("revealedAreas", JSON.stringify(revealedAreas));
  }, [revealedAreas]);

  useEffect(() => {
    localStorage.setItem("points", points);
  }, [points]);

  const mapSize = { width: window.innerWidth, height: window.innerHeight };

  const personIcon = new L.Icon({
    iconUrl: isWalking ? personIconWalking : personIconStanding,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const ControlLayout = ({ label, value, onIncrease, onDecrease }) => (
    <div className="flex flex-col items-center w-full md:w-auto">
      <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>
      <div className="flex gap-2 items-center">
        <button
          onClick={onDecrease}
          className="w-10 h-10 grid place-content-center bg-gray-500 text-white font-black rounded-lg shadow hover:bg-gray-600 active:scale-95"
        >
          <Minus />
        </button>
        <div className="grid place-content-center text-lg font-semibold w-10 h-10 bg-gray-100 text-gray-600 rounded-lg shadow">
          {value}
        </div>
        <button
          onClick={onIncrease}
          className="w-10 h-10 grid place-content-center bg-gray-500 text-white rounded-lg font-black shadow hover:bg-gray-600 active:scale-95"
        >
          <Plus />
        </button>
      </div>
    </div>
  );

  const ZoomControls = () => {
    const map = useMap();
    return (
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-[9999]">
        <button
          onClick={() => map.zoomIn()}
          className="w-12 h-12 bg-gray-500 text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center"
        >
          <Plus />
        </button>
        <button
          onClick={() => map.zoomOut()}
          className="w-12 h-12 bg-gray-500 text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center"
        >
          <Minus />
        </button>
      </div>
    );
  };

  return (
    <div>
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-[9999] w-12 h-12 bg-gray-500 text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center"
      >
        <Settings />
      </button>
      <button
        onClick={() => setAutoUpdate((prev) => !prev)}
        className={`fixed top-20 left-4 z-[9999] w-12 h-12 ${
          autoUpdate ? "bg-red-500" : "bg-green-500"
        } text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center`}
      >
        {autoUpdate ? <Pause /> : <Play />}
      </button>
      <button
        onClick={updatePosition}
        className="fixed top-36 left-4 z-[9999] w-12 h-12 bg-blue-500 text-white rounded-full shadow hover:bg-blue-600 active:scale-95 flex items-center justify-center"
      >
        <RotateCcw />
      </button>
      <div className="fixed top-52 left-4 z-[9999] w-12 h-12 bg-emerald-800 text-white rounded-full shadow hover:bg-emerald-600 active:scale-95 flex items-center justify-center">
        {points}
      </div>
      {menuOpen && (
        <div className="fixed top-0 left-0 w-full p-4 bg-gray-100/80 backdrop-blur-sm shadow-md flex gap-4 flex-col z-[9999] space-y-4 md:flex-row md:space-y-0 md:space-x-6 items-center">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="fixed top-4 left-4 z-[9999] w-12 h-12 bg-gray-500 text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center"
          >
            <CircleX />
          </button>
          <ControlLayout
            label="See distance (m)"
            value={radius}
            onIncrease={() => setRadius((prev) => Math.min(prev + 5, 100))}
            onDecrease={() => setRadius((prev) => Math.max(prev - 5, 10))}
          />
          <ControlLayout
            label="Fog opacity"
            value={fogOpacity.toFixed(1)}
            onIncrease={() => setFogOpacity((prev) => Math.min(prev + 0.1, 1))}
            onDecrease={() => setFogOpacity((prev) => Math.max(prev - 0.1, 0))}
          />
          <ControlLayout
            label="Updates per second"
            value={updateInterval.toFixed(1)}
            onIncrease={() => setUpdateInterval((prev) => prev + 0.5)}
            onDecrease={() =>
              setUpdateInterval((prev) => Math.max(prev - 0.5, 0.5))
            }
          />
          <button
            onClick={updatePosition}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 active:scale-95 w-full md:w-auto"
          >
            Update position
          </button>
          <button
            onClick={() => setAutoUpdate((prev) => !prev)}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 active:scale-95 w-full md:w-auto"
          >
            {autoUpdate
              ? `Stop auto update. Updates: ${updateCount}`
              : `Start auto update. Updates: ${updateCount}`}
          </button>
          <div className="px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-yellow-600 active:scale-95 w-full md:w-auto text-sm font-medium text-center">
            Points: {points}
          </div>
        </div>
      )}
      <MapContainer
        center={position || [50.4501, 30.5234]}
        zoom={18}
        style={{ height: "100vh", width: "100vw" }}
        zoomControl={false} // Disable default zoom controls
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && (
          <>
            <Marker position={position} icon={personIcon} />
            <CenterMapOnPosition position={position} />
          </>
        )}
        <CanvasOverlay
          revealedAreas={revealedAreas}
          fogOpacity={fogOpacity}
          mapSize={mapSize}
          radius={radius}
        />
        <ZoomControls />
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
