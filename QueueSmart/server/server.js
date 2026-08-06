const express = require("express"); 
const cors = require("cors");

const app = express();
const db = require("./db"); //when db.js exports, it exports pool here
app.use(express.json()); 
app.use(cors());


app.post("/leaveQueue", async (req,res)=> {
    //check to make sure that the tuple we want to 'leave' the queue is in the queue
    const [rows] = await db.query(
        "SELECT entry_id, queue_id, position FROM queueentry WHERE user_id = ? AND status = 'waiting'",
        [req.body.userId]
    );
    if(rows.length === 0 ){
        return res.status(404).json({
            message: "You are not in a queue so cant leave"
        });
    }
    const entryId = rows[0].entry_id;
    const queueId = rows[0].queue_id;
    const position = rows[0].position;
    //now we update the status to 'canceled' to signify leaving the queue
    await db.query(
        "UPDATE queueentry SET status = 'canceled' WHERE entry_id = ?",
        [entryId]
    );

    //now update positions. everyone whos position was greater than the 'removed node' is -1
    await db.query(
        "UPDATE queueentry SET position = position -1 WHERE queue_id = ? AND position > ? AND status = 'waiting'",
        [queueId, position]
    );

    res.json({message: "Successfully removed from queue"});
});

app.post("/joinQueue", async (req,res) =>{

    //-------------VALIDATIONS------------//
    const [existingQueue] = await db.query(
        "SELECT entry_id FROM queueentry WHERE user_id = ? AND status = 'waiting'",
        [req.body.userId]
    );
    if(existingQueue.length > 0){
        return res.status(400).json({
            message: "Already in queue. Cannot join the queue twice"
        });
    }
    // changing check for only service
    if(typeof req.body.service !== "string"){
        return res.status(400).json({message: "Not a valid service"});
    }

    if(!req.body.service || req.body.service.trim() === ""){
        return res.status(400).json({message: "Empty service"});
    }

    const [userCheck] = await db.query(
        "SELECT user_id FROM userprofile WHERE user_id = ?",
        [req.body.userId]
    )
    if(userCheck.length === 0 ){
        return res.status(404).json({message: "userID not found"});
    }


    //------------THIS AREA TO CHANGE FOR DATABSE UPDATE-----------------//
    const [rows] = await db.query(
        "SELECT service_id FROM service WHERE name = ?",
        [req.body.service]
    )
    if(rows.length ===0){
        return res.status(404).json({
            message: "Service not found when trying to query for the service_id"
        });
    }
    const serviceId = rows[0].service_id;

    const [queueRows] = await db.query(
        "SELECT queue_id FROM queue WHERE service_id = ?",
        [serviceId]
    )
    if(queueRows.length === 0){
        return res.status(404).json({
            message: "Service not found when trying to find the queue_id"
        });
    }
    const queueId = queueRows[0].queue_id;

    const [countRows] = await db.query(
        "SELECT COUNT(*) AS count FROM queueentry WHERE queue_id = ? AND status = 'waiting'",
        [queueId]
    )
    const position = countRows[0].count + 1;

    await db.query(
        `INSERT INTO queueentry (entry_id, queue_id, user_id, position, joined_at, status)
        VALUES (?,?,?,?,?,?)`,
        [
            uuidv4(),
            queueId,
            req.body.userId,
            position,
            new Date(),
            "waiting"
        ]
    );
    //add said database to 
    //------------------------------------------------------------------//


    let estTime = 0;
    switch (req.body.service) { //beta estimated time calculation, update to current calculation
        case "General Check-Up":
            estTime = position + 4;
            break;

        case "Blood Draw / Lab Work":
            estTime = position + 6;
            break;

        case "Specialist Consultation":
            estTime = position + 7;
            break;

        case "Prescription Refill":
            estTime = position + 10;
            break;

        case "Urgent Care":
            estTime = position + 8;
            break;
        }


    res.json({ //this will stay the same
        message: "You have been added to the Queue!",
        position: position,
        estTime: estTime,
        id: req.body.userId
    });


});

app.get("/history", async (req,res) => {
    const [userInfo] = await db.query(
        `SELECT s.name AS service,
            qe.joined_at,
            qe.status
        FROM queueentry qe
        JOIN queue q
            ON qe.queue_id = q.queue_id
        JOIN service s
            ON q.service_id = s.service_id
        WHERE qe.user_id = ?
        AND qe.status IN('served','canceled')`,
        [req.query.userId]
    );

    if(userInfo.length ===0){
        return res.status(200).json([]);
    }
    res.json(userInfo);
});


if(require.main === module){
    app.listen(3001,()=> { //start waiting for requests on port 3000
        console.log("Listening on port 3001");
    });
}




function resetData() { 
    queue.length = 0;
    history.length = 0;
    patientID = 0;
}

module.exports = {app, resetData};