import { Link } from 'react-router-dom'
import LiveDot from '../common/LiveDot'
import WatchButton from './WatchButton'
import { formatMatchTime, formatMatchDate } from '../../utils/helpers'

const MatchCard = ({ match, onRefetch }) => {
  const isLive      = match.status === 'live' || match.status === 'halftime'
  const isFinished  = match.status === 'finished'
  const isScheduled = match.status === 'scheduled'

  return (
    <div className={`card p-4 animate-fade-in transition-all duration-300 ${isLive ? 'border-scarlet/20 shadow-[0_0_20px_rgba(255,23,68,0.08)]' : ''}`}>

      {/* Stage + status row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ice/30 tracking-wider uppercase">{match.stage}{match.group ? ` · Group ${match.group}` : ''}</span>
        <span>
          {isLive && (
            <span className="badge-live">
              <LiveDot />
              {match.status === 'halftime' ? 'HT' : `${match.minute || 0}'`}
            </span>
          )}
          {isFinished  && <span className="badge-finished">Full Time</span>}
          {isScheduled && <span className="badge-scheduled">{formatMatchTime(match.kickoffTime)}</span>}
          {match.status === 'postponed' && <span className="badge-finished">Postponed</span>}
        </span>
      </div>

      {/* Score row */}
      <Link to={`/matches/${match._id}`} className="block">
        <div className="flex items-center justify-between gap-3">

          {/* Home team */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {match.homeTeam?.logoUrl
              ? <img src={match.homeTeam.logoUrl} alt="" className="w-8 h-8 object-contain" />
              : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-ice/60">{match.homeTeam?.shortName?.[0]}</div>
            }
            <div className="min-w-0">
              <p className="font-display text-base text-ice tracking-wide truncate leading-tight">{match.homeTeam?.name}</p>
              <p className="text-xs text-ice/30">{match.homeTeam?.shortName}</p>
            </div>
          </div>

          {/* Scoreline */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-display text-3xl tabular-nums leading-none ${isLive ? 'text-ice' : isFinished ? 'text-ice' : 'text-ice/30'}`}>
              {isScheduled ? '–' : match.score?.home ?? 0}
            </span>
            <span className="text-ice/20 font-display text-xl">:</span>
            <span className={`font-display text-3xl tabular-nums leading-none ${isLive ? 'text-ice' : isFinished ? 'text-ice' : 'text-ice/30'}`}>
              {isScheduled ? '–' : match.score?.away ?? 0}
            </span>
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <p className="font-display text-base text-ice tracking-wide truncate leading-tight">{match.awayTeam?.name}</p>
              <p className="text-xs text-ice/30">{match.awayTeam?.shortName}</p>
            </div>
            {match.awayTeam?.logoUrl
              ? <img src={match.awayTeam.logoUrl} alt="" className="w-8 h-8 object-contain" />
              : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-ice/60">{match.awayTeam?.shortName?.[0]}</div>
            }
          </div>
        </div>

        {/* Penalty scores if applicable */}
        {match.score?.homePenalty != null && (
          <p className="text-center text-xs text-ice/40 mt-1">
            (Pen: {match.score.homePenalty} – {match.score.awayPenalty})
          </p>
        )}

        {/* Venue */}
        {match.city && (
          <p className="text-center text-xs text-ice/20 mt-2">📍 {match.city}</p>
        )}

        {/* Date for scheduled */}
        {isScheduled && (
          <p className="text-center text-xs text-ice/30 mt-1">{formatMatchDate(match.kickoffTime)}</p>
        )}
      </Link>

      {/* Watch Live button */}
      <WatchButton match={match} onLinkPosted={onRefetch} />
    </div>
  )
}

export default MatchCard
