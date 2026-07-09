import { useState } from 'react'

const SERVICES = [
  { id: 1, name: 'General Check-Up',        duration: 15 },
  { id: 2, name: 'Blood Draw / Lab Work',   duration: 10 },
  { id: 3, name: 'Specialist Consultation', duration: 30 },
  { id: 5, name: 'Urgent Care',             duration: 20 },
]

const INITIAL_QUEUE = [
  { pos: 1, id: 'Q-001', name: 'Maria Santos',  joined: '9:02 AM', status: 'ready'   },
  { pos: 2, id: 'Q-002', name: 'James Okonkwo', joined: '9:10 AM', status: 'waiting' },
  { pos: 3, id: 'Q-003', name: 'Linda Pham',    joined: '9:18 AM', status: 'waiting' },
  { pos: 4, id: 'Q-004', name: 'Carlos Rivera', joined: '9:25 AM', status: 'waiting' },
  { pos: 5, id: 'Q-005', name: 'Emily Zhao',    joined: '9:31 AM', status: 'waiting' },
]

export default function QueueManagement() {
  const [selectedSvc, setSelectedSvc] = useState(1)
  const [queue,       setQueue]       = useState(INITIAL_QUEUE)
  const [served,      setServed]      = useState([])
  const [removeId,    setRemoveId]    = useState(null)

  const svc = SERVICES.find(s => s.id === selectedSvc)

  function serveNext() {
    if (!queue.length) return
    const next = queue[0]
    setServed(prev => [{
      ...next,
      servedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev])
    setQueue(prev => prev.slice(1).map((p, i) => ({ ...p, pos: i + 1 })))
  }

  function confirmRemove() {
    setQueue(prev => prev.filter(p => p.id !== removeId).map((p, i) => ({ ...p, pos: i + 1 })))
    setRemoveId(null)
  }

  function getWait(idx) {
    const mins = idx * (svc?.duration || 15)
    return idx === 0 ? 'Now' : `~${mins} min`
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter">

      

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">

          {/* ── Blue header banner ── */}
          <div className="bg-[#2B4ACB] px-8 py-6">
            <h1 className="text-white text-2xl font-bold">Queue Management</h1>
            <p className="text-white/75 text-sm mt-1">Monitor and manage the live patient queue.</p>
          </div>

          {/* ── Card body ── */}
          <div className="px-8 py-6">

            {/* Select Service */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Select Service
              </label>
              <p className="text-sm text-gray-400 mb-3">Choose a service to view and manage its queue.</p>
              <select
                value={selectedSvc}
                onChange={e => { setSelectedSvc(Number(e.target.value)); setQueue(INITIAL_QUEUE); setServed([]) }}
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 bg-white
                           text-gray-700 outline-none appearance-none cursor-pointer font-medium
                           focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10 transition-all"
              >
                {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Queue stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'In Queue',     val: queue.length                                          },
                { label: 'Est. Total',   val: queue.length ? `~${queue.length * (svc?.duration || 15)} min` : '—' },
                { label: 'Served Today', val: served.length                                         },
              ].map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-extrabold text-[#2B4ACB]">{s.val}</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Next patient + serve button */}
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Patient</p>
                  <p className="text-lg font-bold text-gray-800">
                    {queue[0] ? queue[0].name : 'No patients waiting'}
                  </p>
                  {queue[0] && (
                    <p className="text-sm text-gray-400 mt-0.5">{queue[0].id} · Joined {queue[0].joined}</p>
                  )}
                </div>
                <button
                  onClick={serveNext}
                  disabled={queue.length === 0}
                  className="px-5 py-2.5 bg-[#2B4ACB] hover:bg-[#1f37a0] disabled:opacity-40
                             disabled:cursor-not-allowed text-white text-sm font-semibold
                             rounded-lg transition-colors shadow-sm"
                >
                  ✔ Serve Next
                </button>
              </div>
            </div>

            {/* Queue list */}
            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Current Queue
                <span className="text-xs font-normal text-gray-400 ml-2">
                  *Queue positions update automatically when a patient is served.
                </span>
              </p>

              {queue.length === 0 ? (
                <div className="border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                  <div className="text-4xl mb-2 opacity-40">🎉</div>
                  <div className="font-semibold">Queue is empty</div>
                  <div className="text-sm mt-1">No patients currently waiting</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {queue.map((q, i) => (
                    <div
                      key={q.id}
                      className={`border rounded-xl p-4 flex items-center gap-4 transition-colors
                                  ${i === 0 ? 'border-[#2B4ACB] bg-[#EEF1FB]' : 'border-gray-200 bg-white'}`}
                    >
                      {/* Position number */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                       font-extrabold text-lg shrink-0
                                       ${i === 0 ? 'bg-[#2B4ACB] text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {q.pos}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm">{q.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{q.id} · Joined {q.joined}</div>
                      </div>

                      {/* Wait time */}
                      <div className="text-center shrink-0">
                        <div className="text-sm font-bold text-gray-700">{getWait(i)}</div>
                        <div className="text-xs text-gray-400">wait</div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
                                        ${q.status === 'ready'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-blue-100 text-blue-700'}`}>
                        {q.status === 'ready' ? '● Ready' : '● Waiting'}
                      </span>

                      {/* Remove button */}
                      <button
                        onClick={() => setRemoveId(q.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700
                                   border border-red-200 hover:border-red-400 px-2.5 py-1
                                   rounded-lg transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Served log */}
            {served.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Served Today</p>
                <div className="flex flex-col gap-2">
                  {served.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center
                                      text-green-600 font-bold text-sm shrink-0">✓</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.id} · Served at {s.servedAt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <strong className="text-gray-800">{queue.find(q => q.id === removeId)?.name}</strong> from the queue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600
                             border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                             bg-red-500 hover:bg-red-600 transition-colors"
                >
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
