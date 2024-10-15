// Import the necessary Firebase SDKs
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAx8xk47HO-UzccSaOWTGHH6jySE_-95o",
  authDomain: "fog-game-3a2c0.firebaseapp.com",
  projectId: "fog-game-3a2c0",
  storageBucket: "fog-game-3a2c0.appspot.com",
  messagingSenderId: "419121652765",
  appId: "1:419121652765:web:48831b6a2d1774ac7e52f4",
  measurementId: "G-B39Y6HSNZS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Function to sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("User Info:", result.user);
  } catch (error) {
    console.error("Error during sign-in:", error);
  }
};

// Function to get the leaderboard data from Firestore
export const getLeaderboard = async () => {
  try {
    const leaderboardRef = collection(firestore, "leaderboard");
    const leaderboardSnapshot = await getDocs(leaderboardRef);
    const leaderboardList = leaderboardSnapshot.docs.map((doc) => doc.data());
    return leaderboardList;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
};
