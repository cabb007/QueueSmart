const express = require('express')
const cors    = require('cors')
const { v4: uuidv4 } = require('uuid')
const { calculateWaitTime, assessSeverity } = require('./waitTimeCalculator')
const db = require("./db");

const app  = express()
const PORT = 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── In-Memory Store ───────────────────────────────────────────────────────────
const users = []
users.push({ id: uuidv4(), name: 'Admin User',  email: 'admin@clinic.com',  password: 'admin123',   role: 'admin'   })
users.push({ id: uuidv4(), name: 'Sarah Jones', email: 'sarah@clinic.com',  password: 'patient123', role: 'patient' })

//for temp dynamic user info for queue calculation
const sarahUser = users.find(
  user => user.email === 'sarah@clinic.com'
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
    userId: 'u3', 
    name: 'James Okonkwo',
    joinedAt: new Date().toISOString(),
    position: 2, 
    status: 'waiting' },
  { id: 'q3', 
    serviceId: 's1', 
    userId: 'u4', 
    name: 'Linda Pham',   
    joinedAt: new Date().toISOString(), 
    position: 1, 
    status: 'waiting' },
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
    id: uuidv4(),
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

//create a notification based on queue updates
function updateQueueEntryStatus(entry, service) {
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

//notification routing

//notification retrieval
app.get('/api/notifications/:userId', (req,res) => {
  const userNotifications = notifications.filter(
      notification => notification.userId === req.params.userId
    ).sort(
      (a,b)=>
        new Date(b.createdAt) - new Date(a.createdAt)
    )

  return res.status(200).json({
    notifications: userNotifications,
  })
})




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
    .map(e => ({
    ...e,
    serviceName: svc.name,
    estimatedWaitMinutes: e.position * svc.duration
}))

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
app.get('/api/history/:userId', (req, res) => {
  const userHistory = history
    .filter(h => h.userId === req.params.userId)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
  res.status(200).json({ history: userHistory })
})

// QUEUE JOIN ROUTES/FUNCTIONS

/* my implememtations. there here if we need them(LIAM)
app.post("/joinQueue", async (req,res) =>{
    console.log("JoinQueue route hit");
    console.log(req.body);
    try{
    //-------------VALIDATIONS------------//
    const [existingQueue] = await db.query(
        "SELECT entry_id FROM queueentry WHERE user_id = ? AND status = 'waiting'",
        [req.body.userId]
    );
    if(existingQueue.length > 0){
        return res.status(400).json({
            message: "Already in queue. Cannot join the queue twice"
        });
    }
    // changing check for only service
    if(typeof req.body.service !== "string"){
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

});
app.post("/leaveQueue", async (req,res)=> {
    //check to make sure that the tuple we want to 'leave' the queue is in the queue
    const [rows] = await db.query(
        "SELECT entry_id, queue_id, position FROM queueentry WHERE user_id = ? AND status = 'waiting'",
        [req.body.userId]
    );
    if(rows.length === 0 ){
        return res.status(404).json({
            message: "You are not in a queue so cant leave"
        });
    }
    const entryId = rows[0].entry_id;
    const queueId = rows[0].queue_id;
    const position = rows[0].position;
    //now we update the status to 'canceled' to signify leaving the queue
    await db.query(
        "UPDATE queueentry SET status = 'canceled' WHERE entry_id = ?",
        [entryId]
    );
    
    await db.query(
        "UPDATE queueentry SET position = position -1 WHERE queue_id = ? AND position > ? AND status = 'waiting'",
        [queueId, position]
    );
    res.json({message: "Successfully removed from queue"});
})
app.get("/history", async (req,res) => {
    const [userInfo] = await db.query(
        `SELECT s.name AS service,
            qe.joined_at,
            qe.status
        FROM queueentry qe
        JOIN queue q
            ON qe.queue_id = q.queue_id
        JOIN service s
            ON q.service_id = s.service_id
        WHERE qe.user_id = ?
        AND qe.status IN('served','canceled')`,
        [req.query.userId]
    );
    if(userInfo.length ===0){
        return res.status(200).json([]);
    }
    res.json(userInfo);
});
*/

//-----------SERVICE ROUTES THAT INCLUDE GET ADD UPDATE DELETE

//get all services
app.get("/service", async (req,res) => {
    try{
        const [rows] = await db.query(
            "SELECT * FROM service"
        )
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

        const [dupe] = await db.query(
            "SELECT service_id FROM service WHERE name = ?",
            [name.trim()]
        );

        if(!name || name.trim() === ""){
            return res.status(400).json({
                message: "Invalid or empty service name"
            });
        }
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

        if (!priority || priority <= 0) {
            return res.status(400).json({
                message: "Priority must be greater than 0."
            });
        }
        

        //||INSERTION||\\

        await db.query(
            `INSERT INTO service
            (service_id, name, description, duration, priority, created_at)
            VALUES (?,?,?,?,?,?)`,
            [
                uuidv4(),
                name.trim(),
                description.trim(),
                duration,
                priority,
                new Date()
            ]
        );
        res.status(201).json({
            message: "Successfully created new service"
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

        if (!priority || priority <= 0) {
            return res.status(400).json({
                message: "Priority must be greater than 0."
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
})

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