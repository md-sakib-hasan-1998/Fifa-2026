import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const WatchButton = ({ match, onLinkPosted }) => {
  const { isLoggedIn, isAdminOrMod } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing]   = useState(false)
  const [linkVal, setLinkVal]   = useState(match?.streamLink?.url || '')
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')

  const isLive    = match?.status === 'live' || match?.status === 'halftime'
  const hasLink   = !!match?.streamLink?.url

  // Hide entirely if match is not live
  if (!isLive) return null

  // ── Guest: show button, clicking goes to login ──────────
  if (!isLoggedIn) {
    return (
      <div className="mt-3 flex justify-center">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 bg-scarlet/20 hover:bg-scarlet/30
                     border border-scarlet/40 text-scarlet font-bold text-sm px-5 py-2
                     rounded-full transition-all duration-150 animate-fade-in"
        >
          <span className="w-2 h-2 rounded-full bg-scarlet animate-ping-slow" />
          WATCH LIVE — Sign In to Watch
        </button>
      </div>
    )
  }

  // ── Admin / Moderator: show button + link editor ────────
  if (isAdminOrMod) {
    const handleSave = async () => {
      setSaving(true); setError('')
      try {
        await api.put(`/api/matches/${match._id}/stream`, { url: linkVal.trim() })
        setEditing(false)
        onLinkPosted?.()
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to save link')
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="mt-3 animate-fade-in">
        {editing ? (
          <div className="flex flex-col gap-2 px-2">
            <input
              value={linkVal}
              onChange={(e) => setLinkVal(e.target.value)}
              placeholder="Paste stream URL here…"
              className="input text-sm"
            />
            {error && <p className="text-scarlet text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 flex-1">
                {saving ? 'Saving…' : 'Save Link'}
              </button>
              <button onClick={() => { setEditing(false); setError('') }} className="btn-ghost text-xs py-1.5">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {hasLink && (
              <a
                href={match.streamLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-scarlet/20 hover:bg-scarlet/30
                           border border-scarlet/40 text-scarlet font-bold text-sm px-5 py-2
                           rounded-full transition-all duration-150"
              >
                <span className="w-2 h-2 rounded-full bg-scarlet animate-ping-slow" />
                WATCH LIVE
              </a>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-ice/40 hover:text-pitch border border-white/10
                         hover:border-pitch/30 px-3 py-2 rounded-full transition-colors"
            >
              {hasLink ? '✏️ Edit Link' : '+ Add Stream Link'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Approved user: show watch button if link exists ─────
  if (!hasLink) return null

  return (
    <div className="mt-3 flex justify-center animate-fade-in">
      <a
        href={match.streamLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-scarlet/20 hover:bg-scarlet/30
                   border border-scarlet/40 text-scarlet font-bold text-sm px-5 py-2
                   rounded-full transition-all duration-150"
      >
        <span className="w-2 h-2 rounded-full bg-scarlet animate-ping-slow" />
        WATCH LIVE
      </a>
    </div>
  )
}

export default WatchButton
