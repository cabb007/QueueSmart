require('dotenv').config()
const db = require('./db')
const express = require('express')
const cors    = require('cors')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
//const mysql  = require('mysql2/promise')
const { calculateWaitTime, assessSeverity, computeNotificationLeadTime } = require('./waitTimeCalculator')
//const db = require("./db");

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

  const leadTime = computeNotificationLeadTime(service, waitTimeData.severityCategory)
  const isClose = entry.position <=2 || waitTimeData.estimatedWaitMinutes <= leadTime

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

  const leadTime = computeNotificationLeadTime(service, waitTimeData.severityCategory)

  let newStatus = 'waiting'

  if (
    entry.position <= 2 ||
    waitTimeData.estimatedWaitMinutes <= leadTime
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
    notification = await createNotification(
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
      'INSERT INTO userprofile (profile_id, user_id, full_name, email, date_of_birth, blood_type, emergency_contact) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        profileId,
        userId,
        req.body.name.trim(),
        email,
        req.body.dateOfBirth || null,
        req.body.bloodType || null,
        req.body.emergencyContact || null,
      ]
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

// GET /api/profile/:userId
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT full_name, email, date_of_birth, blood_type, emergency_contact
       FROM userprofile
       WHERE user_id = ?`,
      [req.params.userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' })
    }

    return res.status(200).json({ profile: rows[0] })

  } catch (err) {
    console.error('Profile retrieval error:', err)
    return res.status(500).json({ message: 'Unable to retrieve profile.' })
  }
})

// PUT /api/profile/:userId
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const [existing] = await db.query(
      'SELECT profile_id FROM userprofile WHERE user_id = ?',
      [req.params.userId]
    )

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' })
    }

    await db.query(
      `UPDATE userprofile
       SET date_of_birth = ?,
           blood_type = ?,
           emergency_contact = ?
       WHERE user_id = ?`,
      [
        req.body.dateOfBirth || null,
        req.body.bloodType || null,
        req.body.emergencyContact || null,
        req.params.userId,
      ]
    )

    return res.status(200).json({ message: 'Profile updated successfully.' })

  } catch (err) {
    console.error('Profile update error:', err)
    return res.status(500).json({ message: 'Unable to update profile.' })
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

    // Find the open DB queue for this service
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

    // Get the REAL waiting entries from the database
    const [entries] = await db.query(
      `SELECT *
       FROM queueentry
       WHERE queue_id = ?
       AND status = 'waiting'
       ORDER BY position ASC`,
      [queueId]
    )

    // Add estimated wait time to every DB entry
    const serviceQueue = entries.map(entry => {
      const vitals = {
        bodyTemp:  entry.body_temp  ?? 98.6,
        painLevel: entry.pain_level ?? 0,
        sysBP:     entry.sys_bp     ?? 120,
        diaBP:     entry.dia_bp     ?? 80,
      }

      const waitTimeData = calculateWaitTime(
        entry.position,
        svc.duration,
        vitals
      )

      return {
        ...entry,
        service_id: req.params.serviceId,
        serviceName: svc.name,
        vitals,
        estimatedWaitMinutes:
          waitTimeData.estimatedWaitMinutes,
        severityCategory:
          waitTimeData.severityCategory
      }
    })

    return res.status(200).json({
      serviceId: req.params.serviceId,
      serviceName: svc.name,
      queue: serviceQueue
    })

  } catch (error) {
    console.error(
      'Queue retrieval error:',
      error
    )

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
     (entry_id, queue_id, user_id, position, joined_at, status, body_temp, pain_level, sys_bp, dia_bp)
     VALUES (?, ?, ?, ?, NOW(), 'waiting', ?, ?, ?, ?)`,
    [
        entry.id,
        queueId,
        entry.userId,
        entry.position,
        entry.vitals.bodyTemp,
        entry.vitals.painLevel,
        entry.vitals.sysBP,
        entry.vitals.diaBP
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

// UPDATE /api/queue/:serviceId/leave
app.post('/api/queue/leave', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        message: 'userId is required.'
      })
    }

    const [entryRows] = await db.query(
      `SELECT entry_id, queue_id, position
       FROM queueentry
       WHERE user_id = ?
       AND status = 'waiting'
       LIMIT 1`,
      [userId]
    )

    if (entryRows.length === 0) {
      return res.status(404).json({
        message: 'You are not in a queue.'
      })
    }

    const entry = entryRows[0]

    await db.query(
      `UPDATE queueentry
       SET status = 'canceled'
       WHERE entry_id = ?`,
      [entry.entry_id]
    )

    await db.query(
      `UPDATE queueentry
       SET position = position - 1
       WHERE queue_id = ?
       AND status = 'waiting'
       AND position > ?`,
      [entry.queue_id, entry.position]
    )

    const service = services.find(
      service => service.id === entry.service_id
    )

    const leaveNotification = await createNotification(
      userId,
      entry.service_id,
      'queue_left',
      `You left the current queue.`,
      null
    )

    return res.status(200).json({
      message: 'Left queue successfully.'
    })

  } catch (err) {
    console.error('Error leaving queue:', err)

    return res.status(500).json({
      message: 'Unable to leave queue'
    })
  }
})

// POST /api/queue/:serviceId/serve-next
app.post('/api/queue/:serviceId/serve-next', async (req, res) => {
  try {
    const serviceId = req.params.serviceId

    const svc = services.find(
      service => service.id === serviceId
    )

    if (!svc) {
      return res.status(404).json({
        message: 'Service not found.'
      })
    }

    // Find the open queue for this service
    const [queueRows] = await db.query(
      `SELECT queue_id FROM queue WHERE service_id = ? AND status = 'open' LIMIT 1`,
      [serviceId]
    )

    if (queueRows.length === 0) {
      return res.status(404).json({
        message: 'Queue not found.'
      })
    }

    const queueId = queueRows[0].queue_id

    // Find the first waiting patient
    const [entryRows] = await db.query(
      `SELECT entry_id, user_id, position, joined_at FROM queueentry WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC LIMIT 1`,
      [queueId]
    )

    if (entryRows.length === 0) {
      return res.status(400).json({
        message: 'Queue is empty.'
      })
    }

    const nextPatient = entryRows[0]

    // Mark first patient as served
    await db.query(
      `UPDATE queueentry SET status = 'served' WHERE entry_id = ?`,
      [nextPatient.entry_id]
    )

    // Notify served patient
    const servedNotification = await createNotification(
      nextPatient.user_id,
      serviceId,
      'served',
      `It is now your turn for ${svc.name}.`,
      {
        estimatedWaitMinutes: 0,
        severityCategory: 'N/A'
      }
    )

    // Move everyone else forward
    await db.query(
      `UPDATE queueentry SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?`,
      [queueId, nextPatient.position]
    )

    const [remainingQueue] = await db.query(
      `SELECT entry_id, queue_id, user_id, position, joined_at, status FROM queueentry WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC`,
      [queueId]
    )

    const createdNotifications = []

    for (const entry of remainingQueue) {
      const waitTimeData = calculateWaitTime(
        entry.position,
        svc.duration,
        {}
      )

      const leadTime = computeNotificationLeadTime(svc, waitTimeData.severityCategory)

      if (
        entry.position <= 2 ||
        waitTimeData.estimatedWaitMinutes <= leadTime
      ) {
        const notification = await createNotification(
          entry.user_id,
          serviceId,
          'almost_ready',
          `You are almost ready for ${svc.name}. Your current queue position is ${entry.position}.`,
          waitTimeData
        )

        createdNotifications.push(notification)
      }
    }

    return res.status(200).json({
      message: 'Next user served.',
      served: nextPatient,
      servedNotification,
      notifications: createdNotifications,
      queue: remainingQueue
    })

  } catch (error) {
    console.error('Serve-next route error:', error)

    return res.status(500).json({
      message: 'Unable to serve the next user.',
      error: error.message
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
        AND qe.status IN ('served', 'canceled')
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
/*app.post("/QueueHistory", (req,res)=> {

})

app.post("/leaveQueue", (req,res)=> {             Old route that doesn't call to DB
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

app.post("/joinQueue", (req,res) =>{              Old route that doesn't call to DB


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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }

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


//-----------SERVICE ROUTES THAT INCLUDE GET ADD UPDATE DELETE

//get all services
app.get("/service", async (req,res) => {
    try{
        const [rows] = await db.query(
          `SELECT 
          service.*,
          queue.status
          FROM service
          LEFT JOIN queue
          ON service.service_id = queue.service_id`
        );
        res.json(rows);
    }catch(error){
        console.log(error);
        res.status(500).json({
            message: "Database error for service get"
        });
    }
});
//adding a service
app.post("/service", async (req,res) =>{
    try{

        //|| VERIFICATIONS||\\
        const { name, description, duration, priority } = req.body;

        if(!name || name.trim() === ""){
            return res.status(400).json({
                message: "Invalid or empty service name"
            });
        }
        const [dupe] = await db.query(
            "SELECT service_id FROM service WHERE name = ?",
            [name.trim()]
        );
        if(dupe.length > 0){
            return res.status(400).json({
                message: "Already added to the list of services"
            });
        }
        if (!description || description.trim() === "") {
            return res.status(400).json({
                message: "Description is required."
            });
        }

        if (!duration || duration <= 0) {
            return res.status(400).json({
                message: "Duration must be greater than 0."
            });
        }

        const validPriorities = ["low", "medium", "high"];

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
            message: "Invalid priority."
        });
        }
        

        //||INSERTION||\\

        const serviceId = uuidv4();
        const queueId = uuidv4();

        await db.query(
            `INSERT INTO service
            (service_id, name, description, duration, priority, created_at)
            VALUES (?,?,?,?,?,?)`,
            [
                serviceId,
                name.trim(),
                description.trim(),
                duration,
                priority,
                new Date()
            ]
        );

        await db.query(
          `INSERT INTO queue
          (queue_id, service_id, status, created_at)
          VALUES (?,?,?,?)`,
          [
            queueId,
            serviceId,
            "open",
            new Date()
          ]
        );


        res.status(201).json({
            message: "Successfully created new service and queue",
            serviceId, queueId
        });

    }catch(error){
        console.log(error);
        res.status(500).json({
            message: "Error on service post request"
        });
    }
});
//update a service
app.put("/service/:id", async(req,res) =>{
    try{
        const serviceId = req.params.id;
        const {name, description, duration, priority} = req.body;
       
        const [rows] = await db.query(
        "SELECT service_id FROM service WHERE service_id = ?",
        [serviceId]
    );
        //||VALIDATIONS||\\
        if (rows.length === 0) {
            return res.status(404).json({
                message: "Service not found."});
        }

        if(!name || name.trim() === ""){
            return res.status(400).json({
                message: "Invalid or empty service name"
            });
        }

        if (!description || description.trim() === "") {
            return res.status(400).json({
                message: "Description is required."
            });
        }

        if (!duration || duration <= 0) {
            return res.status(400).json({
                message: "Duration must be greater than 0."
            });
        }

        const validPriorities = ["low", "medium", "high"];

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
            message: "Invalid priority."
            });
        }

        await db.query(
            `UPDATE service
            SET
                name = ?,
                description = ?,
                duration = ?,
                priority = ?
            WHERE service_id = ?`,
            [
                name.trim(),
                description.trim(),
                duration,
                priority,
                serviceId
            ]
        );
        return res.status(200).json({
            message: "Updated information",
            serviceId
        });

    }catch(error){
        console.log(error);
        res.status(500).json({
            message: "Error on service put request"
        });
    }
});
//delete a service
app.delete("/service/:id", async(req,res) =>{
    try{
        const serviceId = req.params.id;
        const [servCheck] = await db.query(
            "SELECT * FROM service WHERE service_id = ?",
            [serviceId]
        );
        if(servCheck.length ===0){
            return res.status(404).json({
                message: "This service does not exist and cannot be deleted"
            });
        }

        await db.query(
            "DELETE FROM service WHERE service_id = ?",
            [serviceId]
        );
        return res.status(200).json({
            message: "Service Deleted"
        });
    }catch(error){
        console.log(error);
        res.status(500).json({
            message: "Error on service delete request"
        });
    }
});

app.patch("/service/:id/toggle", async (req,res) => {
  const serviceId = req.params.id;
  
  const [rows] = await db.query(
    `SELECT queue_id, status
     FROM queue
     WHERE service_id = ?`,
    [serviceId]
  );
  if(rows.length === 0){
    return res.status(404).json({
      message: "Queue not found for this service"
    });
  }
  const queue = rows[0];

  const newStatus = queue.status === "open"
      ? "closed"
      : "open";

  await db.query(
    `UPDATE queue
     SET status = ?
     WHERE queue_id = ?`,
    [newStatus, queue.queue_id]
  );

  //query updated status
  const [updated] = await db.query(
        `SELECT 
            service.*,
            queue.status
         FROM service
         LEFT JOIN queue
            ON service.service_id = queue.service_id
         WHERE service.service_id = ?`,
        [serviceId]
    );

    res.status(200).json(updated[0]);

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
