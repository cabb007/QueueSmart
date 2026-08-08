const request = require("supertest");
const app = require("./server");
//test 1
test("GET /service returns all services", async () => {
    const response = await request(app).get("/service");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
});
//test 2
test("POST /service adds new service", async () => {

    const serviceName = "Vaccinations " + Date.now();

    const response = await request(app)
        .post("/service")
        .send({
            name: serviceName,
            description: "Shots for Influenza, Measles or Typhoid Fever",
            duration: 20,
            priority: "medium"
        });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe("Successfully created new service");
});
//test 3
test("DELETE /service removes an existing service", async () => {

    const serviceName = "Delete Test " + Date.now();

    // Add service
    await request(app)
        .post("/service")
        .send({
            name: serviceName,
            description: "Temporary service",
            duration: 20,
            priority: "low"
        });

    const getResponse = await request(app).get("/service");

    const service = getResponse.body.find(
        s => s.name === serviceName
    );

    expect(service).toBeDefined();

    const response = await request(app)
        .delete(`/service/${service.service_id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Service Deleted");
});
//test 4
test("POST /service rejects duplicate inputs", async () =>{
    const response = await request(app)
    .post("/service")
    .send({
        name: "General Check-Up",
        description: "Duplicate",
        duration: 10,
        priority: "low"
    });

expect(response.statusCode).toBe(400);
});
//test 5
test("POST /service rejects invalid name", async () => {
    const response = await request(app)
        .post("/service")
        .send({
            name: "",
            description: "Test",
            duration: 0,
            priority: "low"
        });

    expect(response.statusCode).toBe(400);
});
//test 6
test("POST /service rejects invalid duration", async () => {
    const response = await request(app)
        .post("/service")
        .send({
            name: "Test",
            description: "Test",
            duration: 0,
            priority: "low"
        });

    expect(response.statusCode).toBe(400);
});
//test 7
test("POST /service rejects invalid priority", async () =>{
    const response = await request(app)
        .post("/service")
        .send({
            name: "Test",
            description: "Test",
            duration: 10,
            priority: "Failure"

        });
    expect(response.statusCode).toBe(400);
});
//test 8
test("POST /service rejects empty description", async () => {

    const response = await request(app)
        .post("/service")
        .send({
            name: "Test",
            description: "",
            duration: 10,
            priority: "medium"
        });

    expect(response.statusCode).toBe(400);
});
//test 9
test("PUT /service rejects nonexistent service", async () => {
    const response = await request(app)
        .put("/service/fake-id")
        .send({
            name: "Test",
            description: "Test",
            duration: 10,
            priority: "low"
        });

    expect(response.statusCode).toBe(404);
});
//test 10
test("DELETE /service rejects nonexistent service", async () => {

    const response = await request(app)
        .delete("/service/not-a-real-id");

    expect(response.statusCode).toBe(404);
});
//test 11
test("PUT /service updates an existing service", async () => {

    const serviceName = "Update Test " + Date.now();

    await request(app)
        .post("/service")
        .send({
            name: serviceName,
            description: "Original",
            duration: 20,
            priority: "low"
        });

    const getResponse = await request(app).get("/service");

    const service = getResponse.body.find(
        s => s.name === serviceName
    );

    const response = await request(app)
        .put(`/service/${service.service_id}`)
        .send({
            name: "Updated Service",
            description: "Updated description",
            duration: 30,
            priority: "high"
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Updated information");

    const verify = await request(app).get("/service");

    const updated = verify.body.find(
        s => s.service_id === service.service_id
    );

    expect(updated.name).toBe("Updated Service");
    expect(updated.priority).toBe("high");

    await request(app)
        .delete(`/service/${service.service_id}`);
});


