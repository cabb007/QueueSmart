const request = require("supertest");
const { app, resetData } = require("./server");

beforeEach(() => {
    resetData();
});

//test 1
test("GET /history returns status 200", async () => { //test whether /history returns 200 proper
    const response = await request(app).get("/history");

    expect(response.statusCode).toBe(200); //response is expected to be 200
});


//test 2
test("POST /joinQueue adds a valid patient", async () => { //testing for valid patint addition and code 200
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: "Liam",
            service: "Primary Care"
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("You have been added to the Queue!");
});


//test 3
test("POST /joinQueue rejects empty name", async () => {
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: "",
            service: "Primary Care"
        });

    expect(response.statusCode).toBe(400);
});


//test 4
test("POST /joinQueue rejects non-string name and service input", async () => {
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: 1,
            service: 1
        });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Not a valid name or service");
});



//test 5
test("POST /joinQueue rejects names with a longer length than 50 chars", async () => {
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", //i have no clue the amount of a's here
            service: "Urgent Care"
        });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Max character limit of 50");
});


//test 6
test("POST /joinQueue rejects a non valid service input", async () => {
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: "Liam Brooks",
            service: "false service"
        });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Not a valid service");
});


//test 7
test("POST /joinQueue rejects a whitespace-only name", async () => { //trim test
    const response = await request(app)
        .post("/joinQueue")
        .send({
            name: "     ",
            service: "Primary Care"
        });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Missing or invalid inputs please try again");
});


//test 8
test("POST /leaveQueue rejects if the queue is empty", async () => {
    const response = await request(app)
        .post("/leaveQueue")
        .send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("There are no patients in the queue")
});


//test 9
test("POST /leaveQueue rejects any invalid location length identifying a nonexistant ID", async () => {

    //adding a valid patient first
    await request(app)
        .post("/joinQueue")
        .send({
            name: "Liam Brooks",
            service: "Other"
        });

    //trying to remove a ID that doesnt exist
    const response = await request(app)
        .post("/leaveQueue")
        .send({
            id: 1000
        });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("ID could not be located in the Queue. Removal failed");
});


//test 10
test("POST /leaveQueue successfully removes a user from the queue", async () => {


    const joinResponse = await request(app) //add someone to the queue
        .post("/joinQueue")
        .send({
            name: "Liam Brooks",
            service: "Other"
        });


    const response = await request(app) //remove
        .post("/leaveQueue")
        .send({
            id: joinResponse.body.id
        });


    expect(response.statusCode).toBe(200); //sucessfully added
    expect(response.body.message).toBe("Successfully removed from queue");

    const historyResponse = await request(app)
        .get("/history");

    expect(historyResponse.body.length).toBe(1);
    expect(historyResponse.body[0].name).toBe("Liam Brooks");
    expect(historyResponse.body[0].service).toBe("Other");
});



