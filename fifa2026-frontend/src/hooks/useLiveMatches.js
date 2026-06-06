import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'

export const useLiveMatches = () => {
  const { socket } = useSocket()
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)

  const fetchMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/api/matches')
      setMatches(data.matches)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMatches() }, [fetchMatches])

  // Listen for real-time score updates from the Pi via the backend
  useEffect(() => {
    if (!socket) return

    const handleScoreUpdate = (update) => {
      setMatches((prev) =>
        prev.map((m) =>
          m._id === update.matchId || m.apiMatchId === update.apiMatchId
            ? {
                ...m,
                score:  update.score,
                status: update.status,
                minute: update.minute,
                goals:  update.goals,
                cards:  update.cards,
              }
            : m
        )
      )
    }

    const handleStreamLink = (update) => {
      setMatches((prev) =>
        prev.map((m) =>
          m._id === update.matchId
            ? { ...m, streamLink: { ...m.streamLink, url: update.hasLink ? m.streamLink?.url : null } }
            : m
        )
      )
    }

    socket.on('scoreUpdateGlobal', handleScoreUpdate)
    socket.on('streamLinkUpdated', handleStreamLink)

    return () => {
      socket.off('scoreUpdateGlobal', handleScoreUpdate)
      socket.off('streamLinkUpdated', handleStreamLink)
    }
  }, [socket])

  return { matches, loading, error, refetch: fetchMatches }
}
