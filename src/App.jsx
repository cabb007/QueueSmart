import { useState } from 'react'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

export default function App() {
  const [screen, setScreen] = useState('login')
  if (screen === 'login')    return <Login onLogin={() => {}} onGoRegister={() => setScreen('register')} />
  if (screen === 'register') return <Register onGoLogin={() => setScreen('login')} />
}
