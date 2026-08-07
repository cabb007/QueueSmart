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

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetch('http://localhost:3001/api/services')
      .then(res => res.json())
      .then(data => {
        const open = data.services.filter(s => s.status === 'open')
        setServices(open)
        if (open.length) setSelectedSvc(open[0].id)
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
        const selectedService = services.find(service => service.id === selectedSvc)

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
      const res  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, name: user.name }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Could not join queue.')
        setError(data.message || 'Could not join queue.')
        return
      }

      setJoined(true)
      setQueueEntry(data)
      toast.success('You have joined the queue!')
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

  

  const svc = services.find(s => s.id === selectedSvc)

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
              If your desired service is not listed, please select "Other" from the menu below.
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
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <label>Patient Name</label>
            <p className="subText">{user.name || 'Not logged in'}</p>

            
              <button
                className="joinButton"
                onClick={handleJoin}
                disabled={loading || !selectedSvc}
              >
                {loading ? 'Joining...' : 'Join Queue'}
              </button>
            
            <label>Estimated Wait Time</label>
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

            <label>Estimated Queue Position</label>
            <div className="greyBox">
              <p className="boldText">
                {queueEntry
                  ? `${getOrdinal(queueEntry.position)} position`
                  : '—'}
              </p>
            </div>

            
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