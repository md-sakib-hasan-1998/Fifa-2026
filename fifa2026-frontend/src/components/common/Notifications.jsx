import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../../context/SocketContext'

let notifId = 0

const NotificationItem = ({ notif, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notif.id), 6000)
    return () => clearTimeout(t)
  }, [notif.id, onDismiss])

  return (
    <div
      className="flex items-start gap-3 bg-navy-800/95 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-2xl max-w-sm w-full animate-slide-up cursor-pointer hover:border-pitch/30 transition-colors"
      onClick={() => onDismiss(notif.id)}
    >
      <span className="text-2xl shrink-0">{notif.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ice/40 uppercase tracking-widest font-medium mb-0.5">
          {notif.label}
        </p>
        <p className="text-sm text-ice font-semibold leading-snug">{notif.title}</p>
        {notif.body && (
          <p className="text-xs text-ice/55 mt-1 leading-relaxed">{notif.body}</p>
        )}
      </div>
      <button className="text-ice/20 hover:text-ice/60 transition-colors shrink-0 text-lg leading-none mt-0.5">
        ×
      </button>
    </div>
  )
}

const Notifications = () => {
  const { socket } = useSocket()
  const [notifs, setNotifs] = useState([])

  const push = useCallback((n) => {
    setNotifs(prev => {
      if (prev.length >= 5) prev = prev.slice(1)
      return [...prev, { ...n, id: ++notifId }]
    })
  }, [])

  const dismiss = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleScore = (update) => {
      const home = update.homeTeam?.shortName || update.homeTeam?.name || 'Home'
      const away = update.awayTeam?.shortName || update.awayTeam?.name || 'Away'
      const scoreH = update.score?.home ?? 0
      const scoreA = update.score?.away ?? 0

      if (update.status === 'live' || update.status === 'halftime') {
        push({
          icon: '⚽',
          label: update.status === 'halftime' ? 'Half Time' : `${update.minute || 0}'`,
          title: `${home}  ${scoreH} – ${scoreA}  ${away}`,
          body: update.status === 'halftime' ? 'Half time whistle blown' : 'Score update!',
        })
      }
    }

    const handleRefresh = () => {
      push({
        icon: '🔄',
        label: 'Data Updated',
        title: 'Match data has been refreshed',
        body: null,
      })
    }

    socket.on('scoreUpdate', handleScore)
    socket.on('dataRefreshed', handleRefresh)
    return () => {
      socket.off('scoreUpdate', handleScore)
      socket.off('dataRefreshed', handleRefresh)
    }
  }, [socket, push])

  if (notifs.length === 0) return null

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end">
      {notifs.map(n => (
        <NotificationItem key={n.id} notif={n} onDismiss={dismiss} />
      ))}
    </div>
  )
}

export default Notifications
