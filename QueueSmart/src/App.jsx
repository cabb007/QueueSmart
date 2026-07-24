import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import Login             from './pages/auth/Login'
import Register          from './pages/auth/Register'
import ServiceManagement from './pages/admin/ServiceManagement'
import QueueManagement   from './pages/admin/QueueManagement'
import QueueStatus       from './QueueStatus'
import Landing           from './Landing'
import JoinQueue         from './joinQueue'
import QueueHistory      from './QueueHistory'
import PatientDashboard  from './PatientDashboard'

/* ── Admin nav layout ── */
function AdminLayout({ children }) {
  const navigate = useNavigate()
  return (
    <div>
      <nav className="bg-white border-b border-gray-200 px-8 py-3 flex items-center">
        <span className="text-[#2B4ACB] font-bold text-xl tracking-tight shrink-0">
          QueueSmart
        </span>
        <div className="flex items-center gap-6 ml-8">
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            Service Management
          </NavLink>
          <NavLink
            to="/queue"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            Queue Management
          </NavLink>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              navigate('/login')
            }}
            className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>
      {children}
    </div>
  )
}

/* ── Patient nav layout ── */
function PatientLayout({ children }) {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationError, setNotificationError] = useState("")

  const notificationRef = useRef(null)

  const storedUser = JSON.parse(
    localStorage.getItem('user') || 'null'
  )

  const userId = storedUser?.id

  useEffect(() => {
    if(!userId) {
      return
    }

    async function getNotifications(){
      try {
        const response = await fetch(
          `http://localhost:3001/api/notifications/${userId}`
        )

        if(!response.ok){
          throw new Error(
            `Unable to retrieve notifications: ${response.status}`
          )
        }

        const data = await response.json()

        setNotifications(data.notifications || [])
        setNotificationError('')
      } catch (error) {
        console.error(
          'Notification retrieval failed:', error
        )

        setNotificationError(
          error instanceof Error
            ? error.message
            : 'Unable to retrieve notifications.'
        )
      }
    }

    getNotifications()

    const intervalId = setInterval(
      getNotifications,
      5000
    )

    return () => {
    clearInterval(intervalId)
    }
  }, [userId])

  useEffect(() => {
    function handleOutsideClick(event){
      if (
        notificationRef.current && !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  function formatNotificationDate(dateString) {
    if(!dateString) {
      return ''
    }

    return new Date(dateString).toLocaleString()
  }



  return (
    <div>
      <nav className="bg-white border-b border-gray-200 px-8 py-3 flex items-center">
        <span className="text-[#2B4ACB] font-bold text-xl tracking-tight shrink-0">
          QueueSmart
        </span>
        <div className="flex items-center gap-6 ml-8">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/join"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            Join Queue
          </NavLink>
          <NavLink
            to="/queuestatus"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            Queue Status
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `text-sm font-semibold transition-colors ${isActive ? 'text-[#2B4ACB]' : 'text-gray-500 hover:text-[#2B4ACB]'}`
            }
          >
            History
          </NavLink>
        </div>


        <div className="ml-auto flex items-center gap-4">
          <div
            ref={notificationRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setNotificationsOpen(
                  currentValue => !currentValue
                )
              }
              className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:text-[#2B4ACB] hover:bg-blue-50 transition-colors"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 21h4"
                />
              </svg>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    Notifications
                  </h2>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Recent queue updates
                  </p>
                </div>

                {notificationError && (
                  <div className="px-4 py-3 bg-red-50 text-xs text-red-700 border-b border-red-100">
                    {notificationError}
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-slate-500">
                        No notifications yet.
                      </p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className="px-4 py-3 border-b border-slate-100 last:border-b-0 bg-white"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.message}
                        </p>

                        {notification.estimatedWaitMinutes !==
                          undefined && (
                          <p className="text-xs text-blue-700 mt-1">
                            Estimated wait:{' '}
                            {
                              notification.estimatedWaitMinutes
                            }{' '}
                            minutes
                          </p>
                        )}

                        <p className="text-xs text-slate-400 mt-1">
                          {formatNotificationDate(
                            notification.createdAt
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              navigate('/login')
            }}
            className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
        </button>
        </div>
      </nav>

      {children}
    </div>
  )
}

/* ── Login page — routes based on role ── */
function LoginPage() {
  const navigate = useNavigate()
  function handleLogin(role) {
    if (role === 'admin' || role === 'nurse') {
      navigate('/services')
    } else {
      navigate('/dashboard')
    }
  }
  return <Login onLogin={handleLogin} onGoRegister={() => navigate('/register')} />
}

function RegisterPage() {
  const navigate = useNavigate()
  return <Register onGoLogin={() => navigate('/login')} />
}

export default function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />

      {/* Auth */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Patient routes */}
      <Route path="/dashboard"   element={<PatientLayout><PatientDashboard /></PatientLayout>} />
      <Route path="/join"        element={<PatientLayout><JoinQueue /></PatientLayout>} />
      <Route path="/queuestatus" element={<PatientLayout><QueueStatus /></PatientLayout>} />
      <Route path="/history"     element={<PatientLayout><QueueHistory /></PatientLayout>} />
      <Route path="/queuestatus" element={<PatientLayout><QueueStatus /></PatientLayout>} /> 
      <Route path="/joinqueue" element={<PatientLayout><JoinQueue /></PatientLayout>} />
      <Route path="/queuehistory" element={<PatientLayout><QueueHistory /></PatientLayout>} />

      {/* Admin routes */}
      <Route path="/services" element={<AdminLayout><ServiceManagement /></AdminLayout>} />
      <Route path="/queue"    element={<AdminLayout><QueueManagement /></AdminLayout>} />
    </Routes>
  )
}