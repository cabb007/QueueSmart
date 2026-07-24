import './QueueHistory.css';
import { useState,useEffect } from 'react';
import { NavLink } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";


function QueueHistory() {

    const [history, setHistory] = useState([]);

    async function handleHistory(){
        try{
            const response = await fetch("http://localhost:3000/history",{
                method: "GET"
            });

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

            <div className="container">

                <div className="historyCard">

                    <div className="cardHeader">

                        <h2>Queue History</h2>

                        <p className="pageDescription">
                            View your previous appointments
                        </p>

                    </div>

                    <div className="historyContent">

                        {history.map((appointment)=> (
                            <div className="historyEntry" key={appointment.id}>
                                <h3>{appointment.service}</h3>
                                <p>{appointment.name}</p>
                                <p>ID Number: {appointment.id}</p>
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