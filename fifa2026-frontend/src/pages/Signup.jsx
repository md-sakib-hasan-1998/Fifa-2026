import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Spinner from '../components/common/Spinner'

const Signup = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: '', password: '', confirm: '' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        country:  form.country,
        password: form.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm animate-slide-up">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="font-display text-3xl text-ice tracking-wide mb-3">ALMOST THERE</h2>
          <p className="text-ice/50 text-sm leading-relaxed mb-6">
            Your account is pending approval. An admin or moderator will review and approve it shortly.
            You'll be able to sign in once approved.
          </p>
          <Link to="/" className="btn-secondary">← Back to Scores</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pitch/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-5xl">🌍</span>
          <h1 className="font-display text-4xl text-ice tracking-wider mt-2">JOIN</h1>
          <p className="text-ice/30 text-sm mt-1">FIFA World Cup 2026</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-scarlet/10 border border-scarlet/20 text-scarlet text-sm px-4 py-3 rounded-lg mb-4 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Your name" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="input" placeholder="+1 555 000 0000" required />
            </div>
            <div>
              <label className="label">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="input" placeholder="e.g. Bangladesh" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input" placeholder="Min 6 characters" required />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} className="input" placeholder="Repeat password" required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-1">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-ice/30 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-pitch hover:text-pitch-400 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
