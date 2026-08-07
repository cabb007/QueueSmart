const request = require('supertest')
const app     = require('../server')

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/register', () => {
  test('registers a new user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'testuser@clinic.com', password: 'pass123', role: 'patient'
    })
    expect(res.status).toBe(201)
    expect(res.body.message).toMatch(/created/i)
  })

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@clinic.com', password: 'pass123', role: 'patient'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'name')).toBe(true)
  })

  test('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'not-an-email', password: 'pass123', role: 'patient'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'email')).toBe(true)
  })

  test('rejects password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'test2@clinic.com', password: '123', role: 'patient'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'password')).toBe(true)
  })

  test('rejects invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'test3@clinic.com', password: 'pass123', role: 'superuser'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'role')).toBe(true)
  })

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate', email: 'admin@clinic.com', password: 'pass123', role: 'admin'
    })
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/already registered/i)
  })
})

describe('POST /api/auth/login', () => {
  test('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@clinic.com', password: 'admin123'
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.role).toBe('admin')
  })

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@clinic.com', password: 'wrongpass'
    })
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/invalid/i)
  })

  test('rejects non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@clinic.com', password: 'pass123'
    })
    expect(res.status).toBe(401)
  })

  test('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'pass123'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'email')).toBe(true)
  })

  test('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@clinic.com'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'password')).toBe(true)
  })
})

describe('POST /api/auth/logout', () => {
  test('logs out a valid session', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@clinic.com', password: 'admin123'
    })
    const token = login.body.token

    const res = await request(app).post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/logged out/i)
  })

  test('rejects invalid token', async () => {
    const res = await request(app).post('/api/auth/logout')
      .set('Authorization', 'Bearer fake-token-xyz')
    expect(res.status).toBe(400)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/services', () => {
  test('returns list of services', async () => {
    const res = await request(app).get('/api/services')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.services)).toBe(true)
    expect(res.body.services.length).toBeGreaterThan(0)
  })
})

describe('GET /api/services/:id', () => {
  test('returns a service by id', async () => {
    const res = await request(app).get('/api/services/s1')
    expect(res.status).toBe(200)
    expect(res.body.service.name).toBe('General Check-Up')
  })

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/services/unknown')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/services', () => {
  test('creates a service with valid data', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'New Test Service', desc: 'A test service.', duration: 20, priority: 'low'
    })
    expect(res.status).toBe(201)
    expect(res.body.service.name).toBe('New Test Service')
  })

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/services').send({
      desc: 'No name.', duration: 10, priority: 'low'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'name')).toBe(true)
  })

  test('rejects name over 100 characters', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'A'.repeat(101), desc: 'desc', duration: 10, priority: 'low'
    })
    expect(res.status).toBe(400)
  })

  test('rejects invalid priority', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'Test', desc: 'desc', duration: 10, priority: 'urgent'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'priority')).toBe(true)
  })

  test('rejects missing duration', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'Test', desc: 'desc', priority: 'low'
    })
    expect(res.status).toBe(400)
    expect(res.body.errors.some(e => e.field === 'duration')).toBe(true)
  })
})

describe('PUT /api/services/:id', () => {
  test('updates an existing service', async () => {
    const res = await request(app).put('/api/services/s1').send({
      name: 'Updated Check-Up', duration: 20
    })
    expect(res.status).toBe(200)
    expect(res.body.service.name).toBe('Updated Check-Up')
  })

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/services/unknown').send({ name: 'Test' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/services/:id', () => {
  test('deletes an existing service', async () => {
    // First create one to delete
    const create = await request(app).post('/api/services').send({
      name: 'To Delete', desc: 'Will be deleted.', duration: 5, priority: 'low'
    })
    const id = create.body.service.id

    const res = await request(app).delete(`/api/services/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/deleted/i)
  })

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/services/unknown')
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/services/:id/toggle', () => {
  test('toggles service status', async () => {
    const before = await request(app).get('/api/services/s2')
    const originalStatus = before.body.service.status

    const res = await request(app).patch('/api/services/s2/toggle')
    expect(res.status).toBe(200)
    expect(res.body.service.status).not.toBe(originalStatus)
  })

  test('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/api/services/unknown/toggle')
    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// QUEUE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/queue/:serviceId', () => {
  test('returns queue for a valid service', async () => {
    const res = await request(app).get('/api/queue/s1')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.queue)).toBe(true)
  })

  test('includes estimated wait time', async () => {
    const res = await request(app).get('/api/queue/s1')
    expect(res.status).toBe(200)
    if (res.body.queue.length > 0) {
      expect(res.body.queue[0].estimatedWaitMinutes).toBeDefined()
    }
  })

  test('returns 404 for unknown service', async () => {
    const res = await request(app).get('/api/queue/unknown')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/queue/:serviceId/join', () => {
  test('joins a queue successfully', async () => {
    const res = await request(app).post('/api/queue/s1/join').send({
      userId: 'test-user-99', name: 'Test Patient'
    })
    expect(res.status).toBe(201)
    expect(res.body.entry.name).toBe('Test Patient')
    expect(res.body.estimatedWaitMinutes).toBeDefined()
  })

  test('rejects joining a closed service', async () => {
    const res = await request(app).post('/api/queue/s4/join').send({
      userId: 'test-user-99', name: 'Test Patient'
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/closed/i)
  })

test('rejects duplicate join', async () => {
  await request(app).post('/api/queue/s1/join').send({
    userId: 'duplicate-user-unique', name: 'Duplicate'
  })
  const res = await request(app).post('/api/queue/s1/join').send({
    userId: 'duplicate-user-unique', name: 'Duplicate'
  })
  expect(res.status).toBe(409)
  expect(res.body.message).toMatch(/already/i)
})

  test('rejects missing userId', async () => {
    const res = await request(app).post('/api/queue/s1/join').send({
      name: 'No ID'
    })
    expect(res.status).toBe(400)
  })

  test('returns 404 for unknown service', async () => {
    const res = await request(app).post('/api/queue/unknown/join').send({
      userId: 'u99', name: 'Test'
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/queue/:serviceId/serve-next', () => {
  test('serves the next patient', async () => {
    // Join first so queue is not empty
    await request(app).post('/api/queue/s3/join').send({
      userId: 'serve-test-user', name: 'Serve Test'
    })
    const res = await request(app).post('/api/queue/s3/serve-next')
    expect(res.status).toBe(200)
    expect(res.body.served).toBeDefined()
    expect(res.body.served.name).toBe('Serve Test')
  })

  test('returns 404 for unknown service', async () => {
    const res = await request(app).post('/api/queue/unknown/serve-next')
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/queue/:serviceId/leave', () => {
  test('removes a user from the queue', async () => {
    await request(app).post('/api/queue/s5/join').send({
      userId: 'leave-test-user', name: 'Leave Test'
    })
    const res = await request(app).delete('/api/queue/s5/leave').send({
      userId: 'leave-test-user'
    })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/left/i)
  })

  test('returns 404 if user not in queue', async () => {
    const res = await request(app).delete('/api/queue/s1/leave').send({
      userId: 'not-in-queue-user'
    })
    expect(res.status).toBe(404)
  })

  test('rejects missing userId', async () => {
    const res = await request(app).delete('/api/queue/s1/leave').send({})
    expect(res.status).toBe(400)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  test('returns ok status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})