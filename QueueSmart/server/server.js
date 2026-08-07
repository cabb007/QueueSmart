require('dotenv').config()
const db = require('./db')
const express = require('express')
const cors    = require('cors')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
//const mysql  = require('mysql2/promise')
const { calculateWaitTime, assessSeverity } = require('./waitTimeCalculator')

const app  = express()
// ── Database connection ───────────────────────────────────────────────────────
/*db = mysql.createPool({
  host:               'clinic-queuesmart-db.mysql.database.azure.com',
  user:               'qsadmin',
  password:           'btwkgKWeyRE7pZm',
  database:           'queuesmart',
  ssl:                { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit:    10,
})*/

db.getConnection()
  .then(conn => { console.log('Connected to Azure MySQL'); conn.release() })
  .catch(err  => console.error('DB connection failed:', err.message))

const PORT = 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── In-Memory Store ───────────────────────────────────────────────────────────
const users = []
users.push({ id: uuidv4(), name: 'Admin User',  email: 'admin@clinic.com',  password: 'admin123',   role: 'admin'   })
users.push({ id: uuidv4(), name: 'Sarah Jones', email: 'sarah@clinic.com',  password: 'patient123', role: 'patient' })
users.push({ id: uuidv4(), name: 'James Okonkwo', email: 'jamesok@clinic.com',  password: 'patient1234', role: 'patient' })
users.push({ id: uuidv4(), name: 'Linda Pham', email: 'linpham@clinic.com',  password: 'patient12345', role: 'patient' })

//for temp dynamic user info for queue calculation
const sarahUser = users.find(
  user => user.email === 'sarah@clinic.com'
);
const jamesUser = users.find(
  user => user.email === 'jamesok@clinic.com'
);
const lindaUser = users.find(
  user => user.email === 'linpham@clinic.com'
);

const sessions = {}

const services = [
  { id: 's1', name: 'General Check-Up',        desc: 'Routine health assessment.',                duration: 15, priority: 'medium', status: 'open'   },
  { id: 's2', name: 'Blood Draw / Lab Work',   desc: 'Blood sample collection.',                  duration: 10, priority: 'low',    status: 'open'   },
  { id: 's3', name: 'Specialist Consultation', desc: 'Appointment with a specialist.',            duration: 30, priority: 'high',   status: 'open'   },
  { id: 's4', name: 'Prescription Refill',     desc: 'Routine medication renewal.',               duration: 8,  priority: 'low',    status: 'closed' },
  { id: 's5', name: 'Urgent Care',             desc: 'Immediate attention for acute conditions.', duration: 20, priority: 'high',   status: 'open'   },
]

let queue = [
  { id: 'q1', 
    serviceId: 's1', 
    userId: sarahUser.id, 
    name: sarahUser.name,  
    joinedAt: new Date().toISOString(), 
    position: 3, 
    status: 'waiting',
    vitals : {
      bodyTemp: 98.6,
      painLevel: 2,
      sysBP: 120,
      diaBP: 80,
    },
    closeNotificationSent: false },
  { id: 'q2', 
    serviceId: 's1', 
    userId: jamesUser.id, 
    name: jamesUser.name,
    joinedAt: new Date().toISOString(),
    position: 2, 
    status: 'waiting',
    vitals : {
      bodyTemp: 98.6,
      painLevel: 2,
      sysBP: 120,
      diaBP: 80,
    },
    closeNotificationSent: false },
  { id: 'q3', 
    serviceId: 's1', 
    userId: lindaUser.id, 
    name: lindaUser.name,   
    joinedAt: new Date().toISOString(), 
    position: 1, 
    status: 'waiting',
    vitals : {
      bodyTemp: 98.6,
      painLevel: 2,
      sysBP: 120,
      diaBP: 80,
    },
    closeNotificationSent: false },
]

const history = [];

const validFields = [
    "Primary Care",
    "Pediatrics",
    "Urgent Care",
    "Lab Work",
    "Other"

]

let patientID = 0;
const notifications = []

const queueStatus = {
    queuePosition: 2,
    estimatedWaitTime: "18 minutes",
    status: "waiting",
};

// ── Validation Helper ─────────────────────────────────────────────────────────
function validateFields(rules, body) {
  const errors = []
  for (const [field, rule] of Object.entries(rules)) {
    const val = body[field]
    const str = val !== undefined && val !== null ? String(val).trim() : ''

    // Required check
    if (rule.required && !str) {
      errors.push({ field, message: `${field} is required.` }); continue
    }
    if (!str) continue

    // Type checks
    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
      errors.push({ field, message: `${field} must be a valid email address.` })

    if (rule.type === 'number' && (isNaN(Number(str)) || Number(str) < 1))
      errors.push({ field, message: `${field} must be a positive number.` })

    if (rule.type === 'string' && typeof val !== 'string')
      errors.push({ field, message: `${field} must be a string.` })

    // Length checks
    if (rule.minLength && str.length < rule.minLength)
      errors.push({ field, message: `${field} must be at least ${rule.minLength} characters.` })

    if (rule.maxLength && str.length > rule.maxLength)
      errors.push({ field, message: `${field} must be at most ${rule.maxLength} characters.` })

    // Enum check
    if (rule.enum && !rule.enum.includes(val))
      errors.push({ field, message: `${field} must be one of: ${rule.enum.join(', ')}.` })
  }
  return errors
}

// Notications Handling-----------------------------------------------------------
async function createNotification(userId,serviceId,type,message,waitTimeData = null){
  const notification = {
    notificationId: uuidv4(),
    userId,
    serviceId,
    type,
    message,
    createdAt: new Date().toISOString(),
    ...(waitTimeData && {
      estimatedWaitMinutes: waitTimeData.estimatedWaitMinutes,
      severityCategory: waitTimeData.severityCategory,
    }),
  }

  const sql = `
    INSERT INTO notification
    (notification_id, user_id, message, created_at, status)
    VALUES (?, ?, ?, NOW(), ?)
  `;

  await db.query(sql, [
    notification.notificationId,
    notification.userId,
    notification.message,
    "sent"
  ])

  console.log(
    `[Notification] User ${userId} | ${type}: ${message}`
  )

  return notification
}

async function checkCloseToFront(entry,service) {
 
  const waitTimeData = calculateWaitTime(
    entry.position,
    service.duration,
    entry.vitals || {}
  )

  const isClose = entry.position <=2 || waitTimeData.estimatedWaitMinutes <= 15

  if(isClose && !entry.closeNotificationSent) {
    entry.closeNotificationSent = true

    const message = 
      waitTimeData.estimatedWaitMinutes === 0
        ? `You are next for ${service.name}. Please be ready.`
        : `You are close to being served for ${service.name}. Your estimated wait is ${waitTimeData.estimatedWaitMinutes} minutes.`

    return createNotification(
    entry.userId,
    entry.serviceId,
    'almost_ready',
    message,
    waitTimeData
    )
  }

  return null
}

//create a notification based on queue updates
async function updateQueueEntryStatus(entry, service) {
  const waitTimeData = calculateWaitTime(
    entry.position,
    service.duration,
    entry.vitals || {}
  )

  const previousStatus = entry.status

  let newStatus = 'waiting'

  if (
    entry.position <= 2 ||
    waitTimeData.estimatedWaitMinutes <= 15
  ) {
    newStatus = 'almost_ready'
  }

  entry.status = newStatus

  let notification = null

  // Only create a notification when the status actually changes.
  if (
    previousStatus === 'waiting' &&
    newStatus === 'almost_ready'
  ) {
    notification = createNotification(
      entry.userId,
      entry.serviceId,
      'almost_ready',
      `You are almost ready for ${service.name}. ` +
        `Your current position is ${entry.position}, and your ` +
        `estimated wait is ${waitTimeData.estimatedWaitMinutes} minutes.`,
      waitTimeData
    )
  }

  return {
    notification,
    waitTimeData,
  }
}

async function notificationViewed(notificationId) {
  const [result] = await db.query( 
    `UPDATE notification SET status = 'viewed' WHERE notification_id = ? AND status = 'sent'`, [notificationId]);
  return result.affectedRows > 0;
}

//notification routing ----------------------------------------------------------

//notification retrieval
app.get('/api/notifications/:userId', async (req,res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC`,
      [req.params.userId]
    );

    res.status(200).json({
      notifications: rows
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "DB error"
    });

  }
})

//notification sent -> viewed check routes
app.patch("/api/notifications/:notificationId/view", async(req,res) =>{
  try {
    const success = await notificationViewed(req.params.notificationId);

    if (!success) {
      return res.status(404).json({
        message: "Notification not found or already viewed"
      });
    }

    res.status(200).json({
      message: "Notification viewed"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "DB error"
    });
  }
});

app.patch('/api/notifications/:userId/viewed', async (req, res) => {
  try {
    await db.query(
      `UPDATE notification
       SET status = 'viewed'
       WHERE user_id = ?
       AND status = 'sent'`,
      [req.params.userId]
    );

    res.status(200).json({
      message: 'Notifications viewed'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'DB error'
    });
  }
});




// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const errors = validateFields({
    name:     { required: true, minLength: 2, maxLength: 100 },
    email:    { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    role:     { required: true, enum: ['patient', 'nurse', 'admin'] },
  }, req.body)

  if (errors.length) return res.status(400).json({ errors })

  try {
    const email = req.body.email.trim().toLowerCase()

    // Check duplicate in DB
    const [existing] = await db.query(
      'SELECT user_id FROM usercredentials WHERE email = ?', [email]
    )
    if (existing.length)
      return res.status(409).json({ message: 'Email already registered.' })

    // Hash password with bcrypt
    const password_hash = await bcrypt.hash(req.body.password, 10)
    const userId        = uuidv4()
    const profileId     = uuidv4()

    // Store in DB
    await db.query(
      'INSERT INTO usercredentials (user_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, email, password_hash, req.body.role]
    )
    await db.query(
      'INSERT INTO userprofile (profile_id, user_id, full_name, email) VALUES (?, ?, ?, ?)',
      [profileId, userId, req.body.name.trim(), email]
    )

    // Also keep in memory for other routes that depend on users array
    users.push({
      id:       userId,
      name:     req.body.name.trim(),
      email,
      password: req.body.password,
      role:     req.body.role,
    })

    return res.status(201).json({ message: 'Account created successfully.', userId })

  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ message: 'Server error during registration.' })
  }
})

// POST /api/auth/login
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const errors = validateFields({
    email:    { required: true, type: 'email' },
    password: { required: true },
  }, req.body)

  if (errors.length) return res.status(400).json({ errors })

  try {
    const email = req.body.email.trim().toLowerCase()

    // Try DB first
    const [rows] = await db.query(
      `SELECT uc.user_id, uc.email, uc.password_hash, uc.role, up.full_name
       FROM usercredentials uc
       LEFT JOIN userprofile up ON uc.user_id = up.user_id
       WHERE uc.email = ?`,
      [email]
    )

    if (rows.length) {
      // DB user found — compare bcrypt hash
      const dbUser = rows[0]
      const match  = await bcrypt.compare(req.body.password, dbUser.password_hash)
      if (!match)
        return res.status(401).json({ message: 'Invalid email or password.' })

      const token = uuidv4()
      sessions[token] = { userId: dbUser.user_id, role: dbUser.role }

      return res.status(200).json({
        message: 'Login successful.',
        token,
        user: { id: dbUser.user_id, name: dbUser.full_name, email: dbUser.email, role: dbUser.role },
      })
    }

    // Fall back to in-memory users (seeded admin/patient)
    const memUser = users.find(
      u => u.email === email && u.password === req.body.password
    )
    if (!memUser)
      return res.status(401).json({ message: 'Invalid email or password.' })

    const token = uuidv4()
    sessions[token] = { userId: memUser.id, role: memUser.role }

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: memUser.id, name: memUser.name, email: memUser.email, role: memUser.role },
    })

  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Server error during login.' })
  }
})

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token || !sessions[token])
    return res.status(400).json({ message: 'Invalid or missing session.' })

  delete sessions[token]
  return res.status(200).json({ message: 'Logged out successfully.' })
})

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QueueSmart API is running.' })
})

// GET /api/queuestatus
app.get("/api/queuestatus", (req,res) => {
    res.status(200).json(queueStatus);
})

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE MANAGEMENT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/services
app.get('/api/services', (req, res) => {
  res.status(200).json({ services })
})

// GET /api/services/:id
app.get('/api/services/:id', (req, res) => {
  const svc = services.find(s => s.id === req.params.id)
  if (!svc) return res.status(404).json({ message: 'Service not found.' })
  res.status(200).json({ service: svc })
})

// POST /api/services
app.post('/api/services', (req, res) => {
  const errors = validateFields({
    name:     { required: true, minLength: 1, maxLength: 100 },
    desc:     { required: true, minLength: 1 },
    duration: { required: true },
    priority: { required: true, enum: ['low', 'medium', 'high'] },
  }, req.body)

  if (errors.length) return res.status(400).json({ errors })

  if (isNaN(req.body.duration) || Number(req.body.duration) < 1)
    return res.status(400).json({ errors: [{ field: 'duration', message: 'duration must be a positive number.' }] })

  const svc = {
    id:       uuidv4(),
    name:     req.body.name.trim(),
    desc:     req.body.desc.trim(),
    duration: Number(req.body.duration),
    priority: req.body.priority,
    status:   'open',
  }
  services.push(svc)
  res.status(201).json({ message: 'Service created.', service: svc })
})

// PUT /api/services/:id
app.put('/api/services/:id', (req, res) => {
  const idx = services.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Service not found.' })

  services[idx] = {
    ...services[idx],
    ...(req.body.name     && { name:     req.body.name.trim() }),
    ...(req.body.desc     && { desc:     req.body.desc.trim() }),
    ...(req.body.duration && { duration: Number(req.body.duration) }),
    ...(req.body.priority && { priority: req.body.priority }),
    ...(req.body.status   && { status:   req.body.status }),
  }
  res.status(200).json({ message: 'Service updated.', service: services[idx] })
})

// DELETE /api/services/:id
app.delete('/api/services/:id', (req, res) => {
  const idx = services.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Service not found.' })
  services.splice(idx, 1)
  res.status(200).json({ message: 'Service deleted.' })
})

// PATCH /api/services/:id/toggle
app.patch('/api/services/:id/toggle', (req, res) => {
  const idx = services.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Service not found.' })
  services[idx].status = services[idx].status === 'open' ? 'closed' : 'open'
  res.status(200).json({ message: 'Status toggled.', service: services[idx] })
})

// ══════════════════════════════════════════════════════════════════════════════
// QUEUE MANAGEMENT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/queue/:serviceId
app.get('/api/queue/:serviceId', async (req, res) => {
  try {
    const svc = services.find(
      service => service.id === req.params.serviceId
    )

    if (!svc) {
      return res.status(404).json({
        message: 'Service not found.'
      })
    }

    const [queueRows] = await db.query(
      `SELECT queue_id
       FROM queue
       WHERE service_id = ?
       AND status = 'open'
       LIMIT 1`,
      [req.params.serviceId]
    )

    if (queueRows.length === 0) {
      return res.status(404).json({
        message: 'Queue not found.'
      })
    }

    const queueId = queueRows[0].queue_id

    const [entries] = await db.query(
      `SELECT *
       FROM queueentry
       WHERE queue_id = ?
       AND status = 'waiting'
       ORDER BY position ASC`,
      [queueId]
    )

    const serviceQueue = entries.map(entry => ({
      ...entry,
      estimatedWaitMinutes:
        calculateWaitTime(
          entry.position,
          svc.duration,
          {}
        ).estimatedWaitMinutes
    }))

    return res.status(200).json({
      serviceId: req.params.serviceId,
      serviceName: svc.name,
      queue: serviceQueue
    })

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Unable to retrieve queue.'
    })
  }
})

// POST /api/queue/:serviceId/join
app.post('/api/queue/:serviceId/join', async (req, res) => {
  const svc = services.find(s => s.id === req.params.serviceId)

  if (!svc)                    return res.status(404).json({ message: 'Service not found.' })
  if (svc.status === 'closed') return res.status(400).json({ message: 'This service is currently closed.' })

  if (!req.body.userId || !req.body.name)
    return res.status(400).json({ message: 'userId and name are required.' })

  //this uses an array not the db  
  //const position = queue.filter(queueEntry => queueEntry.serviceId === req.params.serviceId).length + 1

  //find queue
  const [queueRows] = await db.query(
    `SELECT queue_id FROM queue WHERE service_id = ? AND status = 'open' LIMIT 1`,
    [req.params.serviceId]
  );

  if (queueRows.length === 0) {
    return res.status(404).json({
      message: 'No active queue found'
    });
  }

  const queueId = queueRows[0].queue_id;

  //check if user in queue
  const [alreadyIn] = await db.query(
    `SELECT entry_id FROM queueentry WHERE queue_id = ? AND user_id = ? AND status = 'waiting'`, [queueId, req.body.userId]
  );

  if(alreadyIn.length > 0) {
    return res.status(409).json({
      message: 'Already in queue'
    });
  }

  //determine next position from db data
  const [positionRows] = await db.query(
    `SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition FROM queueentry WHERE queue_id = ? AND status = 'waiting'`, [queueId]
  );

  const position = positionRows[0].nextPosition;

  const vitals = req.body.vitals || {}

  //define entry
  const entry = {
    id:        uuidv4(),
    serviceId: req.params.serviceId,
    userId:    req.body.userId,
    name:      req.body.name,
    joinedAt:  new Date().toISOString(),
    position,
    status:    'waiting',
    vitals,
    closeNotificationSent: false,
  }

  // queue.push is pushing to an array not the db
  //queue.push(entry)

  //add to queue in db
  await db.query(
    `INSERT INTO queueentry
     (entry_id, queue_id, user_id, position, joined_at, status)
     VALUES (?, ?, ?, ?, NOW(), 'waiting')`,
    [
        entry.id,
        queueId,
        entry.userId,
        entry.position
    ]
  );

  //calculate wait time
  const waitTimeData = calculateWaitTime(
    entry.position,
    svc.duration,
    entry.vitals
  )

  const joinedNotification = await createNotification(
  entry.userId,
  entry.serviceId,
  'queue_joined',
  `You joined the ${svc.name} queue at position ${entry.position}. Your estimated wait is ${waitTimeData.estimatedWaitMinutes} minutes.`,
  waitTimeData
  )

  return res.status(201).json({
    message:              'Joined queue successfully.',
    entry,
    estimatedWaitMinutes:
      waitTimeData.estimatedWaitMinutes,
    severityCategory:
      waitTimeData.severityCategory,
    notifications: [joinedNotification],
  })
})

// DELETE /api/queue/:serviceId/leave
app.delete('/api/queue/:serviceId/leave', async (req, res) => {
  try {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ message: 'userId is required.' })
  
  /*const [removed] = queue.splice(idx, 1)              This code uses the array instead of the DB
  queue
    .filter(e => e.serviceId === req.params.serviceId)
    .sort((a, b) => a.position - b.position)
    .forEach((e, i) => { e.position = i + 1 })

  history.push({
    id:          uuidv4(),
    userId,
    serviceId:   req.params.serviceId,
    serviceName: services.find(s => s.id === req.params.serviceId)?.name || '',
    joinedAt:    removed.joinedAt,
    servedAt:    null,
    outcome:     'left_queue',
  })*/

  const [queueRows] = await db.query(
    `SELECT queue_id FROM queue WHERE service_id = ? AND status = 'open' LIMIT 1`,[req.params.serviceId]
  )

  if(queueRows.length===0){
    return res.status(404).json({
      message:'no queue found'
  })
  }

  const queueId = queueRows[0].queue_id

  const [entryRows] = await db.query(
    `SELECT entry_id, position FROM queueentry WHERE queue_id = ? AND user_id = ? AND status = 'waiting' LIMIT 1`, [queueId, userId]
  )

  if(entryRows.length === 0){
    return res.status(404).json({
      message: 'you are not in the queue'
    })
  }

  const entry = entryRows[0]

  await db.query(`UPDATE queueentry SET status = 'cancelled' WHERE entry_id = ?`, [entry.entry_id]);

  await db.query(
    `UPDATE queueentry SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?`, [queueId,entry.position]
  )

  res.status(200).json({ message: 'Left queue successfully.' })
} catch (err) {
  console.error('Error leaving queue,', err)

  return res.status(500).json({
    message: 'Unable to leave queue'
  })
}
})

// POST /api/queue/:serviceId/serve-next
app.post('/api/queue/:serviceId/serve-next', (req, res) => {
  try {
    const serviceId = req.params.serviceId

    const svc = services.find(
      service => service.id === serviceId
    )

    if (!svc) {
      return res.status(404).json({
        message: 'Service not found.',
      })
    }

    const serviceQueue = queue
      .filter(entry => entry.serviceId === serviceId)
      .sort((a, b) => a.position - b.position)

    if (serviceQueue.length === 0) {
      return res.status(400).json({
        message: 'Queue is empty.',
      })
    }

    const nextPatient = serviceQueue[0]

    const nextPatientIndex = queue.findIndex(
      entry => entry.id === nextPatient.id
    )

    queue.splice(nextPatientIndex, 1)

    nextPatient.status = 'served'
    nextPatient.position = 0

    const servedNotification = createNotification(
      nextPatient.userId,
      nextPatient.serviceId,
      'served',
      `It is now your turn for ${svc.name}.`,
      {
        estimatedWaitMinutes: 0,
        severityCategory: 'N/A',
      }
    )

    history.push({
      id: uuidv4(),
      userId: nextPatient.userId,
      serviceId,
      serviceName: svc.name,
      joinedAt: nextPatient.joinedAt,
      servedAt: new Date().toISOString(),
      outcome: 'served',
    })

    const createdNotifications = []

    const remainingQueue = queue
      .filter(entry => entry.serviceId === serviceId)
      .sort((a, b) => a.position - b.position)

    remainingQueue.forEach((entry, index) => {
      const previousStatus = entry.status

      entry.position = index + 1

      const waitTimeData = calculateWaitTime(
        entry.position,
        svc.duration,
        entry.vitals || {}
      )

      const newStatus =
        entry.position <= 2 ||
        waitTimeData.estimatedWaitMinutes <= 15
          ? 'almost ready'
          : 'waiting'

      entry.status = newStatus

      if (
        previousStatus === 'waiting' &&
        newStatus === 'almost ready'
      ) {
        const notification = createNotification(
          entry.userId,
          entry.serviceId,
          'almost_ready',
          `You are almost ready for ${svc.name}. Your current queue position is ${entry.position}.`,
          waitTimeData
        )

        createdNotifications.push(notification)
      }
    })

    return res.status(200).json({
      message: 'Next user served.',
      served: nextPatient,
      servedNotification,
      notifications: createdNotifications,
      queue: remainingQueue,
    })
  } catch (error) {
    console.error('Serve-next route error:', error)

    return res.status(500).json({
      message: 'Unable to serve the next user.',
      error: error.message,
    })
  }
})

// GET /api/history/:userId
app.get('/api/history/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        qe.entry_id,
        qe.queue_id,
        qe.user_id,
        qe.position,
        qe.joined_at,
        qe.status,
        q.service_id
      FROM queueentry qe
      JOIN queue q
        ON qe.queue_id = q.queue_id
      WHERE qe.user_id = ?
        AND qe.status IN ('served', 'cancelled')
      ORDER BY qe.joined_at DESC
      `,
      [req.params.userId]
    );

    return res.status(200).json({
      history: rows
    });

  } catch (error) {
    console.error('History retrieval error:', error);

    return res.status(500).json({
      message: 'Unable to retrieve history'
    });
  }
});

// QUEUE JOIN ROUTES/FUNCTIONS
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

/*app.post("/joinQueue", (req,res) =>{              Old route that doesn't call to DB


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


}); */

app.get('/api/db-queues', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM queue')
    res.json(rows)
  } catch (error) {
    console.error('DB Error:', error)
    res.status(500).json({ error: error.message })
  }
})
app.get('/api/db-entries', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM QueueEntry');
    res.json(rows);
  } catch (error) {
    try {
      // Fallback in case table name in MySQL is lowercase
      const [rows] = await db.query('SELECT * FROM queue_entry');
      res.json(rows);
    } catch (err) {
      console.error('DB Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `QueueSmart API running on http://localhost:${PORT}`
    )
  })
}

function resetData() {
  queue.length = 0
  history.length = 0
  notifications.length = 0
  patientID = 0
}

// Supports: const app = require("./server")
module.exports = app

// Supports: const { app, resetData } = require("./server")
module.exports.app = app
module.exports.resetData = resetData
