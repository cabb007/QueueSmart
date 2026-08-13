import { useState, useEffect } from 'react'

const PRIORITY_STYLES = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

export default function NurseDashboard() {
  const [services,    setServices]    = useState([])
  const [selectedSvc, setSelectedSvc] = useState(null)
  const [queue,       setQueue]       = useState([])
  const [served,      setServed]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [qLoading,    setQLoading]    = useState(false)
  const [removeId,    setRemoveId]    = useState(null)

  const svc = services.find(s => s.id === selectedSvc)

  // Fetch all services on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/nurse/queue')
      .then(res => res.json())
      .then(data => {
        setServices(data.services || [])
        const first = data.services?.find(s => s.status === 'open')
        if (first) setSelectedSvc(first.id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fetch queue when service changes
  useEffect(() => {
    if (!selectedSvc) return
    setQLoading(true)
    fetch(`http://localhost:3001/api/queue/${selectedSvc}`)
      .then(res => res.json())
      .then(data => { setQueue(data.queue || []); setQLoading(false) })
      .catch(() => setQLoading(false))
  }, [selectedSvc])

  async function serveNext() {
    if (!queue.length) return
    try {
      const res  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}/serve-next`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setServed(prev => [{ ...data.served, servedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev])
        const qRes  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}`)
        const qData = await qRes.json()
        setQueue(qData.queue || [])
      }
    } catch (err) { console.error(err) }
  }

  async function confirmRemove() {
    const entry = queue.find(q => q.id === removeId)
    try {
      const res = await fetch(`http://localhost:3001/api/queue/${selectedSvc}/leave`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: entry?.userId }),
      })
      if (res.ok) {
        const qRes  = await fetch(`http://localhost:3001/api/queue/${selectedSvc}`)
        const qData = await qRes.json()
        setQueue(qData.queue || [])
      }
      setRemoveId(null)
    } catch (err) { console.error(err); setRemoveId(null) }
  }

  function formatTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 font-medium">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#0D1B4B] tracking-tight">Nurse Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage live patient queues across all services</p>
        </div>

        {/* ── Service summary cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {services.map(s => (
            <div
              key={s.id}
              onClick={() => { setSelectedSvc(s.id); setServed([]) }}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all
                          ${selectedSvc === s.id ? 'border-[#2B4ACB] shadow-md shadow-[#2B4ACB]/10' : 'border-gray-200 hover:border-[#2B4ACB]/40'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.status}
                </span>
                <span className="text-2xl font-extrabold text-[#2B4ACB]">{s.waitingCount}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.duration} min avg</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Live Queue ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Queue header */}
              <div className="bg-[#2B4ACB] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white text-lg font-bold">{svc?.name || 'Select a service'}</h2>
                    <p className="text-white/70 text-sm mt-0.5">{queue.length} patient{queue.length !== 1 ? 's' : ''} waiting</p>
                  </div>
                  <button
                    onClick={serveNext}
                    disabled={!queue.length}
                    className="px-5 py-2.5 bg-white text-[#2B4ACB] font-bold text-sm rounded-lg
                               hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ✔ Serve Next
                  </button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                  {[
                    { label: 'Waiting',      val: queue.length },
                    { label: 'Est. Total',   val: queue.length ? `~${queue.length * (svc?.duration || 15)} min` : '—' },
                    { label: 'Served Today', val: served.length },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-xl font-extrabold text-white">{s.val}</div>
                      <div className="text-white/60 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue list */}
              <div className="p-4">
                {qLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading queue...</div>
                ) : queue.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2 opacity-40">🎉</div>
                    <div className="font-semibold text-gray-500">Queue is empty</div>
                    <div className="text-sm mt-1">No patients currently waiting</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {queue.map((q, i) => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors
                                    ${i === 0 ? 'border-[#2B4ACB] bg-[#EEF1FB]' : 'border-gray-100 bg-gray-50'}`}
                      >
                        {/* Position */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                         font-extrabold text-lg shrink-0
                                         ${i === 0 ? 'bg-[#2B4ACB] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          {q.position}
                        </div>

                        {/* Patient info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm">{q.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {q.id} · Joined {formatTime(q.joinedAt)}
                          </div>
                        </div>

                        {/* Wait */}
                        <div className="text-center shrink-0">
                          <div className="text-sm font-bold text-gray-700">
                            {i === 0 ? 'Now' : `~${i * (svc?.duration || 15)} min`}
                          </div>
                          <div className="text-xs text-gray-400">wait</div>
                        </div>

                        {/* Status */}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
                                          ${q.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {q.status === 'ready' ? '● Ready' : '● Waiting'}
                        </span>

                        {/* Actions */}
                        <div className="flex gap-1.5 shrink-0">
                          {i === 0 && (
                            <button onClick={serveNext}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-green-500
                                         hover:bg-green-600 rounded-lg transition-colors">
                              Serve
                            </button>
                          )}
                          <button onClick={() => setRemoveId(q.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-500 border border-red-200
                                       hover:bg-red-50 rounded-lg transition-colors">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Served today ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#0D1B4B]">Served Today</h2>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {served.length} done
                </span>
              </div>
              {served.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2 opacity-40">📋</div>
                  <div className="text-sm">No patients served yet</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {served.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center
                                      text-green-600 text-sm font-bold shrink-0">✓</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{s.name}</div>
                        <div className="text-xs text-gray-400">Served at {s.servedAt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Remove confirm modal ── */}
      {removeId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setRemoveId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="bg-[#2B4ACB] px-7 py-5">
              <h2 className="text-white text-lg font-bold">Remove Patient?</h2>
              <p className="text-white/70 text-sm mt-0.5">This will remove them from the queue.</p>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to remove{' '}
                <strong className="text-gray-800">{queue.find(q => q.id === removeId)?.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRemoveId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600
                             border border-gray-300 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmRemove}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                             bg-red-500 hover:bg-red-600 transition-colors">
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
