import './joinQueue.css';
import { useState } from 'react';
import { ToastContainer, toast } from "react-toastify";
import { NavLink, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

function JoinQueue(){ 

  const [name,setName] = useState("");
  const [service, setService] = useState("General Check-Up");
  const [position, setPosition] = useState(0);
  const [estTime, setEstTime] = useState(0);

  const [patientID, setPatID] = useState(null);
  const user = JSON.parse(localStorage.getItem("user")) //local storage is stored in the browser. returns string

  async function handleLeaveQueue(){
    try{
      const leaveResponse = await fetch("http://localhost:3001/leaveQueue",{
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: user.id
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
      const response = await fetch("http://localhost:3001/joinQueue", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: user.id,
          service
        })
      });

      const data = await response.json(); //recieving


      if (response.ok) { 
        toast.success(data.message);
        setEstTime(data.estTime);
        setPosition(data.position);
        setPatID(data.id);
      } else {
        toast.error(data.message);
        setName("");
        setService("General Check-Up");
      }

    } catch (error) {
      toast.error("Unable to connect to the server");
      console.log(error);
    }
  }

  return( 

    <>
      <div className="navbar">

        <h2 className="logo">
          QueueSmart
        </h2>

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
              Please select your desired service from the menue below.
            </p>

            <select className="textBox" value = {service} 
            onChange={(event) => setService(event.target.value)}>
              <option>General Check-Up</option>
              <option>Blood Draw / Lab Work</option>
              <option>Specialist Consultation</option>
              <option>Prescription Refill</option>
              <option>Urgent Care</option>
            </select>


            <label>Patient Name</label><input type="text"className="textBox"value={user.name}readOnly/>


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