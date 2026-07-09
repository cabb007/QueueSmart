import './QueueHistory.css';

function QueueHistory() {
    return (
        <>
            <div className="navbar">

                <h2 className="logo">QueueSmart</h2>

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

                        <div className="historyEntry">
                            <h3>Primary Care</h3>
                            <p>July 3, 2026</p>
                            <p>Wait Time: 18 minutes</p>
                        </div>

                        <div className="historyEntry">
                            <h3>Urgent Care</h3>
                            <p>June 15, 2026</p>
                            <p>Wait Time: 8 minutes</p>
                        </div>

                        <div className ="historyEntry">
                            <h3>Other</h3>
                            <p>March 28, 2026</p>
                            <p>Wait Time: 18 minutes</p>
                        </div>

                    </div>
                        <div className="historyFooter">End of appointment history</div>

                </div>

            </div>

        </>
    );
}

export default QueueHistory;