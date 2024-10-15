import React, { useState } from "react";
import { signInWithGoogle } from "./firebase"; // Adjust the path to your Firebase config
import { auth } from "./firebase";

const LoginButton = ({ setUserName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle(); // Perform Google sign-in
      const user = auth.currentUser; // Retrieve the current logged-in user
      if (user) {
        setUserName(user.displayName); // Set the user's display name
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
