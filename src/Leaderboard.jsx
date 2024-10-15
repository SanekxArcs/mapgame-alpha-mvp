import { useState, useEffect } from "react";
import { getLeaderboard } from "./firebase";

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const leaderboard = await getLeaderboard();
        setLeaders(leaderboard);
      } catch (error) {
        setError("Не вдалося завантажити таблицю лідерів.");
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="grid p-2 bg-stone-300 rounded-3xl min-w-64 place-content-center min-h-12">
      <h2>Leaderboard</h2>
      <ul>
        {leaders.map((leader, index) => (
          <li key={index}>
            {leader.name}: {leader.score} points
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
