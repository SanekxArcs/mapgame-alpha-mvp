import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { firestore } from "./firebase";

export const getLeaderboard = async () => {
  const leaderboardQuery = query(
    collection(firestore, "users"),
    orderBy("score", "desc"),
    limit(5)
  );

  const querySnapshot = await getDocs(leaderboardQuery);
  const leaderboard = [];
  querySnapshot.forEach((doc) => {
    leaderboard.push(doc.data());
  });

  return leaderboard;
};
