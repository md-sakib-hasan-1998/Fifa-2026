import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import WatchButton from '../components/match/WatchButton'
import LiveDot from '../components/common/LiveDot'
import Spinner from '../components/common/Spinner'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'
import { formatMatchDate, formatMatchTime } from '../utils/helpers'

const MatchDetail = () => {
  const { id } = useParams()
  const { socket } = useSocket()
  const [match,   setMatch]   = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMatch = () => {
    api.get(`/api/matches/${id}`)
      .then(({ data }) => setMatch(data.match))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMatch()
    // Join the specific match room for targeted updates
    socket?.emit('joinMatch', id)
    return () => socket?.emit('leaveMatch', id)
  }, [id]) // eslint-disable-line

  // Real-time score update
  useEffect(() => {
    if (!socket) return
    const handler = (update) => {
      if (update.matchId === id) {
        setMatch(prev => prev ? { ...prev, ...update } : prev)
      }
    }
    const refreshHandler = () => {
      fetchMatch()
    }
    socket.on('scoreUpdate', handler)
    socket.on('dataRefreshed', refreshHandler)
    return () => {
      socket.off('scoreUpdate', handler)
      socket.off('dataRefreshed', refreshHandler)
    }
  }, [socket, id])

  if (loading) return <Layout><div className="flex justify-center py-40"><Spinner size="lg" /></div></Layout>
  if (!match)  return <Layout><div className="text-center py-20 text-ice/30">Match not found</div></Layout>

  const isLive     = match.status === 'live' || match.status === 'halftime'
  const isFinished = match.status === 'finished'

  return (
    <Layout>
      <Link to="/matches" className="text-ice/30 hover:text-ice text-sm mb-6 inline-flex items-center gap-1">
        ← All Matches
      </Link>

      {/* Stage */}
      <p className="section-subtitle mb-4 animate-fade-in">
        {match.stage}{match.group ? ` · Group ${match.group}` : ''}
      </p>

      {/* Main score card */}
      <div className={`card p-8 mb-6 text-center animate-slide-up ${isLive ? 'border-scarlet/20 shadow-[0_0_40px_rgba(255,23,68,0.1)]' : ''}`}>

        {/* Status */}
        <div className="flex justify-center mb-6">
          {isLive && (
            <span className="badge-live text-base px-4 py-1.5">
              <LiveDot />
              {match.status === 'halftime' ? 'HALF TIME' : `${match.minute || 0}'`}
            </span>
          )}
          {isFinished  && <span className="badge-finished text-sm">Full Time</span>}
          {match.status === 'scheduled' && (
            <span className="badge-scheduled text-sm">
              {formatMatchDate(match.kickoffTime)} · {formatMatchTime(match.kickoffTime)}
            </span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between gap-4 max-w-xl mx-auto">
          <div className="flex-1 text-center">
            {match.homeTeam?.logoUrl
              ? <img src={match.homeTeam.logoUrl} alt="" className="w-20 h-20 object-contain mx-auto mb-2" />
              : <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center font-display text-3xl text-ice/30 mx-auto mb-2">{match.homeTeam?.shortName?.[0]}</div>
            }
            <p className="font-display text-2xl text-ice tracking-wide">{match.homeTeam?.name}</p>
            <p className="text-xs text-ice/30 mt-0.5">{match.homeTeam?.shortName}</p>
          </div>

          <div className="text-center px-4">
            <div className="font-display text-7xl text-ice leading-none tabular-nums">
              {match.status === 'scheduled'
                ? <span className="text-ice/20">–:–</span>
                : <>{match.score?.home ?? 0}<span className="text-ice/20 mx-2">:</span>{match.score?.away ?? 0}</>
              }
            </div>
            {match.score?.homePenalty != null && (
              <p className="text-ice/30 text-sm mt-1">(Pen: {match.score.homePenalty}–{match.score.awayPenalty})</p>
            )}
            {match.venue && <p className="text-xs text-ice/20 mt-2">📍 {match.venue}, {match.city}</p>}
          </div>

          <div className="flex-1 text-center">
            {match.awayTeam?.logoUrl
              ? <img src={match.awayTeam.logoUrl} alt="" className="w-20 h-20 object-contain mx-auto mb-2" />
              : <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center font-display text-3xl text-ice/30 mx-auto mb-2">{match.awayTeam?.shortName?.[0]}</div>
            }
            <p className="font-display text-2xl text-ice tracking-wide">{match.awayTeam?.name}</p>
            <p className="text-xs text-ice/30 mt-0.5">{match.awayTeam?.shortName}</p>
          </div>
        </div>

        <WatchButton match={match} onLinkPosted={fetchMatch} />
      </div>

      {/* Goals */}
      {match.goals?.length > 0 && (
        <div className="card p-5 mb-4 animate-slide-up stagger-2">
          <h3 className="font-display text-xl text-ice tracking-wide mb-4">⚽ GOALS</h3>
          <div className="space-y-2">
            {match.goals.map((g, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${g.team === 'home' ? '' : 'flex-row-reverse text-right'}`}>
                <span className="text-pitch font-bold tabular-nums w-8">{g.minute}'</span>
                <span className="text-ice/80">{g.playerName}</span>
                {g.type !== 'goal' && <span className="text-xs text-ice/30">({g.type === 'own_goal' ? 'OG' : 'Pen'})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {match.cards?.length > 0 && (
        <div className="card p-5 animate-slide-up stagger-3">
          <h3 className="font-display text-xl text-ice tracking-wide mb-4">🟨 CARDS</h3>
          <div className="space-y-2">
            {match.cards.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-3 h-4 rounded-sm ${c.cardType === 'red' ? 'bg-scarlet' : 'bg-gold'}`} />
                <span className="text-ice/40 tabular-nums">{c.minute}'</span>
                <span className="text-ice/80">{c.playerName}</span>
                <span className="text-xs text-ice/30 ml-auto">{c.team}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MatchDetail
