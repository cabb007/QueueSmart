import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './joinQueue.css';

function JoinQueue() {
  const navigate = useNavigate()

  const [services,     setServices]     = useState([])
  const [selectedSvc,  setSelectedSvc]  = useState('')
  const [joined,       setJoined]       = useState(false)
  const [queueEntry,   setQueueEntry]   = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // Get logged in user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Fetch services from backend on mount
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

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

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
        setError(data.message || 'Could not join queue.')
        return
      }

      setJoined(true)
      setQueueEntry(data)
    } catch {
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
      const res  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}/leave`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Could not leave queue.')
        return
      }

      setJoined(false)
      setQueueEntry(null)
    } catch {
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const svc = services.find(s => s.id === selectedSvc)

  function getOrdinal(n) {
    const s = ['th','st','nd','rd']
    const v = n % 100
    return n + (s[(v-20)%10] || s[v] || s[0])
  }

  return (
    <>
      {/* <div className="navbar">
        <h2 className="logo">QueueSmart</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="logoutButton" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="logoutButton" onClick={() => navigate('/join')}>Join Queue</button>
          <button className="logoutButton" onClick={() => navigate('/queuestatus')}>Queue Status</button>
          <button className="logoutButton" onClick={() => navigate('/history')}>History</button>
        </div>
        <button className="logoutButton" onClick={logout}>Logout</button>
      </div> */}

      <div className="container">
        <div className="joinCard">

          <div className="cardHeader">
            <h2>Join Queue</h2>
            <p className="pageDescription">
              Check in for your clinic visit and view estimated wait times.
            </p>
            <p className="pageDescription">Fields with this symbol are required *</p>
          </div>

          <div className="card-content">

            {/* Error message */}
            {error && (
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>
                {error}
              </p>
            )}

            {/* Service select */}
            <label>Select Service *</label>
            <p className="subText">
              If your desired service is not listed, please select "Other".
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
              disabled={joined}
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Patient name */}
            <label>Patient Name</label>
            <p className="subText">{user.name || 'Not logged in'}</p>

            {/* Join button */}
            {!joined && (
              <button
                className="joinButton"
                onClick={handleJoin}
                disabled={loading || !selectedSvc}
              >
                {loading ? 'Joining...' : 'Join Queue'}
              </button>
            )}

            {/* Wait time */}
            <label>Estimated Wait Time</label>
            <p className="miniText">
              *Wait times and queue positions may vary for different services
            </p>
            <div className="greyBox">
              <p className="boldText">
                {joined && queueEntry
                  ? `${queueEntry.estimatedWaitMinutes} minutes`
                  : svc ? `~${svc.duration} minutes` : '—'}
              </p>
            </div>

            {/* Queue position */}
            <label>Estimated Queue Position</label>
            <div className="greyBox">
              <p className="boldText">
                {joined && queueEntry
                  ? `${getOrdinal(queueEntry.entry.position)} position`
                  : '—'}
              </p>
            </div>

            {/* Leave button */}
            {joined && (
              <button
                className="joinButton"
                onClick={handleLeave}
                disabled={loading}
              >
                {loading ? 'Leaving...' : 'Leave Queue'}
              </button>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

export default JoinQueue;