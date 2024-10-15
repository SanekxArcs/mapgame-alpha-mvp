// Completed MapWithFog.jsx with Firestore Integration and Leaderboard Component
import  { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import personIconWalking from "./assets/person-walking.webp"; // Icon of a walking person
import personIconStanding from "./assets/person-standing.gif"; 
import { getLeaderboard } from "./firebase"; // Icon of a standing person
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
import { motion } from "framer-motion";
import { getRedirectResult, GoogleAuthProvider } from "firebase/auth";

const AnimatedMarker = ({ position, isWalking }) => {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundImage: `url(${
          isWalking ? personIconWalking : personIconStanding
        })`,
        backgroundSize: "cover",
      }}
      initial={{ x: position[0], y: position[1] }}
      animate={{ x: position[0], y: position[1] }}
      transition={{ duration: 1.5 }} // Плавний перехід з тривалістю 1.5 секунди
    />
  );
};




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
      className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
    >
      Оновити таблицю лідерів
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
      // Очищуємо попередній стан canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Малюємо туман на всій карті
      ctx.fillStyle = `rgba(0, 0, 0, ${fogOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Вирізаємо прозорі круги на місцях, де карта "відкрита"
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

      animationFrameId = requestAnimationFrame(animateFog);
    };

    animateFog(); // Запускаємо анімацію

    return () => {
      cancelAnimationFrame(animationFrameId); // Очищаємо анімацію при виході
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
      // Плавне переміщення до нової позиції з анімацією
      map.setView(position, map.getZoom(), {
        animate: true,
        duration: 1.5, // Тривалість анімації в секундах
      });
    }
  }, [position, map]);

  return null;
};

const MapWithFog = () => {
  const [userName, setUserName] = useState(null); // State to store the user's name
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(20);
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
    const [lastUpdateTime, setLastUpdateTime] = useState(null); // Час останнього оновлення
    const [smoothThreshold, setSmoothThreshold] = useState(10);

  const updatePosition = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const newPosition = [latitude, longitude];
      const currentTime = Date.now(); // Час поточного оновлення

      // Обчислюємо, скільки часу пройшло з моменту останнього оновлення
      if (lastUpdateTime) {
        const timeDiff = (currentTime - lastUpdateTime) / 1000; // У секундах
        const isSmooth = timeDiff <= smoothThreshold;

        // Плавне або різке переміщення
        map.setView(newPosition, map.getZoom(), {
          animate: isSmooth, // Якщо час між оновленнями менший за поріг, переміщення плавне
          duration: isSmooth ? 1.5 : 0, // Якщо анімація плавна, тривалість 1.5 секунди, інакше різке переміщення
        });
      } else {
        // Якщо це перше оновлення, просто встановлюємо нову позицію
        map.setView(newPosition, map.getZoom(), { animate: false });
      }

      // Оновлюємо стан
      setPosition(newPosition);
      setLastUpdateTime(currentTime); // Зберігаємо час останнього оновлення

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
  useEffect(() => {
    // Обробляємо результат перенаправлення (тільки якщо було використано redirect)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          setUserName(result.user.displayName); // Встановлюємо ім'я користувача
        }
      })
      .catch((error) => {
        console.error("Failed to handle redirect result:", error);
      });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(updatePosition, 5000); // Оновлення кожні 5 секунд
    return () => clearInterval(intervalId);
  }, [lastUpdateTime, smoothThreshold]);

  //  const updatePosition = () => {
  //    if (!navigator.geolocation) {
  //      alert("Geolocation is not supported by your browser");
  //      return;
  //    }

  //    navigator.geolocation.getCurrentPosition(
  //      (pos) => {
  //        const { latitude, longitude } = pos.coords;
  //        const newPosition = [latitude, longitude];
  //        setPosition(newPosition);

  //        setRevealedAreas((areas) => {
  //          const isAreaRevealed = areas.some(
  //            (area) =>
  //              Math.abs(area.lat - latitude) < 0.0001 &&
  //              Math.abs(area.lng - longitude) < 0.0001
  //          );
  //          if (!isAreaRevealed) {
  //            return [...areas, { lat: latitude, lng: longitude }];
  //          }
  //          return areas;
  //        });
  //      },
  //      (err) => {
  //        console.error("Error getting geolocation:", err);
  //        alert(
  //          "Failed to get your location. Please check your browser settings."
  //        );
  //      },
  //      { enableHighAccuracy: true }
  //    );
  //  };

   const startAutoUpdate = () => {
     setAutoUpdate(true);
     if (worker) {
       worker.postMessage({ action: "start", updateInterval }); // Запускаємо оновлення через worker
     }
   };

   const stopAutoUpdate = () => {
     setAutoUpdate(false);
     if (worker) {
       worker.postMessage({ action: "stop" }); // Зупиняємо оновлення
     }
   };
   useEffect(() => {
     // Оновлюємо позицію гравця
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
       stopAutoUpdate(); // Зупиняємо, якщо автооновлення вимкнене
     } else {
       startAutoUpdate(); // Запускаємо, якщо автооновлення увімкнене
     }
   }, [autoUpdate]);

  useEffect(() => {
    if (typeof Worker !== "undefined") {
      worker = new Worker("worker.js"); // Запускаємо Web Worker
    }

    // Слухаємо повідомлення від Web Worker для оновлення позиції
    worker.onmessage = function (e) {
      if (e.data.type === "updatePosition") {
        updatePosition(); // Функція для оновлення позиції і очищення туману
      }
    };

    return () => {
      if (worker) worker.terminate(); // Зупиняємо Web Worker при виході
    };
  }, []);
  
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
    if (revealedAreas && points !== undefined) {
      localStorage.setItem("revealedAreas", JSON.stringify(revealedAreas));
      localStorage.setItem("points", points);
      handleSaveProgress(revealedAreas, points); // Save progress when areas or points change
    }
  }, [revealedAreas, points]);

  useEffect(() => {
    // Check if the user is already logged in
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName); // Set the user's display name if logged in
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
    <div className="flex flex-col items-center w-full md:w-auto">
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
      <div className="fixed top-6 left-20 z-[9999] w-full text-white text-xl">
        {userName ? `Вітаємо, ${userName}!` : "Ви ще не увійшли."}
      </div>
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
            className="w-full px-4 py-2 text-white bg-blue-500 rounded-full shadow hover:bg-blue-600 active:scale-95 md:w-auto"
          >
            Update position
          </button>
          <button
            onClick={() => setAutoUpdate((prev) => !prev)}
            className="w-full px-4 py-2 text-white bg-yellow-500 rounded-full shadow hover:bg-yellow-600 active:scale-95 md:w-auto"
          >
            {autoUpdate
              ? `Stop auto update. Updates: ${updateCount}`
              : `Start auto update. Updates: ${updateCount}`}
          </button>
          <div className="w-full px-4 py-2 text-sm font-medium text-center text-white rounded-full shadow bg-emerald-500 hover:bg-yellow-600 active:scale-95 md:w-auto">
            Points: {points}
          </div>
          <div className="p-4 rounded shadow-lg">
            <label>
              плавного переміщення (секунди):
              <input
                type="number"
                value={smoothThreshold}
                onChange={(e) => setSmoothThreshold(Number(e.target.value))}
                className="p-1 ml-2 border rounded"
                min={0}
                step={1}
              />
            </label>
          </div>
          <RefreshLeaderboardButton />
          <LoginButton setUserName={setUserName} />{" "}
          {/* Pass setUserName to LoginButton */}
          <Leaderboard />
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
      </MapContainer>
    </div>
  );
};

export default MapWithFog;
