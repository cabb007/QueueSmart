import { useState } from 'react'

const INITIAL_SERVICES = [
  { id: 1, name: 'General Check-Up',        desc: 'Routine health assessment and vital signs check.',         duration: 15, priority: 'medium', status: 'open'   },
  { id: 2, name: 'Blood Draw / Lab Work',   desc: 'Blood sample collection for laboratory analysis.',         duration: 10, priority: 'low',    status: 'open'   },
  { id: 3, name: 'Specialist Consultation', desc: 'Appointment with a specialist for focused care.',          duration: 30, priority: 'high',   status: 'open'   },
  { id: 4, name: 'Prescription Refill',     desc: 'Routine medication renewal and pharmacist review.',        duration: 8,  priority: 'low',    status: 'closed' },
  { id: 5, name: 'Urgent Care',             desc: 'Immediate attention for acute, non-emergency conditions.', duration: 20, priority: 'high',   status: 'open'   },
]

const EMPTY = { name: '', desc: '', duration: '', priority: 'medium' }

function validate(values) {
  const errors = {}
  if (!values.name.trim())            errors.name     = 'Service name is required.'
  else if (values.name.length > 100)  errors.name     = 'Max 100 characters.'
  if (!values.desc.trim())            errors.desc     = 'Description is required.'
  if (!values.duration)               errors.duration = 'Duration is required.'
  else if (isNaN(values.duration) || Number(values.duration) < 1)
                                      errors.duration = 'Must be a positive number.'
  return errors
}

const PRIORITY_STYLES = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

export default function ServiceManagement() {
  const [services, setServices] = useState(INITIAL_SERVICES)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [values,   setValues]   = useState(EMPTY)
  const [errors,   setErrors]   = useState({})
  const [deleteId, setDeleteId] = useState(null)

  function openAdd() {
    setEditing(null); setValues(EMPTY); setErrors({}); setModal(true)
  }
  function openEdit(svc) {
    setEditing(svc.id)
    setValues({ name: svc.name, desc: svc.desc, duration: String(svc.duration), priority: svc.priority })
    setErrors({}); setModal(true)
  }
  function set(field, val) {
    setValues(v => ({ ...v, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }
  function handleSave() {
    const errs = validate(values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (editing) {
      setServices(prev => prev.map(s => s.id === editing
        ? { ...s, name: values.name, desc: values.desc, duration: Number(values.duration), priority: values.priority }
        : s))
    } else {
      setServices(prev => [...prev, {
        id: Date.now(), name: values.name, desc: values.desc,
        duration: Number(values.duration), priority: values.priority, status: 'open',
      }])
    }
    setModal(false)
  }
  function handleDelete() {
    setServices(prev => prev.filter(s => s.id !== deleteId))
    setDeleteId(null)
  }
  function toggleStatus(id) {
    setServices(prev => prev.map(s => s.id === id
      ? { ...s, status: s.status === 'open' ? 'closed' : 'open' } : s))
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter">

    

      {/* ── Page content ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">

          {/* Blue header banner */}
          <div className="bg-[#2B4ACB] px-8 py-6">
            <h1 className="text-white text-2xl font-bold">Service Management</h1>
            <p className="text-white/75 text-sm mt-1">Create, edit, and manage clinic services.</p>
          </div>

          {/* Card body */}
          <div className="px-8 py-6">

            {/* Add button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={openAdd}
                className="px-5 py-2.5 bg-[#2B4ACB] hover:bg-[#1f37a0] text-white text-sm
                           font-semibold rounded-lg transition-colors shadow-sm"
              >
                + Add Service
              </button>
            </div>

            {/* Services list */}
            <div className="flex flex-col gap-4">
              {services.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{s.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[s.priority]}`}>
                          {s.priority}
                        </span>
                        <button
                          onClick={() => toggleStatus(s.id)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors
                                      ${s.status === 'open'
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {s.status === 'open' ? '● Open' : '● Closed'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{s.desc}</p>
                      <p className="text-xs text-gray-400">Expected duration: <strong className="text-gray-600">{s.duration} min</strong></p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#2B4ACB] border border-[#2B4ACB]
                                   rounded-lg hover:bg-[#EEF1FB] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300
                                   rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
               onClick={e => e.stopPropagation()}>

            {/* Modal blue header */}
            <div className="bg-[#2B4ACB] px-7 py-5">
              <h2 className="text-white text-lg font-bold">
                {editing ? 'Edit Service' : 'Create New Service'}
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                {editing ? 'Update the service details below.' : 'Fill in the details to add a new clinic service.'}
              </p>
            </div>

            <div className="px-7 py-6">
              {/* Service Name */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. General Check-Up"
                  value={values.name}
                  onChange={e => set('name', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm border text-gray-800 outline-none
                              transition-all focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                              ${errors.name ? 'border-red-400 bg-white' : 'border-gray-300 bg-gray-50'}`}
                />
                <div className="flex justify-between mt-1">
                  {errors.name ? <p className="text-xs text-red-500">⚠ {errors.name}</p> : <span />}
                  <span className="text-xs text-gray-400">{values.name.length}/100</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Describe what this service involves..."
                  value={values.desc}
                  onChange={e => set('desc', e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm border text-gray-800 outline-none
                              transition-all resize-none focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                              ${errors.desc ? 'border-red-400 bg-white' : 'border-gray-300 bg-gray-50'}`}
                />
                {errors.desc && <p className="text-xs text-red-500 mt-1">⚠ {errors.desc}</p>}
              </div>

              {/* Duration + Priority */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Duration (min) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    min="1"
                    value={values.duration}
                    onChange={e => set('duration', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm border text-gray-800 outline-none
                                transition-all focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                                ${errors.duration ? 'border-red-400 bg-white' : 'border-gray-300 bg-gray-50'}`}
                  />
                  {errors.duration && <p className="text-xs text-red-500 mt-1">⚠ {errors.duration}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={values.priority}
                    onChange={e => set('priority', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 bg-gray-50
                               text-gray-800 outline-none appearance-none cursor-pointer
                               focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600
                             border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                             bg-[#2B4ACB] hover:bg-[#1f37a0] transition-colors shadow-sm"
                >
                  {editing ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="bg-[#2B4ACB] px-7 py-5">
              <h2 className="text-white text-lg font-bold">Delete Service?</h2>
              <p className="text-white/70 text-sm mt-0.5">This action cannot be undone.</p>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete <strong className="text-gray-800">{services.find(s => s.id === deleteId)?.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600
                             border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                             bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
