import './QueueHistory.css';
import { useState, useEffect } from 'react';
import { NavLink } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

function QueueHistory() {

  const [history, setHistory] = useState([]);

  const storedUser = JSON.parse( localStorage.getItem("user") || "null" );
  const userId = storedUser?.id;

  async function handleHistory() {
    try {
      const response = await fetch(`http://localhost:3001/api/history/${userId}`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve history");
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    handleHistory();
  }, []);

  return (
    <>
      <div className="queueHistoryPage">
        <div className="historyCard">

          <div className="cardHeader">
            <h2>Queue History</h2>
            <p className="pageDescription">
              View your previous appointments
            </p>
          </div>

          <div className="historyContent">
            {history.map((appointment) => (
              <div className="historyEntry" key={appointment.id}>
                <h3>Service type: {appointment.service_id}</h3>
                
                <p>Entry ID Number: {appointment.entry_id}</p>

                <p>Status: {appointment.status}</p>

                <p>Joined queue at: {new Date(appointment.joined_at).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="historyFooter">End of appointment history</div>

        </div>
      </div>
    </>
  );
}

export default QueueHistory;