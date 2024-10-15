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
    return <div>Завантаження...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h2>Таблиця лідерів</h2>
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
