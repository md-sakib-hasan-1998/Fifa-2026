// Detect whether the viewer is in Bangladesh (UTC+6, Asia/Dhaka)
const _userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const _isBD   = _userTz === 'Asia/Dhaka'

// Format a kickoff time in the viewer's local timezone.
// Bangladeshi users see "BD Time"; everyone else sees their local tz abbreviation.
export const formatMatchTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  if (_isBD) {
    const time = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${time} BD Time`
  }
  // Other countries — use their local timezone
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  return time  // already includes abbreviation like "4:30 PM IST"
}

export const formatMatchDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  const tz = _isBD ? 'Asia/Dhaka' : undefined   // undefined = local tz
  return d.toLocaleDateString('en-US', {
    ...(tz ? { timeZone: tz } : {}),
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}


// Render star rating as filled/empty stars string (used by StarRating component)
export const starsArray = (rating = 3) =>
  Array.from({ length: 5 }, (_, i) => i < rating)

// Map role → badge colour classes
export const roleBadgeClass = (role) => {
  const map = {
    admin:     'bg-gold/20 text-gold border border-gold/30',
    moderator: 'bg-pitch/20 text-pitch border border-pitch/30',
    user:      'bg-white/10 text-ice/60 border border-white/10',
  }
  return map[role] || map.user
}

// Map status → badge component name
export const statusBadgeClass = (status) => {
  const map = {
    live:      'badge-live',
    halftime:  'badge-live',
    finished:  'badge-finished',
    scheduled: 'badge-scheduled',
    postponed: 'badge-finished',
  }
  return map[status] || 'badge-scheduled'
}

// Capitalise first letter
export const cap = (str = '') => str.charAt(0).toUpperCase() + str.slice(1)
