import './joinQueue.css';
import { useState } from 'react';
import { ToastContainer, toast } from "react-toastify";
import { NavLink, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

function JoinQueue(){ 

  const [name,setName] = useState("");
  const [service, setService] = useState("Primary Care");
  const [position, setPosition] = useState(0);
  const [estTime, setEstTime] = useState(0);

  const [patientID, setPatID] = useState(null);

  async function handleLeaveQueue(){
    try{
      const leaveResponse = await fetch("http://localhost:3000/leaveQueue",{
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id:patientID
          })
      });

      const leaveData = await leaveResponse.json();

      if(leaveResponse.ok){
        toast.success(leaveData.message);
        setPosition(0);
        setEstTime(0);
        setPatID(null);
      }else{
        toast.error(leaveData.message);
      }


    }catch(error){
        toast.error("Unable to connect to the server");
        console.log(error);
    }
  }

  async function handleJoinQueue() {
    try {
      const response = await fetch("http://localhost:3000/joinQueue", { //sending to the express server
        method: "POST", //sending new data
        headers: {
          "Content-Type": "application/json" //the data is sending json
        },
        body: JSON.stringify({ //the json body that gets sent
          name: name,
          service: service,
        })
      });

      const data = await response.json(); //recieving the "added to queue message". only works for plain text not for json


      if (response.ok) { //if response is ok, show message, update esttime and position
        toast.success(data.message);
        setEstTime(data.estTime);
        setPosition(data.position);
        setPatID(data.id);
      } else {
        toast.error(data.message); //otehrwise toast message
        setName("");
        setService("Primary Care");
      }

    } catch (error) {
      toast.error("Unable to connect to the server");
      console.log(error);
    }
  }

  return( 

    <>
      <div className="container">
        <div className="joinCard">

          <div className="cardHeader">

            <h2>Join Queue</h2>


            <p className="pageDescription">
              Check in for your clinic visit and view estimated wait times.
            </p>
            <p className = "pageDescription">Fields with this symbol are required *</p>


          </div>

          <div className="card-content">

            <label>Select Service *</label>

            <p className="subText">
              If your desired service is not listed, please select "Other" from the menu below.
            </p>

            <select className="textBox" value = {service} 
            onChange={(event) => setService(event.target.value)}>
              <option>Primary Care</option>
              <option>Pediatrics</option>
              <option>Urgent Care</option>
              <option>Lab Work</option>
              <option>Other</option>
            </select>


            <label>Patient Name</label>

            <input type="text"className="textBox"placeholder="John Doe"
            value={name} 
            onChange={(event) => setName(event.target.value)}/>


            <button className="joinButton" onClick={handleJoinQueue}>
              Join Queue
            </button>

            <label>Estimated Wait Time</label>

            <p className="miniText">
              *Wait times and queue positions may vary for different services
            </p>

            <div className = "greyBox">
              
              <p className = "boldText"> {estTime} minutes</p>
            
            </div>

            <label>Estimated Queue Position</label>



            <div className = "greyBox">
              <p className = "boldText"> {position}</p>
            
            </div>

            <button className="joinButton"
              onClick={handleLeaveQueue}
              disabled={patientID === null}>
              Leave Queue
            </button>

          </div>

        </div>
      </div>

      <ToastContainer />

    </>
  );
}

export default JoinQueue;