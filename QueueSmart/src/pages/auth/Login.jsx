import { useState } from 'react'

function validate(values) {
  const errors = {}
  if (!values.email.trim())
    errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter a valid email address.'
  if (!values.password)
    errors.password = 'Password is required.'
  else if (values.password.length < 6)
    errors.password = 'Password must be at least 6 characters.'
  return errors
}

export default function Login({ onLogin, onGoRegister }) {
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(field, val) {
    setValues(v => ({ ...v, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrors({ password: data.message || 'Invalid email or password.' })
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      onLogin(data.user.role)

    } catch (err) {
      setErrors({ password: 'Could not connect to server. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-inter">

      {/* Left: Brand panel */}
      <div className="hidden md:flex flex-col justify-between px-12 py-12
                      bg-gradient-to-br from-[#0D1B4B] via-[#2B4ACB] to-[#4C6EE8]
                      relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/[0.04]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl">
            🏥
          </div>
          <span className="text-white text-xl font-extrabold tracking-tight">QueueSmart</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-4">
            Skip the wait.<br />
            <span className="text-white/50">Not the care.</span>
          </h2>
          <p className="text-white/70 text-[15px] leading-relaxed max-w-sm">
            Real-time clinic queue management for patients and staff.
            Know your position, get notified when it is your turn.
          </p>
        </div>

        <ul className="relative z-10 flex flex-col gap-3">
          {[
            { icon: '✓', text: 'Live queue position and wait time' },
            { icon: '✓', text: 'Notifications before your turn' },
            { icon: '✓', text: 'Admin tools for clinic staff' },
          ].map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-white/80 text-sm font-medium">
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center
                     text-white font-bold shrink-0">
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Form panel */}
      <div className="flex items-center justify-center px-6 py-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#2B4ACB] flex items-center justify-center text-xl">🏥</div>
            <span className="text-[#0D1B4B] text-xl font-extrabold">QueueSmart</span>
          </div>

          <div className="mb-7">
            <h1 className="text-[#0D1B4B] text-2xl font-extrabold tracking-tight mb-1">
              Welcome back
            </h1>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={e => set('email', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg text-sm border bg-gray-50
                            text-gray-800 outline-none transition-all duration-150
                            focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                            ${errors.email ? 'border-red-500 bg-white' : 'border-gray-300'}`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={e => set('password', e.target.value)}
                  className={`w-full px-4 pr-10 py-2.5 rounded-lg text-sm border bg-gray-50
                              text-gray-800 outline-none transition-all duration-150
                              focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                              ${errors.password ? 'border-red-500 bg-white' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors text-sm font-medium"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#2B4ACB] hover:bg-[#1f37a0] active:scale-[.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-white text-[15px] font-bold tracking-wide transition-all duration-150
                         shadow-lg shadow-[#2B4ACB]/30"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5 text-gray-400 text-xs font-medium">
            <div className="flex-1 h-px bg-gray-200" />
            or
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onGoRegister}
              className="text-[#2B4ACB] font-bold hover:text-[#1f37a0] hover:underline transition-colors"
            >
              Register here
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}