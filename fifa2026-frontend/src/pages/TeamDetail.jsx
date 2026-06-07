import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Spinner from '../components/common/Spinner'
import { starsArray, formatMatchDate, formatMatchTime } from '../utils/helpers'
import api from '../utils/api'

const StarRating = ({ rating = 3 }) => (
  <div className="flex items-center gap-0.5">
    {starsArray(Math.round(rating)).map((filled, i) => (
      <span key={i} className={filled ? 'text-gold text-base' : 'text-white/15 text-base'}>★</span>
    ))}
    <span className="text-xs text-ice/40 ml-1.5 font-mono">{rating.toFixed(1)}</span>
  </div>
)

const StatBox = ({ label, value, accent = false }) => (
  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
    <p className={`font-display text-2xl ${accent ? 'text-pitch' : 'text-ice'} leading-none`}>{value ?? 0}</p>
    <p className="text-[10px] text-ice/40 uppercase tracking-wider mt-1">{label}</p>
  </div>
)

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']

const positionColor = (pos) => {
  if (pos === 'Goalkeeper') return 'bg-gold/20 text-gold'
  if (pos === 'Defender')   return 'bg-blue-500/20 text-blue-400'
  if (pos === 'Midfielder') return 'bg-pitch/20 text-pitch'
  return 'bg-scarlet/20 text-scarlet'
}

const PlayerRow = ({ player }) => {
  const initials = player.name
    ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const stars = player.starRating || 0

  return (
    <div className="flex items-center gap-3 bg-white/4 hover:bg-white/8 transition-colors p-2.5 rounded-xl border border-white/5">
      {/* Jersey # */}
      <span className="w-7 text-center font-mono text-xs text-gold font-bold bg-gold/10 rounded-lg py-1 shrink-0">
        {player.jerseyNumber || '–'}
      </span>

      {/* Photo */}
      {player.photoUrl ? (
        <img src={player.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pitch/30 to-navy/60 flex items-center justify-center font-display text-[10px] font-bold text-ice/80 shrink-0 border border-pitch/20">
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ice font-medium truncate">{player.name}</p>
        {/* Star rating */}
        {stars > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {starsArray(Math.round(stars)).map((filled, i) => (
              <span key={i} className={filled ? 'text-gold text-[10px]' : 'text-white/15 text-[10px]'}>★</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-ice/50">
        {player.stats?.goals > 0 && (
          <span className="text-pitch font-bold">⚽ {player.stats.goals}</span>
        )}
        {player.stats?.assists > 0 && (
          <span className="text-gold font-bold">🅰 {player.stats.assists}</span>
        )}
      </div>

      {/* Position badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${positionColor(player.position)}`}>
        {player.position === 'Goalkeeper' ? 'GK' :
         player.position === 'Defender'   ? 'DEF' :
         player.position === 'Midfielder' ? 'MID' : 'FWD'}
      </span>
    </div>
  )
}

const TeamDetail = () => {
  const { id } = useParams()
  const [team,    setTeam]    = useState(null)
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('squad')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [teamRes, playersRes, matchesRes] = await Promise.all([
          api.get(`/api/teams/${id}`),
          api.get(`/api/teams/players?team=${id}`),
          api.get(`/api/matches?team=${id}`),
        ])
        setTeam(teamRes.data.team)
        setPlayers(playersRes.data.players || [])
        setMatches(matchesRes.data.matches || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  if (loading) return <Layout><div className="flex justify-center py-40"><Spinner size="lg" /></div></Layout>
  if (!team)   return <Layout><div className="text-center py-20 text-ice/30">Team not found</div></Layout>

  const byPosition = POSITIONS.reduce((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos)
    return acc
  }, {})

  const totalGoals   = players.reduce((s, p) => s + (p.stats?.goals   || 0), 0)
  const totalAssists = players.reduce((s, p) => s + (p.stats?.assists || 0), 0)

  return (
    <Layout>
      <Link to="/teams" className="text-ice/30 hover:text-ice text-sm mb-6 inline-flex items-center gap-1">
        ← All Teams
      </Link>

      {/* Team Header */}
      <div className="card p-6 sm:p-8 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Logo */}
          <div className="shrink-0">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-24 h-24 sm:w-32 sm:h-32 object-contain" />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 flex items-center justify-center font-display text-4xl text-ice/40">
                {team.shortName?.[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <p className="section-subtitle mb-1">GROUP {team.group || '–'}</p>
            <h1 className="font-display text-4xl sm:text-5xl text-ice tracking-wider leading-none mb-2">
              {team.name}
            </h1>
            {team.shortName && <p className="text-ice/40 text-sm tracking-widest mb-3">{team.shortName}</p>}

            <StarRating rating={team.starRating || 3} />

            {team.coach && (
              <p className="text-sm text-ice/50 mt-3">👨‍💼 Coach: <span className="text-ice/80">{team.coach}</span></p>
            )}
            {team.fifaRanking && (
              <p className="text-sm text-ice/50 mt-1">🌍 FIFA Ranking: <span className="text-ice/80">#{team.fifaRanking}</span></p>
            )}
            {team.eliminated && (
              <span className="inline-block mt-2 text-xs bg-scarlet/20 text-scarlet px-3 py-1 rounded-full border border-scarlet/20">
                Eliminated · {team.eliminatedAt || 'Tournament'}
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-6 pt-6 border-t border-white/5">
          <StatBox label="Played"  value={team.stats?.played}        />
          <StatBox label="Won"     value={team.stats?.won}   accent   />
          <StatBox label="Drawn"   value={team.stats?.drawn}         />
          <StatBox label="Lost"    value={team.stats?.lost}          />
          <StatBox label="GF"      value={team.stats?.goalsFor}      />
          <StatBox label="GA"      value={team.stats?.goalsAgainst}  />
          <StatBox label="GD"      value={team.stats?.goalDifference} accent />
          <StatBox label="Pts"     value={team.stats?.points}  accent />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['squad', 'fixtures'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t ? 'bg-pitch text-navy font-bold' : 'bg-white/5 text-ice/50 hover:text-ice'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Squad Tab */}
      {tab === 'squad' && (
        <div className="animate-fade-in">
          {players.length === 0 ? (
            <div className="text-center py-16 text-ice/30">
              <p className="text-4xl mb-3">👥</p>
              <p>No squad data available yet</p>
            </div>
          ) : (
            <>
              {/* Squad stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatBox label="Players"  value={players.length} />
                <StatBox label="Goals"    value={totalGoals}   accent />
                <StatBox label="Assists"  value={totalAssists}        />
                <StatBox label="Stars"    value={`${team.starRating?.toFixed(1)} ★`} accent />
              </div>

              {/* Players by position */}
              {POSITIONS.map(pos => {
                const group = byPosition[pos]
                if (!group.length) return null
                return (
                  <div key={pos} className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm font-bold text-ice/60 uppercase tracking-widest">{pos}s</h3>
                      <span className="text-xs bg-white/5 text-ice/40 px-2 py-0.5 rounded-full">{group.length}</span>
                      <div className="flex-1 border-t border-white/5" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.map(p => <PlayerRow key={p._id} player={p} />)}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Fixtures Tab */}
      {tab === 'fixtures' && (
        <div className="space-y-3 animate-fade-in">
          {matches.length === 0 ? (
            <div className="text-center py-16 text-ice/30">
              <p className="text-4xl mb-3">📅</p>
              <p>No matches found</p>
            </div>
          ) : (
            matches.map(m => {
              // Determine if this team is home or away by checking homeTeam._id or name
              const homeId = m.homeTeam?._id?.toString()
              const isHome = homeId === id
              const opponent = isHome ? m.awayTeam : m.homeTeam
              const myScore   = isHome ? m.score?.home : m.score?.away
              const oppScore  = isHome ? m.score?.away : m.score?.home
              const isFinished = m.status === 'finished'
              const isLive     = m.status === 'live' || m.status === 'halftime'
              const isScheduled = m.status === 'scheduled'
              const opponentName = opponent?.name || 'TBD'

              let result = null
              if (isFinished) {
                if (myScore > oppScore)      result = { text: 'W', cls: 'text-pitch bg-pitch/15' }
                else if (myScore < oppScore) result = { text: 'L', cls: 'text-scarlet bg-scarlet/15' }
                else                         result = { text: 'D', cls: 'text-ice/60 bg-white/10' }
              }

              return (
                <Link
                  key={m._id}
                  to={`/matches/${m._id}`}
                  className="flex items-center gap-3 card p-4 hover:border-pitch/20 transition-all"
                >
                  {/* Stage + Group */}
                  <div className="shrink-0 w-20">
                    <p className="text-[10px] text-ice/30 uppercase tracking-wider leading-tight">{m.stage}</p>
                    {m.group && <p className="text-[10px] text-gold/60">Group {m.group}</p>}
                  </div>

                  {/* Opponent info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {opponent?.logoUrl
                      ? <img src={opponent.logoUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                      : <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm text-ice font-medium truncate">{isHome ? '🏠' : '✈️'} {opponentName}</p>
                      {m.city && <p className="text-[10px] text-ice/30 truncate">📍 {m.city}</p>}
                    </div>
                  </div>

                  {/* Score / Time / Status */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isLive && <span className="badge-live text-xs">LIVE {m.minute ? `${m.minute}'` : ''}</span>}
                    {isFinished && (
                      <>
                        <span className={`font-display text-base tabular-nums ${myScore > oppScore ? 'text-pitch' : myScore < oppScore ? 'text-scarlet' : 'text-ice/60'}`}>
                          {myScore} – {oppScore}
                        </span>
                        {result && (
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${result.cls}`}>{result.text}</span>
                        )}
                      </>
                    )}
                    {isScheduled && m.kickoffTime && (
                      <>
                        <span className="text-xs text-ice/60 font-mono">{formatMatchTime(m.kickoffTime)}</span>
                        <span className="text-[10px] text-ice/30">{formatMatchDate(m.kickoffTime)}</span>
                      </>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}
    </Layout>
  )
}

export default TeamDetail
