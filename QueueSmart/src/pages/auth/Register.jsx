import { useState } from 'react'

/* ── Password strength ── */
function getStrength(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8)           s++
  if (/[A-Z]/.test(pw))         s++
  if (/[0-9]/.test(pw))         s++
  if (/[^A-Za-z0-9]/.test(pw))  s++
  return s
}
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = [
  '',
  'bg-red-500',
  'bg-amber-400',
  'bg-amber-400',
  'bg-green-500',
]

function StrengthBar({ password }) {
  const s = getStrength(password)
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all duration-200
                        ${i <= s ? STRENGTH_COLOR[s] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] text-right mt-1 font-medium
                     ${s <= 1 ? 'text-red-500' : s <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
        {STRENGTH_LABEL[s]}
      </p>
    </div>
  )
}

/* ── Validation ── */
function validate(values) {
  const errors = {}
  if (!values.name.trim())
    errors.name = 'Full name is required.'
  else if (values.name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.'
  if (!values.email.trim())
    errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter a valid email address.'
  if (!values.password)
    errors.password = 'Password is required.'
  else if (values.password.length < 8)
    errors.password = 'Password must be at least 8 characters.'
  if (!values.confirm)
    errors.confirm = 'Please confirm your password.'
  else if (values.confirm !== values.password)
    errors.confirm = 'Passwords do not match.'
  return errors
}

/* ── Reusable field ── */
function Field({ id, label, icon, type, placeholder, value, onChange, error, hint, children, autoComplete }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border bg-gray-50
                      text-gray-800 outline-none transition-all duration-150
                      focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                      ${error ? 'border-red-500 bg-white' : 'border-gray-300'}`}
        />
        {children}
      </div>
      {hint}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {error}</p>
      )}
    </div>
  )
}

/* ── Brand panel (reused on both screens) ── */
function BrandPanel({ headline, sub, features }) {
  return (
    <div className="hidden md:flex flex-col justify-between px-12 py-12
                    bg-gradient-to-br from-[#0D1B4B] via-[#2B4ACB] to-[#4C6EE8]
                    relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/[0.04]" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl">🏥</div>
        <span className="text-white text-xl font-extrabold tracking-tight">QueueSmart</span>
      </div>

      <div className="relative z-10">
        <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-4"
            dangerouslySetInnerHTML={{ __html: headline }} />
        <p className="text-white/70 text-[15px] leading-relaxed max-w-sm">{sub}</p>
      </div>

      <ul className="relative z-10 flex flex-col gap-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-white/80 text-sm font-medium">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[15px] shrink-0">
              {f.icon}
            </span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Toggle button (show/hide password) ── */
function ToggleBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-base"
      aria-label={show ? 'Hide' : 'Show'}
    >
      {show ? '🙈' : '👁️'}
    </button>
  )
}

/* ══════════════════════════════════════════════
   REGISTER PAGE
══════════════════════════════════════════════ */
export default function Register({ onGoLogin }) {
  const [values,   setValues]   = useState({ name: '', email: '', password: '', confirm: '', role: 'patient' })
  const [errors,   setErrors]   = useState({})
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [done,     setDone]     = useState(false)

  function set(field, val) {
    setValues(v => ({ ...v, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setDone(true)
  }

  /* ── Success screen ── */
  if (done) return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-inter">
      <BrandPanel
        headline="You're almost <span class='text-white/50'>in.</span>"
        sub="One quick step — verify your email and you're ready to join queues instantly."
        features={[
          { icon: '✅', text: 'Account created successfully' },
          { icon: '📧', text: 'Verification email on its way' },
          { icon: '🚀', text: 'Sign in once verified'         },
        ]}
      />
      <div className="flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center text-4xl mx-auto mb-5">✅</div>
          <h2 className="text-[#0D1B4B] text-2xl font-extrabold mb-3">Account Created!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            A verification link has been sent to{' '}
            <strong className="text-gray-700">{values.email}</strong>.<br />
            Please verify before signing in.
          </p>
          <button
            type="button"
            onClick={onGoLogin}
            className="w-full py-3 rounded-lg bg-[#2B4ACB] hover:bg-[#1f37a0] text-white text-[15px]
                       font-bold transition-all duration-150 shadow-lg shadow-[#2B4ACB]/30"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Register form ── */
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-inter">

      <BrandPanel
        headline="Your health,<br/><span class='text-white/50'>your queue.</span>"
        sub="Create your account and take control of your clinic visits. No more guessing — see your position in real time."
        features={[
          { icon: '🎫', text: 'Real-time queue position' },
          { icon: '🔔', text: 'Alerts before your turn'  },
          { icon: '📋', text: 'Full visit history'        },
        ]}
      />

      <div className="flex items-center justify-center px-6 py-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#2B4ACB] flex items-center justify-center text-xl">🏥</div>
            <span className="text-[#0D1B4B] text-xl font-extrabold">QueueSmart</span>
          </div>

          <div className="mb-7">
            <h1 className="text-[#0D1B4B] text-2xl font-extrabold tracking-tight mb-1">Create an account</h1>
            <p className="text-gray-500 text-sm">Join QueueSmart and manage your clinic visits</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Role */}
            <div className="mb-4">
              <label htmlFor="reg-role" className="block text-sm font-semibold text-gray-700 mb-1.5">
                I am a
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">👤</span>
                <select
                  id="reg-role"
                  value={values.role}
                  onChange={e => set('role', e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border border-gray-300 bg-gray-50
                             text-gray-800 outline-none appearance-none cursor-pointer
                             focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                             transition-all duration-150"
                >
                  <option value="patient">Patient</option>
                  <option value="nurse">Nurse / Staff</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
              </div>
            </div>

            {/* Full name */}
            <Field
              id="reg-name" label="Full name" icon="🪪" type="text"
              placeholder="Jane Smith" autoComplete="name"
              value={values.name} onChange={e => set('name', e.target.value)}
              error={errors.name}
            />

            {/* Email */}
            <Field
              id="reg-email" label="Email address" icon="✉️" type="email"
              placeholder="you@example.com" autoComplete="email"
              value={values.email} onChange={e => set('email', e.target.value)}
              error={errors.email}
            />

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">🔒</span>
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={values.password}
                  onChange={e => set('password', e.target.value)}
                  className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border bg-gray-50
                              text-gray-800 outline-none transition-all duration-150
                              focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                              ${errors.password ? 'border-red-500 bg-white' : 'border-gray-300'}`}
                />
                <ToggleBtn show={showPass} onToggle={() => setShowPass(s => !s)} />
              </div>
              <StrengthBar password={values.password} />
              {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="mb-6">
              <label htmlFor="reg-confirm" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">🔒</span>
                <input
                  id="reg-confirm"
                  type={showConf ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border bg-gray-50
                              text-gray-800 outline-none transition-all duration-150
                              focus:bg-white focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10
                              ${errors.confirm ? 'border-red-500 bg-white' : 'border-gray-300'}`}
                />
                <ToggleBtn show={showConf} onToggle={() => setShowConf(s => !s)} />
              </div>
              {errors.confirm && <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {errors.confirm}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#2B4ACB] hover:bg-[#1f37a0] active:scale-[.98]
                         text-white text-[15px] font-bold tracking-wide transition-all duration-150
                         shadow-lg shadow-[#2B4ACB]/30"
            >
              Create Account →
            </button>

            <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed">
              By creating an account you agree to our{' '}
              <span className="text-[#2B4ACB] font-medium cursor-pointer hover:underline">Terms of Service</span>
              {' '}and{' '}
              <span className="text-[#2B4ACB] font-medium cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 text-gray-400 text-xs font-medium">
            <div className="flex-1 h-px bg-gray-200" />
            already have an account?
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center">
            <button
              type="button"
              onClick={onGoLogin}
              className="text-[#2B4ACB] font-bold text-sm hover:text-[#1f37a0] hover:underline transition-colors"
            >
              Sign in instead
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}
