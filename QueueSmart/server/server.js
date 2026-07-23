const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors({
    origin: "http://localhost:5173",
}));

app.use(express.json());


//temp data
const queueStatus = {
    queuePosition: 2,
    estimatedWaitTime: "18 minutes",
    status: "waiting",
};

//testing server is on
app.get("/", (req,res) => {
    res.send("Express server running");
});

app.get("/queuestatus", (req,res) => {
    res.status(200).json(queueStatus);
})

app.listen(PORT, () => {
    console.log('Server running at http://localhost:5000');
});

