import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
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