import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "./firebase"; // Ensure proper Firebase imports

export const saveUserProgress = async (userData) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in, unable to save progress.");
  }

  // Ensure userData is defined and contains valid data
  if (
    !userData ||
    !userData.revealedAreas ||
    typeof userData.score !== "number"
  ) {
    throw new Error("Invalid user data for saving progress.");
  }

  const userRef = doc(firestore, "users", user.uid); // Reference to the user's Firestore document
  return setDoc(
    userRef,
    { revealedAreas: userData.revealedAreas, score: userData.score },
    { merge: true }
  );
};
