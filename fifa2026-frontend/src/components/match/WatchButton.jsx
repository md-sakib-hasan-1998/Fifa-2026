import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

/* ─────────────────────────────────────────────────────────────
   WatchButton — supports multiple stream links.
   • Admin/Mod: can add/remove links via an inline editor.
   • Logged-in user: clicking "WATCH LIVE" opens a popup chooser.
   • Guest: redirected to login.
   ───────────────────────────────────────────────────────────── */
const WatchButton = ({ match, onLinkPosted }) => {
  const { isLoggedIn, isAdminOrMod } = useAuth()
  const navigate = useNavigate()

  // ── Admin editor state ──────────────────────────────────
  const [editing,  setEditing]  = useState(false)
  const [rows,     setRows]     = useState(
    () => (match?.streamLinks?.length ? match.streamLinks.map(l => ({ label: l.label || '', url: l.url || '' })) : [{ label: '', url: '' }])
  )
  const [saving,   setSaving]   = useState(false)
  const [adminErr, setAdminErr] = useState('')

  // ── User popup state ────────────────────────────────────
  const [popup,    setPopup]    = useState(false)
  const popupRef               = useRef(null)

  const links      = match?.streamLinks || []
  const hasLinks   = links.length > 0
  const isScheduled = match?.status === 'scheduled'

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopup(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popup])

  // ── Decide visibility ────────────────────────────────────
  // Only show to admins (always) or logged-in users with links
  if (!isAdminOrMod && !hasLinks) return null

  // ── Guest: redirect to login ─────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // ADMIN / MODERATOR UI
  // ──────────────────────────────────────────────────────────
  if (isAdminOrMod) {
    const addRow    = () => setRows(r => [...r, { label: '', url: '' }])
    const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i))
    const setField  = (i, field, val) =>
      setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

    const handleSave = async () => {
      setSaving(true); setAdminErr('')
      try {
        await api.put(`/api/matches/${match._id}/stream`, {
          links: rows.filter(r => r.url.trim())
        })
        setEditing(false)
        onLinkPosted?.()
      } catch (e) {
        setAdminErr(e.response?.data?.message || 'Failed to save links')
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="mt-3 animate-fade-in">
        {isScheduled && !editing && (
          <p className="text-[10px] text-ice/30 text-center mb-2 uppercase tracking-wider">
            Match scheduled — pre-add stream links
          </p>
        )}

        {editing ? (
          <div className="flex flex-col gap-2 px-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={row.label}
                  onChange={e => setField(i, 'label', e.target.value)}
                  placeholder={`Label (e.g. Link ${i + 1})`}
                  className="input text-sm w-28 shrink-0"
                />
                <input
                  value={row.url}
                  onChange={e => setField(i, 'url', e.target.value)}
                  placeholder="Stream URL…"
                  className="input text-sm flex-1"
                />
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="text-scarlet/60 hover:text-scarlet text-lg leading-none px-1"
                    title="Remove"
                  >×</button>
                )}
              </div>
            ))}
            {adminErr && <p className="text-scarlet text-xs">{adminErr}</p>}
            <div className="flex gap-2 flex-wrap">
              <button onClick={addRow} className="btn-ghost text-xs py-1.5 flex-1">
                + Add Link
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 flex-1">
                {saving ? 'Saving…' : 'Save Links'}
              </button>
              <button onClick={() => { setEditing(false); setAdminErr('') }} className="btn-ghost text-xs py-1.5">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {hasLinks && (
              <button
                onClick={() => setPopup(true)}
                className="flex items-center gap-2 bg-scarlet/20 hover:bg-scarlet/30
                           border border-scarlet/40 text-scarlet font-bold text-sm px-5 py-2
                           rounded-full transition-all duration-150"
              >
                <span className="w-2 h-2 rounded-full bg-scarlet animate-ping-slow" />
                WATCH LIVE
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-ice/40 hover:text-pitch border border-white/10
                         hover:border-pitch/30 px-3 py-2 rounded-full transition-colors"
            >
              {hasLinks ? '✏️ Edit Links' : '+ Add Stream Links'}
            </button>
          </div>
        )}

        {/* Popup chooser (shared between admin & user) */}
        {popup && hasLinks && (
          <StreamPopup links={links} onClose={() => setPopup(false)} ref={popupRef} />
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // LOGGED-IN USER UI
  // ──────────────────────────────────────────────────────────
  if (!hasLinks) return null

  // If only one link, open it directly
  const handleWatch = () => {
    if (links.length === 1) {
      window.open(links[0].url, '_blank', 'noopener,noreferrer')
    } else {
      setPopup(true)
    }
  }

  return (
    <div className="mt-3 flex justify-center animate-fade-in relative">
      <button
        onClick={handleWatch}
        className="flex items-center gap-2 bg-scarlet/20 hover:bg-scarlet/30
                   border border-scarlet/40 text-scarlet font-bold text-sm px-5 py-2
                   rounded-full transition-all duration-150"
      >
        <span className="w-2 h-2 rounded-full bg-scarlet animate-ping-slow" />
        WATCH LIVE
      </button>

      {popup && (
        <StreamPopup links={links} onClose={() => setPopup(false)} popupRef={popupRef} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   StreamPopup — floating chooser showing all available links
   ───────────────────────────────────────────────────────────── */
const StreamPopup = ({ links, onClose, popupRef }) => (
  <div
    ref={popupRef}
    className="absolute z-50 bottom-12 left-1/2 -translate-x-1/2 w-56
               bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl
               shadow-black/60 overflow-hidden animate-fade-in"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <p className="text-xs font-semibold text-ice/70 uppercase tracking-widest">Choose Stream</p>
      <button onClick={onClose} className="text-ice/30 hover:text-ice text-lg leading-none">×</button>
    </div>

    {/* Links */}
    <div className="flex flex-col py-1">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5
                     text-sm text-ice/80 hover:text-ice transition-colors group"
        >
          {/* Pulsing dot */}
          <span className="w-2 h-2 rounded-full bg-scarlet group-hover:animate-ping-slow shrink-0" />
          <span className="font-medium truncate">{link.label || `Link ${i + 1}`}</span>
          {/* Arrow */}
          <span className="ml-auto text-ice/30 group-hover:text-scarlet transition-colors text-xs">→</span>
        </a>
      ))}
    </div>
  </div>
)

export default WatchButton
