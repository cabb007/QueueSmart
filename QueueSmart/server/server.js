const express = require('express')
const cors    = require('cors')
const { v4: uuidv4 } = require('uuid')
const { calculateWaitTime, assessSeverity } = require('./waitTimeCalculator')

const app  = express()
const PORT = 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── In-Memory Store ───────────────────────────────────────────────────────────
const users = []
users.push({ id: uuidv4(), name: 'Admin User',  email: 'admin@clinic.com',  password: 'admin123',   role: 'admin'   })
users.push({ id: uuidv4(), name: 'Sarah Jones', email: 'sarah@clinic.com',  password: 'patient123', role: 'patient' })

const sessions = {}

const services = [
  { id: 's1', name: 'General Check-Up',        desc: 'Routine health assessment.',                duration: 15, priority: 'medium', status: 'open'   },
  { id: 's2', name: 'Blood Draw / Lab Work',   desc: 'Blood sample collection.',                  duration: 10, priority: 'low',    status: 'open'   },
  { id: 's3', name: 'Specialist Consultation', desc: 'Appointment with a specialist.',            duration: 30, priority: 'high',   status: 'open'   },
  { id: 's4', name: 'Prescription Refill',     desc: 'Routine medication renewal.',               duration: 8,  priority: 'low',    status: 'closed' },
  { id: 's5', name: 'Urgent Care',             desc: 'Immediate attention for acute conditions.', duration: 20, priority: 'high',   status: 'open'   },
]

let queue = [
  { id: 'q1', serviceId: 's1', userId: 'u2', name: 'Sarah Jones',  joinedAt: new Date().toISOString(), position: 1, status: 'waiting' },
  { id: 'q2', serviceId: 's1', userId: 'u3', name: 'James Okonkwo',joinedAt: new Date().toISOString(), position: 2, status: 'waiting' },
  { id: 'q3', serviceId: 's1', userId: 'u4', name: 'Linda Pham',   joinedAt: new Date().toISOString(), position: 3, status: 'waiting' },
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

    if (rule.required && !str) {
      errors.push({ field, message: `${field} is required.` }); continue
    }
    if (!str) continue
    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
      errors.push({ field, message: `${field} must be a valid email address.` })
    if (rule.minLength && str.length < rule.minLength)
      errors.push({ field, message: `${field} must be at least ${rule.minLength} characters.` })
    if (rule.maxLength && str.length > rule.maxLength)
      errors.push({ field, message: `${field} must be at most ${rule.maxLength} characters.` })
    if (rule.enum && !rule.enum.includes(val))
      errors.push({ field, message: `${field} must be one of: ${rule.enum.join(', ')}.` })
  }
  return errors
}

// Notications Handling-----------------------------------------------------------
function createNotification(userId,serviceId,type,message,waitTimeData = null){
  const notification = {
    id: 1,
    userId,
    serviceId,
    type,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    ...(waitTimeData && {
      estimatedWaitMinutes: waitTimeData.estimatedWaitMinutes,
      severityCategory: waitTimeData.severityCategory,
    }),
  }

  notifications.push(notification)

  console.log(
    `[Notification] User ${userId} | ${type}: ${message}`
  )

  return notification
}

function checkCloseToFront(entry,service) {
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

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const errors = validateFields({
    name:     { required: true, minLength: 2, maxLength: 100 },
    email:    { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    role:     { required: true, enum: ['patient', 'nurse', 'admin'] },
  }, req.body)

  if (errors.length) return res.status(400).json({ errors })

  const exists = users.find(u => u.email === req.body.email.trim().toLowerCase())
  if (exists) return res.status(409).json({ message: 'Email already registered.' })

  const user = {
    id:       uuidv4(),
    name:     req.body.name.trim(),
    email:    req.body.email.trim().toLowerCase(),
    password: req.body.password,
    role:     req.body.role,
  }
  users.push(user)

  return res.status(201).json({ message: 'Account created successfully.', userId: user.id })
})

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const errors = validateFields({
    email:    { required: true, type: 'email' },
    password: { required: true },
  }, req.body)

  if (errors.length) return res.status(400).json({ errors })

  const user = users.find(
    u => u.email === req.body.email.trim().toLowerCase() && u.password === req.body.password
  )
  if (!user) return res.status(401).json({ message: 'Invalid email or password.' })

  const token = uuidv4()
  sessions[token] = { userId: user.id, role: user.role }

  return res.status(200).json({
    message: 'Login successful.',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
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
app.get('/api/queue/:serviceId', (req, res) => {
  const svc = services.find(service => service.id === req.params.serviceId)
  if (!svc) return res.status(404).json({ message: 'Service not found.' })

  const serviceQueue = queue
    .filter(e => e.serviceId === req.params.serviceId)
    .sort((a, b) => a.position - b.position)
    .map(e => ({ ...e, estimatedWaitMinutes: e.position * svc.duration }))

  res.status(200).json({ serviceId: req.params.serviceId, serviceName: svc.name, queue: serviceQueue })
})

// POST /api/queue/:serviceId/join
app.post('/api/queue/:serviceId/join', (req, res) => {
  const svc = services.find(s => s.id === req.params.serviceId)

  if (!svc)                    return res.status(404).json({ message: 'Service not found.' })
  if (svc.status === 'closed') return res.status(400).json({ message: 'This service is currently closed.' })

  if (!req.body.userId || !req.body.name)
    return res.status(400).json({ message: 'userId and name are required.' })

  const alreadyIn = queue.find(e => e.serviceId === req.params.serviceId && e.userId === req.body.userId)
  if (alreadyIn) return res.status(409).json({ message: 'You are already in this queue.' })

  const position = queue.filter(queueEntry => queueEntry.serviceId === req.params.serviceId).length + 1

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

  //add to queue
  queue.push(entry)
  //calculate wait time
  const waitTimeData = calculateWaitTime(
    entry.position,
    svc.duration,
    entry.vitals
  )

  const joinedNotification = createNotification(
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
app.delete('/api/queue/:serviceId/leave', (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ message: 'userId is required.' })

  const idx = queue.findIndex(e => e.serviceId === req.params.serviceId && e.userId === userId)
  if (idx === -1) return res.status(404).json({ message: 'You are not in this queue.' })

  const [removed] = queue.splice(idx, 1)
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
  })

  res.status(200).json({ message: 'Left queue successfully.' })
})

// POST /api/queue/:serviceId/serve-next
app.post('/api/queue/:serviceId/serve-next', (req, res) => {
  const svc = services.find(s => s.id === req.params.serviceId)
  if (!svc) return res.status(404).json({ message: 'Service not found.' })

  const serviceQueue = queue
    .filter(e => e.serviceId === req.params.serviceId)
    .sort((a, b) => a.position - b.position)

  if (!serviceQueue.length) return res.status(400).json({ message: 'Queue is empty.' })

  const next = serviceQueue[0]
  queue = queue.filter(e => e.id !== next.id)
  queue
    .filter(e => e.serviceId === req.params.serviceId)
    .sort((a, b) => a.position - b.position)
    .forEach((e, i) => { e.position = i + 1 })

  history.push({
    id:          uuidv4(),
    userId:      next.userId,
    serviceId:   req.params.serviceId,
    serviceName: svc.name,
    joinedAt:    next.joinedAt,
    servedAt:    new Date().toISOString(),
    outcome:     'served',
  })

  res.status(200).json({ message: 'Next user served.', served: next })
})

// GET /api/history/:userId
app.get('/api/history/:userId', (req, res) => {
  const userHistory = history
    .filter(h => h.userId === req.params.userId)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
  res.status(200).json({ history: userHistory })
})

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

app.post("/joinQueue", (req,res) =>{


    if(!req.body.name || !req.body.service || req.body.name.trim() === ""){
        return res.status(400).json({message: "Missing or invalid inputs please try again"}); //res.status(400) means the client sent a bad request
    }
    if(typeof req.body.name !== "string" || typeof req.body.service !== "string"){ //checking for good name and service inputs
        return res.status(400).json({message: "Not a valid name or service"});
    }
    if(req.body.name.length > 50){ //max charcter limit of 50
        return res.status(400).json({mesasge: "Max character limit of 50"});
    }
    if(!validFields.includes(req.body.service)){
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

    console.log(queue)


});

app.get("/queue", (req,res) => {
    res.json(queue);
    
});

app.get("/history", (req,res) => {
    res.json(history);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`QueueSmart API running on http://localhost:${PORT}`)
})

module.exports = app
