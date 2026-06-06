import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { roleBadgeClass, cap } from '../utils/helpers'
import api from '../utils/api'
import Spinner from '../components/common/Spinner'

const Profile = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [form,    setForm]    = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) { navigate('/login'); return null }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleChangePassword = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (form.newPassword !== form.confirm) { setError('New passwords do not match'); return }
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.put('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setSuccess('Password changed successfully!')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <div className="mb-8 animate-fade-in">
          <p className="section-subtitle mb-1">Account</p>
          <h1 className="section-title">MY PROFILE</h1>
        </div>

        {/* Profile card */}
        <div className="card p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-pitch/20 flex items-center justify-center font-display text-3xl text-pitch">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-display text-2xl text-ice tracking-wide">{user.name}</p>
              <span className={`badge-role text-xs ${roleBadgeClass(user.role)}`}>{cap(user.role)}</span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {[
              { label: 'Email',   val: user.email   },
              { label: 'Phone',   val: user.phone   },
              { label: 'Country', val: user.country },
              { label: 'Status',  val: cap(user.status) },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/5">
                <span className="text-ice/40">{label}</span>
                <span className="text-ice/80">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change password */}
        <div className="card p-6 animate-slide-up stagger-2">
          <h2 className="font-display text-xl text-ice tracking-wide mb-4">CHANGE PASSWORD</h2>

          {error   && <div className="bg-scarlet/10 border border-scarlet/20 text-scarlet text-sm px-4 py-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-pitch/10 border border-pitch/20 text-pitch text-sm px-4 py-3 rounded mb-4">{success}</div>}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="label">Current Password</label>
              <input name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">New Password</label>
              <input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} className="input" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Spinner size="sm" /> : 'Update Password'}
            </button>
          </form>
        </div>

        <button
          onClick={() => { logout(); navigate('/') }}
          className="btn-danger w-full mt-4"
        >
          Sign Out
        </button>
      </div>
    </Layout>
  )
}

export default Profile
