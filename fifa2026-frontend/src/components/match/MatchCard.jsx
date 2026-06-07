import { Link } from 'react-router-dom'
import LiveDot from '../common/LiveDot'
import WatchButton from './WatchButton'
import MatchCountdown from '../common/MatchCountdown'
import { formatMatchTime, formatMatchDate } from '../../utils/helpers'

const TeamBlock = ({ team, align = 'left' }) => {
  const logoEl = team?.logoUrl
    ? <img src={team.logoUrl} alt="" className="w-9 h-9 object-contain" />
    : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-ice/60">{team?.shortName?.[0]}</div>

  if (align === 'right') {
    return (
      <Link to={`/teams/${team?._id}`} className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right group">
        <div className="min-w-0">
          <p className="font-display text-base text-ice tracking-wide truncate leading-tight group-hover:text-pitch transition-colors">{team?.name}</p>
          <p className="text-xs text-ice/30">{team?.shortName}</p>
        </div>
        <div className="shrink-0">{logoEl}</div>
      </Link>
    )
  }

  return (
    <Link to={`/teams/${team?._id}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
      <div className="shrink-0">{logoEl}</div>
      <div className="min-w-0">
        <p className="font-display text-base text-ice tracking-wide truncate leading-tight group-hover:text-pitch transition-colors">{team?.name}</p>
        <p className="text-xs text-ice/30">{team?.shortName}</p>
      </div>
    </Link>
  )
}

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
      <div className="flex items-center justify-between gap-3">
        <TeamBlock team={match.homeTeam} align="left" />

        {/* Scoreline */}
        <Link to={`/matches/${match._id}`} className="flex items-center gap-2 shrink-0">
          <span className={`font-display text-3xl tabular-nums leading-none ${isLive ? 'text-ice' : isFinished ? 'text-ice' : 'text-ice/30'}`}>
            {isScheduled ? '–' : match.score?.home ?? 0}
          </span>
          <span className="text-ice/20 font-display text-xl">:</span>
          <span className={`font-display text-3xl tabular-nums leading-none ${isLive ? 'text-ice' : isFinished ? 'text-ice' : 'text-ice/30'}`}>
            {isScheduled ? '–' : match.score?.away ?? 0}
          </span>
        </Link>

        <TeamBlock team={match.awayTeam} align="right" />
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

      {/* Per-match countdown */}
      {isScheduled && match.kickoffTime && (
        <MatchCountdown kickoffTime={match.kickoffTime} />
      )}

      {/* Watch Live button */}
      <WatchButton match={match} onLinkPosted={onRefetch} />
    </div>
  )
}

export default MatchCard
