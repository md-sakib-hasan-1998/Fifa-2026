const BDT = { timeZone: 'Asia/Dhaka' }

// Format a kickoff time in BDT (Bangladesh Standard Time, UTC+6)
export const formatMatchTime = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { ...BDT, hour: '2-digit', minute: '2-digit' })
}

export const formatMatchDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { ...BDT, weekday: 'short', month: 'short', day: 'numeric' })
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
