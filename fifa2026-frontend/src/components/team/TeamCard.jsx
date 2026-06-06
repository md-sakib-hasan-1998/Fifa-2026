import { Link } from 'react-router-dom'
import StarRating from '../common/StarRating'

const TeamCard = ({ team }) => (
  <Link to={`/teams/${team._id}`} className="card p-4 block hover:scale-[1.01] transition-transform duration-150 animate-fade-in">
    <div className="flex items-center gap-3 mb-3">
      {team.logoUrl
        ? <img src={team.logoUrl} alt={team.name} className="w-12 h-12 object-contain" />
        : <div className="w-12 h-12 rounded-full bg-pitch/10 flex items-center justify-center font-display text-xl text-pitch">{team.shortName}</div>
      }
      <div className="min-w-0">
        <p className="font-display text-lg text-ice tracking-wide leading-tight truncate">{team.name}</p>
        <p className="text-xs text-ice/40">{team.group ? `Group ${team.group}` : team.country}</p>
        <StarRating rating={team.starRating} size="sm" />
      </div>
      {team.eliminated && (
        <span className="ml-auto text-xs text-ice/30 bg-white/5 px-2 py-0.5 rounded">Out</span>
      )}
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-5 gap-1 text-center border-t border-white/5 pt-3">
      {[
        { label: 'P',  val: team.stats?.played  ?? 0 },
        { label: 'W',  val: team.stats?.won      ?? 0 },
        { label: 'D',  val: team.stats?.drawn    ?? 0 },
        { label: 'L',  val: team.stats?.lost     ?? 0 },
        { label: 'Pts',val: team.stats?.points   ?? 0 },
      ].map(({ label, val }) => (
        <div key={label}>
          <p className="text-xs text-ice/30">{label}</p>
          <p className="font-display text-lg text-ice leading-tight">{val}</p>
        </div>
      ))}
    </div>
  </Link>
)

export default TeamCard
