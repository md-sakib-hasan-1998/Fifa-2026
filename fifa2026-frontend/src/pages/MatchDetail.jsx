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

  const renderPlayerRow = (player, i) => {
    if (!player) return null;
    const initials = player.name
      ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : '??';
    return (
      <div key={player.jerseyNumber || i} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
        <span className="w-8 text-center font-mono font-bold text-xs text-gold shrink-0 bg-gold/15 rounded-lg py-1">
          {player.jerseyNumber || '-'}
        </span>
        
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 items-center justify-center font-display text-[10px] font-bold text-ice/70 shrink-0 border border-white/5"
          style={{ display: player.photoUrl ? 'none' : 'flex' }}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-ice font-medium truncate leading-tight">{player.name}</p>
          <span className="text-[10px] text-ice/45 font-semibold uppercase tracking-wider mt-0.5 inline-block">
            {player.position}
          </span>
        </div>
      </div>
    );
  };

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
            <Link to={match.homeTeam?._id ? `/teams/${match.homeTeam._id}` : '#'} className="font-display text-2xl text-ice tracking-wide hover:text-pitch transition-colors">{match.homeTeam?.name}</Link>
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
            <Link to={match.awayTeam?._id ? `/teams/${match.awayTeam._id}` : '#'} className="font-display text-2xl text-ice tracking-wide hover:text-pitch transition-colors">{match.awayTeam?.name}</Link>
            <p className="text-xs text-ice/30 mt-0.5">{match.awayTeam?.shortName}</p>
          </div>
        </div>

        <WatchButton match={match} onLinkPosted={fetchMatch} />
      </div>

      {/* Tie Breaker Penalty Shootout Detail */}
      {match.penalties?.length > 0 && (
        <div className="card p-6 mb-6 border border-gold/30 bg-gold/5 shadow-[0_0_20px_rgba(212,175,55,0.05)] animate-slide-up">
          <h3 className="font-display text-lg text-gold tracking-wide mb-4 flex items-center gap-2">
            🏆 PENALTY SHOOTOUT DETAIL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home team pens */}
            <div>
              <h4 className="text-sm font-semibold text-ice/80 mb-3">{match.homeTeam?.name}</h4>
              <div className="space-y-2">
                {match.penalties.filter(p => p.team === 'home').map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-ice/30 font-mono w-4">#{p.order}</span>
                    <span className="text-ice/85 font-medium">{p.playerName}</span>
                    <span className={`ml-auto font-bold text-sm ${p.scored ? 'text-pitch bg-pitch/10 px-2 py-0.5 rounded' : 'text-scarlet bg-scarlet/10 px-2 py-0.5 rounded'}`}>
                      {p.scored ? '✓ SCORED' : '✗ MISSED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Away team pens */}
            <div>
              <h4 className="text-sm font-semibold text-ice/80 mb-3">{match.awayTeam?.name}</h4>
              <div className="space-y-2">
                {match.penalties.filter(p => p.team === 'away').map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-ice/30 font-mono w-4">#{p.order}</span>
                    <span className="text-ice/85 font-medium">{p.playerName}</span>
                    <span className={`ml-auto font-bold text-sm ${p.scored ? 'text-pitch bg-pitch/10 px-2 py-0.5 rounded' : 'text-scarlet bg-scarlet/10 px-2 py-0.5 rounded'}`}>
                      {p.scored ? '✓ SCORED' : '✗ MISSED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Goals */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-display text-lg text-ice tracking-wide mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            ⚽ GOALS
          </h3>
          {match.goals?.length > 0 ? (
            <div className="space-y-3">
              {match.goals.map((g, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm ${g.team === 'home' ? '' : 'flex-row-reverse text-right'}`}>
                  <span className="text-pitch font-bold tabular-nums w-8">{g.minute}'</span>
                  <div>
                    <span className="text-ice/85 font-medium">{g.playerName}</span>
                    {g.type !== 'goal' && <span className="text-xs text-ice/45 ml-1.5">({g.type === 'own_goal' ? 'OG' : 'Pen'})</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ice/30 italic">No goal events reported</p>
          )}
        </div>

        {/* Cards */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-display text-lg text-ice tracking-wide mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            🟨 CARDS
          </h3>
          {match.cards?.length > 0 ? (
            <div className="space-y-3">
              {match.cards.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm ${c.team === 'home' ? '' : 'flex-row-reverse text-right'}`}>
                  <span className="text-ice/30 tabular-nums w-8">{c.minute}'</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-4 rounded-sm shrink-0 ${c.cardType === 'red' ? 'bg-scarlet' : 'bg-gold'}`} />
                    <span className="text-ice/85 font-medium">{c.playerName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ice/30 italic">No card events reported</p>
          )}
        </div>
      </div>

      {/* Substitutions */}
      {match.substitutions?.length > 0 && (
        <div className="card p-6 mb-6 animate-slide-up">
          <h3 className="font-display text-lg text-ice tracking-wide mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            🔄 SUBSTITUTIONS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {match.substitutions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-pitch font-bold tabular-nums bg-pitch/10 px-2.5 py-1 rounded-lg text-xs shrink-0">{s.minute}'</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-ice/85 truncate">
                    <span className="text-pitch text-xs shrink-0">⬆</span>
                    <span className="truncate font-medium">{s.playerIn}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ice/40 truncate text-xs mt-0.5">
                    <span className="text-scarlet text-xs shrink-0">⬇</span>
                    <span className="truncate">{s.playerOut}</span>
                  </div>
                </div>
                <span className="text-[10px] text-ice/35 font-semibold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                  {s.team}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lineups */}
      {match.lineups?.home && (
        <div className="card p-6 mb-6 animate-slide-up">
          <h3 className="font-display text-xl text-ice tracking-wider mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
            <span>📋 TEAM LINEUPS</span>
            <span className="text-xs font-sans text-ice/40 tracking-normal font-normal">
              {match.homeTeam?.name} ({match.lineups.home.formation}) vs {match.awayTeam?.name} ({match.lineups.away.formation})
            </span>
          </h3>

          <h4 className="text-xs font-bold text-gold uppercase tracking-widest mb-4">STARTING ELEVEN</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Home XI */}
            <div>
              <h5 className="text-sm font-semibold text-ice/85 mb-3 flex items-center justify-between">
                <span>{match.homeTeam?.name}</span>
                <span className="text-xs text-gold/60 font-mono font-medium">{match.lineups.home.formation}</span>
              </h5>
              <div className="space-y-2">
                {match.lineups.home.startingXI.map(renderPlayerRow)}
              </div>
            </div>

            {/* Away XI */}
            <div>
              <h5 className="text-sm font-semibold text-ice/85 mb-3 flex items-center justify-between">
                <span>{match.awayTeam?.name}</span>
                <span className="text-xs text-gold/60 font-mono font-medium">{match.lineups.away.formation}</span>
              </h5>
              <div className="space-y-2">
                {match.lineups.away.startingXI.map(renderPlayerRow)}
              </div>
            </div>
          </div>

          <h4 className="text-xs font-bold text-gold uppercase tracking-widest mb-4 pt-4 border-t border-white/5">BENCH PLAYERS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Bench */}
            <div>
              <h5 className="text-sm font-semibold text-ice/50 mb-3">{match.homeTeam?.name} Bench</h5>
              <div className="space-y-2">
                {match.lineups.home.bench.map(renderPlayerRow)}
              </div>
            </div>

            {/* Away Bench */}
            <div>
              <h5 className="text-sm font-semibold text-ice/50 mb-3">{match.awayTeam?.name} Bench</h5>
              <div className="space-y-2">
                {match.lineups.away.bench.map(renderPlayerRow)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MatchDetail
