import { getDoc, doc } from "firebase/firestore";
import { firestore } from "./firebase"; // Ensure proper Firebase imports

export const loadUserProgress = async (userId) => {
  try {
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.warn("No user progress found, returning default values.");
      return { revealedAreas: [], score: 0 }; // Return default values if no document exists
    }

    const userData = userDoc.data();

    // Ensure userData contains the necessary fields, else return defaults
    return {
      revealedAreas: userData.revealedAreas || [],
      score: userData.score || 0,
    };
  } catch (error) {
    console.error("Failed to load user progress:", error);
    return { revealedAreas: [], score: 0 }; // Return default values in case of an error
  }
};
