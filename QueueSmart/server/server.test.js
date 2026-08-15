const request = require("supertest");

jest.mock("./db", () => ({
  query: jest.fn(),
  getConnection: jest.fn().mockResolvedValue({
    release: jest.fn()
  })
}));

const db = require("./db");
const { app, resetData } = require("./server");


beforeEach(() => {
    jest.clearAllMocks();

    // This still resets the old in-memory test data
    // used by server.js.
    resetData();
});


// =========================================================
// HEALTH
// =========================================================

describe("GET /api/health", () => {

    test("returns ok status", async () => {

        const response = await request(app)
            .get("/api/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
    });

});


// =========================================================
// AUTH REGISTER
// =========================================================

describe("POST /api/auth/register", () => {

    test("registers a new user successfully", async () => {

        // SELECT duplicate email
        db.query.mockResolvedValueOnce([
            []
        ]);

        // INSERT usercredentials
        db.query.mockResolvedValueOnce([
            { affectedRows: 1 }
        ]);

        // INSERT userprofile
        db.query.mockResolvedValueOnce([
            { affectedRows: 1 }
        ]);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "testuser@clinic.com",
                password: "pass123",
                role: "patient"
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.message)
            .toMatch(/created/i);

        expect(response.body.userId)
            .toBeDefined();
    });


    test("rejects missing name", async () => {

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                password: "pass123",
                role: "patient"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects invalid email", async () => {

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "not-an-email",
                password: "pass123",
                role: "patient"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects password shorter than 6 characters", async () => {

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@test.com",
                password: "123",
                role: "patient"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects invalid role", async () => {

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@test.com",
                password: "pass123",
                role: "invalid-role"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects duplicate email", async () => {

        // Pretend database already has this email
        db.query.mockResolvedValueOnce([
            [
                {
                    user_id: "existing-user"
                }
            ]
        ]);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "testuser@clinic.com",
                password: "pass123",
                role: "patient"
            });

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toMatch(/already registered/i);
    });

});


// =========================================================
// AUTH LOGIN
// =========================================================

describe("POST /api/auth/login", () => {

    test("logs in with valid credentials", async () => {

        /*
         * Return no DB user.
         *
         * server.js then falls back to its in-memory
         * admin@clinic.com / admin123 account.
         */
        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "admin@clinic.com",
                password: "admin123"
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.token)
            .toBeTruthy();

        expect(response.body.user.role)
            .toBe("admin");
    });


    test("rejects wrong password", async () => {

        // No DB user -> test in-memory credentials
        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "admin@clinic.com",
                password: "wrong-password"
            });

        expect(response.statusCode).toBe(401);
    });


    test("rejects non-existent email", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "nobody@test.com",
                password: "pass123"
            });

        expect(response.statusCode).toBe(401);
    });


    test("rejects missing email", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                password: "pass123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects missing password", async () => {

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "admin@clinic.com"
            });

        expect(response.statusCode).toBe(400);
    });

});


// =========================================================
// AUTH LOGOUT
// =========================================================

describe("POST /api/auth/logout", () => {

    test("logs out a valid session", async () => {

        // Make login fall back to in-memory admin
        db.query.mockResolvedValueOnce([
            []
        ]);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "admin@clinic.com",
                password: "admin123"
            });

        expect(loginResponse.statusCode).toBe(200);

        const token = loginResponse.body.token;

        const response = await request(app)
            .post("/api/auth/logout")
            .set(
                "Authorization",
                `Bearer ${token}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toMatch(/logged out/i);
    });


    test("rejects invalid token", async () => {

        const response = await request(app)
            .post("/api/auth/logout")
            .set(
                "Authorization",
                "Bearer fake-token"
            );

        expect(response.statusCode).toBe(400);
    });

});


// =========================================================
// SERVICES
// =========================================================

describe("GET /api/services", () => {

    test("returns list of services", async () => {

        const response = await request(app)
            .get("/api/services");

        expect(response.statusCode).toBe(200);

        expect(Array.isArray(response.body.services))
            .toBe(true);
    });

});


describe("GET /api/services/:id", () => {

    test("returns a service by id", async () => {

        const response = await request(app)
            .get("/api/services/s1");

        expect(response.statusCode).toBe(200);

        expect(response.body.service.id)
            .toBe("s1");

        expect(response.body.service.name)
            .toBe("General Check-Up");
    });


    test("returns 404 for unknown id", async () => {

        const response = await request(app)
            .get("/api/services/fake-service");

        expect(response.statusCode).toBe(404);
    });

});


describe("POST /api/services", () => {

    test("creates a service with valid data", async () => {

        const response = await request(app)
            .post("/api/services")
            .send({
                name: "Test Service",
                desc: "Testing service",
                duration: 10,
                priority: "medium"
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.service.name)
            .toBe("Test Service");

        expect(response.body.service.status)
            .toBe("open");
    });


    test("rejects missing name", async () => {

        const response = await request(app)
            .post("/api/services")
            .send({
                desc: "Testing service",
                duration: 10,
                priority: "medium"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects name over 100 characters", async () => {

        const response = await request(app)
            .post("/api/services")
            .send({
                name: "a".repeat(101),
                desc: "Testing service",
                duration: 10,
                priority: "medium"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects invalid priority", async () => {

        const response = await request(app)
            .post("/api/services")
            .send({
                name: "Test Service",
                desc: "Testing",
                duration: 10,
                priority: "wrong"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects missing duration", async () => {

        const response = await request(app)
            .post("/api/services")
            .send({
                name: "Test Service",
                desc: "Testing",
                priority: "medium"
            });

        expect(response.statusCode).toBe(400);
    });

});


describe("PUT /api/services/:id", () => {

    test("updates an existing service", async () => {

        // Create a temporary service
        const createResponse = await request(app)
            .post("/api/services")
            .send({
                name: "Update Test",
                desc: "Testing update",
                duration: 10,
                priority: "medium"
            });

        const serviceId =
            createResponse.body.service.id;

        const response = await request(app)
            .put(`/api/services/${serviceId}`)
            .send({
                name: "Updated Service"
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.service.name)
            .toBe("Updated Service");
    });


    test("returns 404 for unknown id", async () => {

        const response = await request(app)
            .put("/api/services/fake-id")
            .send({
                name: "Updated"
            });

        expect(response.statusCode).toBe(404);
    });

});


describe("DELETE /api/services/:id", () => {

    test("deletes an existing service", async () => {

        const createResponse = await request(app)
            .post("/api/services")
            .send({
                name: "Delete Test",
                desc: "Testing delete",
                duration: 10,
                priority: "low"
            });

        const serviceId =
            createResponse.body.service.id;

        const response = await request(app)
            .delete(`/api/services/${serviceId}`);

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toMatch(/deleted/i);
    });


    test("returns 404 for unknown id", async () => {

        const response = await request(app)
            .delete("/api/services/fake-id");

        expect(response.statusCode).toBe(404);
    });

});


describe("PATCH /api/services/:id/toggle", () => {

    test("toggles service status", async () => {

        // Create a service so we don't modify s1-s5
        const createResponse = await request(app)
            .post("/api/services")
            .send({
                name: "Toggle Test",
                desc: "Testing toggle",
                duration: 10,
                priority: "medium"
            });

        const serviceId =
            createResponse.body.service.id;

        const response = await request(app)
            .patch(
                `/api/services/${serviceId}/toggle`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.service.status)
            .toBe("closed");
    });


    test("returns 404 for unknown id", async () => {

        const response = await request(app)
            .patch("/api/services/fake-id/toggle");

        expect(response.statusCode).toBe(404);
    });

});


// =========================================================
// GET QUEUE
// =========================================================

describe("GET /api/queue/:serviceId", () => {

    test("returns queue for a valid service", async () => {

        // SELECT queue_id
        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        // SELECT queueentry
        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1",
                    queue_id: "q1",
                    user_id: "user1",
                    position: 1,
                    status: "waiting"
                },
                {
                    entry_id: "entry2",
                    queue_id: "q1",
                    user_id: "user2",
                    position: 2,
                    status: "waiting"
                }
            ]
        ]);

        const response = await request(app)
            .get("/api/queue/s1");

        expect(response.statusCode).toBe(200);

        expect(response.body.serviceId)
            .toBe("s1");

        expect(response.body.serviceName)
            .toBe("General Check-Up");

        expect(response.body.queue.length)
            .toBe(2);
    });


    test("includes estimated wait time", async () => {

        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1",
                    queue_id: "q1",
                    user_id: "user1",
                    position: 2,
                    status: "waiting"
                }
            ]
        ]);

        const response = await request(app)
            .get("/api/queue/s1");

        expect(response.statusCode).toBe(200);

        expect(
            response.body.queue[0]
                .estimatedWaitMinutes
        ).toBeDefined();
    });


    test("returns 404 for unknown service", async () => {

        const response = await request(app)
            .get("/api/queue/fake-service");

        expect(response.statusCode).toBe(404);
    });


    test("returns 404 when service has no open queue", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .get("/api/queue/s1");

        expect(response.statusCode).toBe(404);

        expect(response.body.message)
            .toMatch(/queue not found/i);
    });

});


// =========================================================
// JOIN QUEUE
// =========================================================

describe("POST /api/queue/:serviceId/join", () => {

    test("joins a queue successfully", async () => {

        // 1. Find open queue
        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        // 2. User is NOT already waiting
        db.query.mockResolvedValueOnce([
            []
        ]);

        // 3. Find next position
        db.query.mockResolvedValueOnce([
            [
                {
                    nextPosition: 3
                }
            ]
        ]);

        // 4. INSERT queueentry
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        // 5. INSERT notification
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        const response = await request(app)
            .post("/api/queue/s1/join")
            .send({
                userId: "test-user-99",
                name: "Test Patient"
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.message)
            .toBe("Joined queue successfully.");

        expect(response.body.entry.name)
            .toBe("Test Patient");

        expect(response.body.entry.userId)
            .toBe("test-user-99");

        expect(response.body.entry.position)
            .toBe(3);

        expect(
            response.body.estimatedWaitMinutes
        ).toBeDefined();
    });


    test("rejects joining a closed service", async () => {

        // s4 is closed in server.js

        const response = await request(app)
            .post("/api/queue/s4/join")
            .send({
                userId: "user1",
                name: "Test Patient"
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message)
            .toMatch(/closed/i);
    });


    test("rejects duplicate join", async () => {

        // Find queue
        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        // Existing waiting entry
        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1"
                }
            ]
        ]);

        const response = await request(app)
            .post("/api/queue/s1/join")
            .send({
                userId: "duplicate-user",
                name: "Duplicate"
            });

        expect(response.statusCode).toBe(409);

        expect(response.body.message)
            .toMatch(/already/i);
    });


    test("rejects missing userId", async () => {

        const response = await request(app)
            .post("/api/queue/s1/join")
            .send({
                name: "Test Patient"
            });

        expect(response.statusCode).toBe(400);
    });


    test("rejects missing name", async () => {

        const response = await request(app)
            .post("/api/queue/s1/join")
            .send({
                userId: "user1"
            });

        expect(response.statusCode).toBe(400);
    });


    test("returns 404 for unknown service", async () => {

        const response = await request(app)
            .post("/api/queue/fake-service/join")
            .send({
                userId: "user1",
                name: "Test Patient"
            });

        expect(response.statusCode).toBe(404);
    });


    test("returns 404 when no open queue exists", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/queue/s1/join")
            .send({
                userId: "user1",
                name: "Test Patient"
            });

        expect(response.statusCode).toBe(404);
    });

});


// =========================================================
// LEAVE QUEUE
// =========================================================

describe("POST /api/queue/leave", () => {

    test("successfully removes a user from the queue", async () => {

        // 1. Find user's waiting entry
        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1",
                    queue_id: "q1",
                    position: 2,
                    service_id: "s1"
                }
            ]
        ]);

        // 2. Mark entry canceled
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        // 3. Move everyone behind forward
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 2
            }
        ]);

        // 4. Create leave notification
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        const response = await request(app)
            .post("/api/queue/leave")
            .send({
                userId: "leave-test-user"
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toMatch(/left/i);
    });


    test("returns 404 if user is not in queue", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/queue/leave")
            .send({
                userId: "not-in-queue"
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.message)
            .toMatch(/not in a queue/i);
    });


    test("rejects missing userId", async () => {

        const response = await request(app)
            .post("/api/queue/leave")
            .send({});

        expect(response.statusCode).toBe(400);
    });

});


// =========================================================
// SERVE NEXT
// =========================================================

describe("POST /api/queue/:serviceId/serve-next", () => {

    test("serves the next patient", async () => {

        // 1. Find open queue
        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        // 2. Find first waiting patient
        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1",
                    user_id: "user1",
                    position: 1,
                    joined_at:
                        new Date().toISOString()
                }
            ]
        ]);

        // 3. Mark patient served
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        // 4. Insert served notification
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 1
            }
        ]);

        // 5. Move remaining queue forward
        db.query.mockResolvedValueOnce([
            {
                affectedRows: 2
            }
        ]);

        // 6. Return remaining queue.
        // Empty here keeps this test focused on serving.
        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/queue/s1/serve-next");

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Next user served.");

        expect(response.body.served)
            .toBeDefined();

        expect(response.body.served.entry_id)
            .toBe("entry1");

        expect(response.body.served.user_id)
            .toBe("user1");
    });


    test("returns 400 when queue is empty", async () => {

        // Find queue
        db.query.mockResolvedValueOnce([
            [
                {
                    queue_id: "q1"
                }
            ]
        ]);

        // No waiting entries
        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/queue/s1/serve-next");

        expect(response.statusCode).toBe(400);

        expect(response.body.message)
            .toMatch(/empty/i);
    });


    test("returns 404 when queue does not exist", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .post("/api/queue/s1/serve-next");

        expect(response.statusCode).toBe(404);

        expect(response.body.message)
            .toMatch(/queue not found/i);
    });


    test("returns 404 for unknown service", async () => {

        const response = await request(app)
            .post(
                "/api/queue/fake-service/serve-next"
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.message)
            .toMatch(/service not found/i);
    });

});


// =========================================================
// HISTORY
// =========================================================

describe("GET /api/history/:userId", () => {

    test("returns user queue history", async () => {

        db.query.mockResolvedValueOnce([
            [
                {
                    entry_id: "entry1",
                    queue_id: "q1",
                    user_id: "user1",
                    position: 1,
                    joined_at:
                        "2026-08-07 10:00:00",
                    status: "served",
                    service_id: "s1"
                },
                {
                    entry_id: "entry2",
                    queue_id: "q1",
                    user_id: "user1",
                    position: 2,
                    joined_at:
                        "2026-08-07 09:00:00",
                    status: "canceled",
                    service_id: "s1"
                }
            ]
        ]);

        const response = await request(app)
            .get("/api/history/user1");

        expect(response.statusCode).toBe(200);

        expect(
            Array.isArray(response.body.history)
        ).toBe(true);

        expect(response.body.history)
            .toHaveLength(2);

        expect(response.body.history[0].status)
            .toBe("served");

        expect(response.body.history[1].status)
            .toBe("canceled");
    });


    test("returns empty history when user has none", async () => {

        db.query.mockResolvedValueOnce([
            []
        ]);

        const response = await request(app)
            .get("/api/history/user-with-no-history");

        expect(response.statusCode).toBe(200);

        expect(response.body.history)
            .toEqual([]);
    });

});


// =========================================================
// NOTIFICATIONS
// =========================================================

describe("GET /api/notifications/:userId", () => {

    test("returns user notifications", async () => {

        db.query.mockResolvedValueOnce([
            [
                {
                    notification_id: "notification1",
                    user_id: "user1",
                    message: "Test notification",
                    created_at:
                        "2026-08-07 10:00:00",
                    status: "sent"
                }
            ]
        ]);

        const response = await request(app)
            .get("/api/notifications/user1");

        expect(response.statusCode).toBe(200);

        expect(response.body.notifications)
            .toHaveLength(1);

        expect(
            response.body.notifications[0].status
        ).toBe("sent");
    });

});


describe(
    "PATCH /api/notifications/:notificationId/view",
    () => {

        test("marks a notification viewed", async () => {

            db.query.mockResolvedValueOnce([
                {
                    affectedRows: 1
                }
            ]);

            const response = await request(app)
                .patch(
                    "/api/notifications/notification1/view"
                );

            expect(response.statusCode).toBe(200);

            expect(response.body.message)
                .toMatch(/viewed/i);
        });


        test("returns 404 when notification is already viewed", async () => {

            db.query.mockResolvedValueOnce([
                {
                    affectedRows: 0
                }
            ]);

            const response = await request(app)
                .patch(
                    "/api/notifications/notification1/view"
                );

            expect(response.statusCode).toBe(404);
        });

    }
);


describe(
    "PATCH /api/notifications/:userId/viewed",
    () => {

        test("marks all sent notifications viewed", async () => {

            db.query.mockResolvedValueOnce([
                {
                    affectedRows: 2
                }
            ]);

            const response = await request(app)
                .patch(
                    "/api/notifications/user1/viewed"
                );

            expect(response.statusCode).toBe(200);

            expect(response.body.message)
                .toMatch(/viewed/i);
        });

    }
);

