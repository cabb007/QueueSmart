import './joinQueue.css';

function JoinQueue(){ 
  return( 

    <>
      <div className="navbar">

        <h2 className="logo">
          QueueSmart
        </h2>

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


          </div>

          <div className="card-content">

            <label>Select Service</label>

            <p className="subText">
              If your desired service is not listed, please select "Other".
            </p>

            <select className="textBox">
              <option>Primary Care</option>
              <option>Pediatrics</option>
              <option>Urgent Care</option>
              <option>Lab Work</option>
              <option>Other</option>
            </select>


            <label>Patient Name</label>

            <p className="subText">John Doe</p>


            <button className="joinButton">
              Join Queue
            </button>

            <label>Estimated Wait Time</label>

            <p className="miniText">
              *Wait times and queue positions may vary for different services
            </p>

            <div className = "greyBox">
              
              <p className = "boldText"> 5 minutes</p>
            
            </div>

            <label>Estimated Queue Position</label>



            <div className = "greyBox">
              <p className = "boldText"> 3rd position</p>
            
            </div>

            <button className="joinButton">
              Leave Queue
            </button>

          </div>

        </div>
      </div>

    </>
  );
}

export default JoinQueue;