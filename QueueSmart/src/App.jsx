import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import Login             from './pages/auth/Login'
import Register          from './pages/auth/Register'
import ServiceManagement from './pages/admin/ServiceManagement'
import QueueManagement   from './pages/admin/QueueManagement'
import QueueStatus       from './QueueStatus'
import JoinQueue         from './JoinQueue'
import QueueHistory      from './QueueHistory'

function LoginPage() {
  const navigate = useNavigate()
  return <Login onLogin={() => navigate('/services')} onGoRegister={() => navigate('/register')} />
}

function RegisterPage() {
  const navigate = useNavigate()
  return <Register onGoLogin={() => navigate('/login')} />
}

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
      onClick={() => navigate('/login')}
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

export default function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/services" element={<AdminLayout><ServiceManagement /></AdminLayout>} />
      <Route path="/queue"    element={<AdminLayout><QueueManagement /></AdminLayout>} />
      <Route path="/queuestatus" element={<QueueStatus />} /> 
      <Route path="/joinqueue" element={<JoinQueue />} />
      <Route path="/queuehistory" element={<QueueHistory />} />
    </Routes>
  )
}