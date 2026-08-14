import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './joinQueue.css';



function JoinQueue() {
  const navigate = useNavigate()

  const [services,    setServices]    = useState([])
  const [selectedSvc, setSelectedSvc] = useState('')
  const [joined,      setJoined]      = useState(false)
  const [queueEntry,  setQueueEntry]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Intake vitals — used by the backend to assess severity/priority
  const [bodyTemp,  setBodyTemp]  = useState('')
  const [painLevel, setPainLevel] = useState('')
  const [sysBP,     setSysBP]     = useState('')
  const [diaBP,     setDiaBP]     = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetch('http://localhost:3001/api/services')
      .then(res => res.json())
      .then(data => {
        const open = data.services.filter(s => s.status === 'open')
        setServices(open)
        if (open.length) setSelectedSvc(open[0].service_id)
      })
      .catch(() => setError('Could not load services.'))
  }, [])

  

  useEffect(() => {
    if (!selectedSvc || !user.id) {
      return
    }

    async function refreshQueueStatus() {
      try {
        const res = await fetch(
          `http://localhost:3001/api/queue/${selectedSvc}`
        )

        if(!res.ok){
          return
        }

        const data = await res.json()

        const matchingEntry = data.queue.find(entry => entry.user_id === user.id)
        const selectedService = services.find(service => service.service_id === selectedSvc)

        if(matchingEntry) { //if already in queue
          setJoined(true)
          setQueueEntry(matchingEntry)
        } else {

          setJoined(false)

          const nextPosition = data.queue.length + 1

          setQueueEntry({
          position: nextPosition,
          estimatedWaitMinutes:
            (nextPosition-1) * (selectedService?.duration || 0) + 5
        })
        }
  
      } catch (err) {
        console.error("Could not refresh queue status,", err)
      }
    }

    refreshQueueStatus()

    const intervalId = setInterval(refreshQueueStatus, 5000)

    return () => clearInterval(intervalId)
  }, [joined, selectedSvc, user.id])

  async function handleJoin() {
    if (!selectedSvc) return
    setLoading(true)
    setError('')
    try {
      const vitals = {
        bodyTemp:  bodyTemp  !== '' ? Number(bodyTemp)  : 98.6,
        painLevel: painLevel !== '' ? Number(painLevel) : 0,
        sysBP:     sysBP     !== '' ? Number(sysBP)     : 120,
        diaBP:     diaBP     !== '' ? Number(diaBP)     : 80,
      }

      const res  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, name: user.name, vitals }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Could not join queue.')
        setError(data.message || 'Could not join queue.')
        return
      }

      setJoined(true)

      setQueueEntry({
      ...data.entry,
      estimatedWaitMinutes: data.estimatedWaitMinutes,
      severityCategory: data.severityCategory
      })
      localStorage.setItem('serviceId', selectedSvc)
      toast.success('You have joined the queue!')
      navigate('/queuestatus')
    } catch {
      toast.error('Could not connect to server.')
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeave() {
    if (!selectedSvc) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`http://localhost:3001/api/queue/leave`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Could not leave queue.')
        setError(data.message || 'Could not leave queue.')
        return
      }

      setJoined(false)
      setQueueEntry(null)
      toast.success('You have left the queue.')
    } catch {
      toast.error('Could not connect to server.')
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  

  const svc = services.find(s => s.service_id === selectedSvc)

  function calculateFrontendWait(position) {
  if (!svc) {
    return 0
  }

  return position * svc.duration
  }

  function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  return (
    <>
      <div className="joinQueuePage">
        <div className="joinCard">

          <div className="cardHeader">
            <h2>Join Queue</h2>
            <p className="pageDescription">
              Check in for your clinic visit and view estimated wait times.
            </p>
            <p className="pageDescription">Fields with this symbol are required *</p>
          </div>

          <div className="card-content">

            {error && (
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>
                {error}
              </p>
            )}

            <label>Select Service *</label>
            <p className="subText">
              Please select your desired service from the menue below.
            </p>
            <select
              className="textBox"
              value={selectedSvc}
              onChange={e => {
                setSelectedSvc(e.target.value)
                setJoined(false)
                setQueueEntry(null)
                setError('')
              }}
            >
              {services.map(s => (
                <option key={s.service_id} value={s.service_id}>{s.name}</option>
              ))}
            </select>

            <label>Patient Name</label>
            <p className="subText">{user.name || 'Not logged in'}</p>

            <label>Intake Vitals</label>
            <p className="subText">
              Optional — helps us prioritize care and adjust your wait time. Leave blank for normal/average values.
            </p>

            <label className="miniText">Body Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              className="textBox"
              placeholder="98.6"
              value={bodyTemp}
              onChange={e => setBodyTemp(e.target.value)}
            />

            <label className="miniText">Pain Level (0–10)</label>
            <input
              type="number"
              min="0"
              max="10"
              className="textBox"
              placeholder="0"
              value={painLevel}
              onChange={e => setPainLevel(e.target.value)}
            />

            <label className="miniText">Systolic Blood Pressure</label>
            <input
              type="number"
              className="textBox"
              placeholder="120"
              value={sysBP}
              onChange={e => setSysBP(e.target.value)}
            />

            <label className="miniText">Diastolic Blood Pressure</label>
            <input
              type="number"
              className="textBox"
              placeholder="80"
              value={diaBP}
              onChange={e => setDiaBP(e.target.value)}
            />

            
              <button
                className="joinButton"
                onClick={handleJoin}
                disabled={loading || !selectedSvc}
              >
                {loading ? 'Joining...' : 'Join Queue'}
              </button>
            
            <label>{joined ? 'Current Wait Time' : 'Estimated Wait Time'}</label>
            <p className="miniText">
              *Wait times and queue positions may vary for different services
            </p>
            <div className="greyBox">
              <p className="boldText">
                {queueEntry
                  ? `${queueEntry.estimatedWaitMinutes} minutes`
                  : svc ? `~${svc.duration} minutes` : '—'}
              </p>
            </div>

            <label>{joined ? 'Current Queue Position' : 'Estimated Queue Position'}</label>
            <div className="greyBox">
              <p className="boldText">
                {queueEntry
                  ? `${getOrdinal(queueEntry.position)} position`
                  : '—'}
              </p>
            </div>

            {joined && svc && (
              <>
                <label>Smart Notification</label>
                <p className="miniText">
                  We'll alert you before your turn — timed to how long{' '}
                  {svc.name} usually takes, so you have enough time to get here.
                </p>
                <div className="greyBox">
                  <p className="boldText">
                    You'll be notified ~
                    {Math.min(30, Math.max(5, Math.round(svc.duration * 0.75) + 5))}{' '}
                    minutes before your turn
                  </p>
                </div>
              </>
            )}

            
              <button
                className="joinButton"
                onClick={handleLeave}
                disabled={loading}
              >
                {loading ? 'Leaving...' : 'Leave Queue'}
              </button>
            

          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}

export default JoinQueue;
