import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { roleBadgeClass, cap } from '../utils/helpers'
import api from '../utils/api'
import Spinner from '../components/common/Spinner'

const USER_TABS = ['Pending', 'All Users', 'Moderators', 'Banned']

// ─── DB Tools Panel ───────────────────────────────────────
const DbTools = () => {
  const [msg,     setMsg]     = useState('')
  const [loading, setLoading] = useState('')
  const [confirm, setConfirm] = useState('')   // 'reset' | 'dedup' | ''

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 6000)
  }

  const runTool = async (endpoint, label) => {
    setLoading(label)
    setConfirm('')
    try {
      const { data } = await api.post(endpoint)
      showMsg(data.message)
    } catch (e) {
      showMsg(e.response?.data?.message || `${label} failed`)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      {msg && (
        <div className="bg-pitch/10 border border-pitch/20 text-pitch text-sm px-4 py-3 rounded-xl animate-fade-in">
          ✅ {msg}
        </div>
      )}

      {/* Reset Stats */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-ice">🔄 Reset All Stats</p>
            <p className="text-xs text-ice/40 mt-1">
              Zeros all player goals/assists/cards and clears scheduled match scores.
              <span className="text-scarlet font-medium"> Only run this BEFORE June 11.</span>
            </p>
          </div>
          {confirm !== 'reset' ? (
            <button
              onClick={() => setConfirm('reset')}
              disabled={!!loading}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-scarlet/15 text-scarlet border border-scarlet/30 hover:bg-scarlet/25 transition-colors"
            >
              {loading === 'Reset Stats' ? 'Working…' : 'Reset Stats'}
            </button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => runTool('/api/admin/reset-stats', 'Reset Stats')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-scarlet text-white hover:bg-scarlet/80 transition-colors"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setConfirm('')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-ice/50 hover:text-ice transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dedup Players */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-ice">🧹 Deduplicate Players</p>
            <p className="text-xs text-ice/40 mt-1">
              Finds players with the same name + team and removes duplicates, keeping the document with the most data (photo, API ID, star rating).
            </p>
          </div>
          {confirm !== 'dedup' ? (
            <button
              onClick={() => setConfirm('dedup')}
              disabled={!!loading}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
            >
              {loading === 'Dedup Players' ? 'Working…' : 'Dedup Players'}
            </button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => runTool('/api/admin/dedup-players', 'Dedup Players')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold text-navy hover:bg-gold/80 transition-colors"
              >
                Yes, Dedup
              </button>
              <button
                onClick={() => setConfirm('')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-ice/50 hover:text-ice transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-ice/20 text-center pt-2">
        DB Tools are admin-only. Actions are irreversible — use with care.
      </p>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────
const Admin = () => {
  const { isAdminOrMod, isAdmin, user } = useAuth()
  const navigate = useNavigate()

  const [tab,     setTab]     = useState('Pending')
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [msg,     setMsg]     = useState('')

  if (!isAdminOrMod) { navigate('/'); return null }

  // All tabs including DB Tools (admin only)
  const TABS = isAdmin
    ? ['Pending', 'All Users', 'Moderators', 'Banned', 'DB Tools']
    : ['Pending', 'All Users', 'Moderators', 'Banned']

  const fetchUsers = useCallback(async () => {
    if (tab === 'DB Tools') { setLoading(false); return }
    setLoading(true)
    try {
      const params = {}
      if (tab === 'Pending')    { params.status = 'pending' }
      if (tab === 'Banned')     { params.status = 'banned'  }
      if (tab === 'Moderators') { params.role   = 'moderator' }
      const { data } = await api.get('/api/admin/users', { params })
      setUsers(data.users)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const action = async (url, method = 'put', body = {}) => {
    try {
      const { data } = await api[method](url, body)
      setMsg(data.message)
      fetchUsers()
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(e.response?.data?.message || 'Action failed')
    }
  }

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <p className="section-subtitle mb-1">{isAdmin ? 'Admin Panel' : 'Moderator Panel'}</p>
        <h1 className="section-title">USER MANAGEMENT</h1>
      </div>

      {msg && (
        <div className="bg-pitch/10 border border-pitch/20 text-pitch text-sm px-4 py-3 rounded mb-4 animate-fade-in">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? t === 'DB Tools'
                  ? 'bg-scarlet/20 text-scarlet border border-scarlet/30'
                  : 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/5 text-ice/50 hover:text-ice'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* DB Tools tab */}
      {tab === 'DB Tools' && <DbTools />}

      {/* User management tabs */}
      {tab !== 'DB Tools' && (
        <>
          {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

          {!loading && users.length === 0 && (
            <div className="text-center py-16 text-ice/30">No users in this category</div>
          )}

          {!loading && users.length > 0 && (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u._id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-pitch/10 flex items-center justify-center font-display text-xl text-pitch shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ice truncate">{u.name}</p>
                        <span className={`badge-role text-xs ${roleBadgeClass(u.role)}`}>{cap(u.role)}</span>
                        {u.status === 'banned' && <span className="badge-role text-xs bg-scarlet/20 text-scarlet border border-scarlet/30">Banned</span>}
                      </div>
                      <p className="text-xs text-ice/40 truncate">{u.email}</p>
                      <p className="text-xs text-ice/30">{u.phone} · {u.country}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {/* Approve pending */}
                    {u.status === 'pending' && (
                      <button onClick={() => action(`/api/admin/users/${u._id}/approve`)}
                        className="btn-primary text-xs py-1.5 px-3">
                        ✓ Approve
                      </button>
                    )}

                    {/* Ban / Unban */}
                    {u.status !== 'banned' && u.role !== 'admin' && u._id !== user?._id && (
                      <button onClick={() => action(`/api/admin/users/${u._id}/ban`, 'put', { reason: 'Banned by ' + user?.name })}
                        className="btn-danger text-xs py-1.5 px-3">
                        Ban
                      </button>
                    )}
                    {u.status === 'banned' && (
                      <button onClick={() => action(`/api/admin/users/${u._id}/unban`)}
                        className="btn-secondary text-xs py-1.5 px-3">
                        Unban
                      </button>
                    )}

                    {/* Promote / Demote (admin only) */}
                    {isAdmin && u.role === 'user' && u._id !== user?._id && (
                      <button onClick={() => action(`/api/admin/users/${u._id}/promote`)}
                        className="text-xs px-3 py-1.5 rounded border border-gold/30 text-gold hover:bg-gold/10 transition-colors">
                        → Moderator
                      </button>
                    )}
                    {isAdmin && u.role === 'moderator' && (
                      <button onClick={() => action(`/api/admin/users/${u._id}/demote`)}
                        className="text-xs px-3 py-1.5 rounded border border-white/10 text-ice/50 hover:text-ice transition-colors">
                        → User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

export default Admin
