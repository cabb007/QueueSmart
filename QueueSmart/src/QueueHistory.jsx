import './QueueHistory.css';
import { useState,useEffect } from 'react';
import { NavLink } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";


function QueueHistory() {

    const [history, setHistory] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));

    async function handleHistory(){
        try{

            const response = await fetch(`http://localhost:3001/history?userId=${user.id}`
            );

            if(!response.ok){
                throw new Error("Failed to retrieve history");
            }

            const data = await response.json();

            setHistory(data);
        }catch(error){
            console.log(error);
        }
    }
    useEffect(() => {
        handleHistory();
    }, []);
    return (
        <>
            <div className="navbar">

                <h2 className="logo">QueueSmart</h2>

                <div className="navLinks">
                    <NavLink to="/joinqueue" className="navLink">
                        Join Queue
                    </NavLink>

                    <NavLink to="/queuehistory" className="navLink">
                         Queue History
                    </NavLink>
                </div>

                <button className="logoutButton">
                    Logout
                </button>

            </div>

            <div className="container">

                <div className="historyCard">

                    <div className="cardHeader">

                        <h2>Queue History</h2>

                        <p className="pageDescription">
                            View your previous appointments
                        </p>

                    </div>

                    <div className="historyContent">

                        {history.map((appointment, index) => (
                            <div className="historyEntry" key={index}>
                            <h3>{appointment.service}</h3>

                            <p><strong>Date:</strong>{" "}
                                {new Date(appointment.joined_at).toLocaleString()}
                            </p>

                        <p><strong>Status:</strong> {appointment.status}</p>
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