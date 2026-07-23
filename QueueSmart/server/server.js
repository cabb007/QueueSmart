const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

//testing server is on
app.get("/", (req,res) => {
    res.send("Express server running");
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:5000');
});

