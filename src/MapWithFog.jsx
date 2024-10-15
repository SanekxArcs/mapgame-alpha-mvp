import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import personIconWalking from "./assets/person-walking.webp";
import personIconStanding from "./assets/person-standing.gif";
import { getLeaderboard } from "./firebase";
import {
  Settings,
  Plus,
  Minus,
  CircleX,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import LoginButton from "./LoginButton";
import { saveUserProgress } from "./saveUserProgress";
import { loadUserProgress } from "./loadUserProgress";
import Leaderboard from "./Leaderboard";
import { auth } from "./firebase";
import { getRedirectResult, GoogleAuthProvider } from "firebase/auth";



let worker = null;

const handleSaveProgress = async (revealedAreas, points) => {
  const user = auth.currentUser;

  if (!user) {
    console.warn("User is not logged in, skipping save progress.");
    return;
  }

  try {
    await saveUserProgress({ revealedAreas, score: points });
    console.log("Progress saved successfully");
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
};

const RefreshLeaderboardButton = () => {
  const handleRefresh = async () => {
    const leaderboard = await getLeaderboard();
    console.log("Updated Leaderboard:", leaderboard);
  };

  return (
    <button
      onClick={handleRefresh}
      className="px-4 py-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 min-w-64 min-h-12"
    >
      Update leaderboard
    </button>
  );
};

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
    let animationFrameId;
    const animateFog = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgba(0, 0, 0, ${fogOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      revealedAreas.forEach(({ lat, lng }) => {
        const adjustedRadius = radius / Math.pow(2, 15 - zoom);
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
      animationFrameId = requestAnimationFrame(animateFog);
    };
    animateFog();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [revealedAreas, fogOpacity, mapSize, radius, map]);

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
      map.setView(position, map.getZoom(), {
        animate: true,
        duration: 3,
      });
    }
  }, [position, map]);

  return null;
};

const MapWithFog = () => {
  const [userName, setUserName] = useState(null);
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(20);
  const [fogOpacity, setFogOpacity] = useState(0.95);
  const [revealedAreas, setRevealedAreas] = useState(() => {
    const savedAreas = localStorage.getItem("revealedAreas");
    return savedAreas ? JSON.parse(savedAreas) : [];
  });
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(1.0);
  const [updateCount, setUpdateCount] = useState(0);
  const [points, setPoints] = useState(() => {
    const savedPoints = localStorage.getItem("points");
    return savedPoints ? Number(savedPoints) : 0;
  });
  const intervalRef = useRef(null);
  const [isWalking, setIsWalking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [smoothThreshold, setSmoothThreshold] = useState(1);

const updatePosition = () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    setPosition([latitude, longitude]);

    // Додаємо логіку для оновлення відкритих зон
    setRevealedAreas((areas) => {
      const isAreaRevealed = areas.some(
        (area) =>
          Math.abs(area.lat - latitude) < 0.0001 &&
          Math.abs(area.lng - longitude) < 0.0001
      );
      if (!isAreaRevealed) {
        return [...areas, { lat: latitude, lng: longitude }];
      }
      return areas;
    });

    // Оновлюємо кількість оновлень
    setUpdateCount((prevCount) => prevCount + 1); // Збільшуємо на 1 при кожному оновленні
  });
};


  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          setUserName(result.user.displayName);
        }
      })
      .catch((error) => {
        console.error("Failed to handle redirect result:", error);
      });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(updatePosition, 1000);
    return () => clearInterval(intervalId);
  }, [lastUpdateTime, smoothThreshold]);

  const startAutoUpdate = () => {
    if (!autoUpdate) {
      setAutoUpdate(true);
      intervalRef.current = setInterval(updatePosition, updateInterval * 1000);
    }
  };
  const stopAutoUpdate = () => {
    if (autoUpdate) {
      setAutoUpdate(false);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    const updatePosition = () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        setRevealedAreas((areas) => {
          const isAreaRevealed = areas.some(
            (area) =>
              Math.abs(area.lat - latitude) < 0.0001 &&
              Math.abs(area.lng - longitude) < 0.0001
          );
          if (!isAreaRevealed) {
            return [...areas, { lat: latitude, lng: longitude }];
          }
          return areas;
        });
      });
    };
    const intervalId = setInterval(updatePosition, 5000); // Оновлення кожні 5 секунд
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!autoUpdate) {
      stopAutoUpdate();
    } else {
      startAutoUpdate();
    }
  }, [autoUpdate,]);

  useEffect(() => {
    if (typeof Worker !== "undefined") {
      worker = new Worker("worker.js");
    }
    worker.onmessage = function (e) {
      if (e.data.type === "updatePosition") {
        updatePosition();
      }
    };
    return () => {
      if (worker) worker.terminate();
    };
  }, []);

  // Використання useEffect для моніторингу змін у стані autoUpdate та інтервалу оновлення
  useEffect(() => {
    if (autoUpdate) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }

    // Очищення інтервалу при розмонтаженні компонента або зміні інтервалу
    return () => clearInterval(intervalRef.current);
  }, [autoUpdate, updateInterval]);

useEffect(() => {
  if (revealedAreas && points !== undefined) {
    localStorage.setItem("revealedAreas", JSON.stringify(revealedAreas));
    localStorage.setItem("points", points);

    // Якщо нова зона відкрита, додай очки
    if (revealedAreas.length > points) {
      setPoints(revealedAreas.length); // Оновлюємо очки відповідно до відкритих зон
    }

    handleSaveProgress(revealedAreas, points); // Збереження прогресу
  }
}, [revealedAreas, points]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName);
    }
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      loadUserProgress(user.uid)
        .then((userProgress) => {
          setRevealedAreas(userProgress.revealedAreas);
          setPoints(userProgress.score);
        })
        .catch((error) => {
          console.error("Failed to load user progress:", error);
        });
    } else {
      console.warn("User is not logged in, unable to load progress.");
    }
  }, [auth.currentUser]);

  const mapSize = { width: window.innerWidth, height: window.innerHeight };

  const personIcon = L.divIcon({
    html: `<img src="${
      isWalking ? personIconWalking : personIconStanding
    }" style="width: 30px; height: 30px; border-radius: 100%;">`,
    iconSize: [0, 0],
    iconAnchor: [16, 16],
  });

  const ControlLayout = ({ label, value, onIncrease, onDecrease }) => (
    <div className="flex flex-col items-center w-full md:w-auto min-w-64">
      <span className="mb-1 text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrease}
          className="grid w-10 h-10 font-black text-white bg-gray-500 rounded-full shadow place-content-center hover:bg-gray-600 active:scale-95"
        >
          <Minus />
        </button>
        <div className="grid w-10 h-10 text-lg font-semibold text-gray-600 bg-gray-100 rounded-full shadow place-content-center">
          {value}
        </div>
        <button
          onClick={onIncrease}
          className="grid w-10 h-10 font-black text-white bg-gray-500 rounded-full shadow place-content-center hover:bg-gray-600 active:scale-95"
        >
          <Plus />
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="fixed top-4 left-4 z-[9999]">
        <div className="flex flex-col gap-2">
          <div className="grid w-full h-12 px-3 text-sm text-white rounded-full place-content-center bg-slate-500">
            {userName ? `Hello, ${userName}!` : "Please login"}
          </div>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center justify-center w-12 h-12 text-white bg-gray-500 rounded-full shadow hover:bg-gray-600 active:scale-95"
          >
            <Settings />
          </button>
          <button
            onClick={() => setAutoUpdate((prev) => !prev)}
            className={`w-12 h-12 ${
              autoUpdate ? "bg-red-500" : "bg-green-500"
            } text-white rounded-full shadow hover:bg-gray-600 active:scale-95 flex items-center justify-center`}
          >
            {autoUpdate ? <Pause /> : <Play />}
          </button>
          <button
            onClick={updatePosition}
            className="flex items-center justify-center w-12 h-12 text-white bg-blue-500 rounded-full shadow hover:bg-blue-600 active:scale-95"
          >
            <RotateCcw />
          </button>
          <div className="flex items-center justify-center w-12 h-12 text-white rounded-full shadow bg-emerald-800 hover:bg-emerald-600 active:scale-95">
            {points}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed top-0 left-0 w-full p-4 bg-gray-100/60 backdrop-blur-sm shadow-md flex gap-2 flex-col z-[9999] items-center">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="fixed flex items-center justify-center w-12 h-12 text-white bg-gray-500 rounded-full shadow top-4 left-4 hover:bg-gray-600 active:scale-95"
          >
            <CircleX />
          </button>
          {!userName && <LoginButton setUserName={setUserName} />}

          <button
            onClick={updatePosition}
            className="px-4 py-2 text-white bg-blue-500 rounded-full shadow min-h-12 min-w-64 hover:bg-blue-600 active:scale-95"
          >
            Update position
          </button>
          <button
            onClick={() => setAutoUpdate((prev) => !prev)}
            className="px-4 py-2 text-white bg-yellow-500 rounded-full shadow min-h-12 min-w-64 hover:bg-yellow-600 active:scale-95 md:w-auto"
          >
            {autoUpdate
              ? `Stop auto update. Updates: ${updateCount}`
              : `Start auto update. Updates: ${updateCount}`}
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
          <RefreshLeaderboardButton />
          <div className="grid px-4 py-2 font-medium text-center text-white rounded-full shadow place-content-center min-h-12 min-w-64 bg-emerald-500 md:w-auto">
            Your points: {points}
          </div>

          <Leaderboard />
        </div>
      )}
      <MapContainer
        center={position || [50.4501, 30.5234]}
        zoom={18}
        style={{ height: "100vh", width: "100vw" }}
        zoomControl={false}
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
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
