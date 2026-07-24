const express = require("express"); 
const cors = require("cors");

const app = express();
app.use(express.json()); 
app.use(cors());

const queue = [];

const history = [];

const validFields = [
    "Primary Care",
    "Pediatrics",
    "Urgent Care",
    "Lab Work",
    "Other"

]

let patientID = 0;

app.post("/QueueHistory", (req,res)=> {

})

app.post("/leaveQueue", (req,res)=> {
    if(queue.length ===0){
        return res.status(400).json({message: "There are no patients in the queue"});
    }
    let location = queue.findIndex(patient => patient.id === req.body.id);
    
    if(location === -1){
        return res.status(404).json({message: "ID could not be located in the Queue. Removal failed"})
    }


    history.push(queue[location]);
    queue.splice(location,1);
    res.json({message: "Successfully removed from queue"});

    console.log(queue)
});

app.post("/joinQueue", (req,res) =>{


    // Ensuring we have strings before calling string methods like trim() or length. unit test adjustment
    if(typeof req.body.name !== "string" || typeof req.body.service !== "string"){
        return res.status(400).json({message: "Not a valid name or service"});
    }

    if(!req.body.name || !req.body.service || req.body.name.trim() === ""){
        return res.status(400).json({message: "Missing or invalid inputs please try again"}); //res.status(400) means the client sent a bad request
    }

    if(req.body.name.length > 50){ //max character limit of 50
        return res.status(400).json({message: "Max character limit of 50"});
    }

    if(!validFields.includes(req.body.service)){ //checking for a valid service option
        return res.status(400).json({message: "Not a valid service"});
    }


    const patient = { //patient object
        id: patientID++,
        name: req.body.name,
        service: req.body.service,
        status: "waiting"
    }


    queue.push(patient); //switched over so instead of pushing req.body im pushing the patient part

    let position = queue.length;
    let estTime = 0;
    switch (patient.service) { //beta estimated time calculation
        case "Primary Care":
            estTime = position + 4;
            break;

        case "Pediatrics":
            estTime = position + 6;
            break;

        case "Urgent Care":
            estTime = position + 7;
            break;

        case "Lab Work":
            estTime = position + 10;
            break;

        case "Other":
            estTime = position + 8;
            break;
        }


    res.json({ //sending confirmation message and pos, estimated time and id
        message: "You have been added to the Queue!",
        position: position,
        estTime: estTime,
        id: patient.id
    });

    //console.log(queue)


});

app.get("/history", (req,res) => {
    res.json(history);
});

if(require.main === module){
    app.listen(3000,()=> { //start waiting for requests on port 3000
        console.log("Listening on port 3000");
    });
}




function resetData() { 
    queue.length = 0;
    history.length = 0;
    patientID = 0;
}

module.exports = {app, resetData};