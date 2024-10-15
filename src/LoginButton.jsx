import React, { useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "./firebase";

const LoginButton = ({ setUserName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Перевіряємо, чи це мобільний пристрій
  const isMobileDevice = () => {
    return /Mobi|Android/i.test(navigator.userAgent);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      if (isMobileDevice()) {
        // Використовуємо перенаправлення на мобільних
        await signInWithRedirect(auth, provider);
      } else {
        // Для десктопа використовуємо спливаюче вікно
        const result = await signInWithPopup(auth, provider);
        setUserName(result.user.displayName);
      }
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
      >
        {loading ? "Завантаження..." : "Увійти через Google"}
      </button>
    </div>
  );
};

export default LoginButton;
