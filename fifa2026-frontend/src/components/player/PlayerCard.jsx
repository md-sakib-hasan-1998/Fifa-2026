import StarRating from '../common/StarRating'

const POSITION_COLORS = {
  Goalkeeper: 'text-gold   bg-gold/10',
  Defender:   'text-pitch  bg-pitch/10',
  Midfielder: 'text-ice/60 bg-white/10',
  Forward:    'text-scarlet bg-scarlet/10',
}

const PlayerCard = ({ player, rank }) => (
  <div className="card p-4 flex items-center gap-4 animate-fade-in hover:border-pitch/20 transition-colors">
    {rank && (
      <span className="font-display text-3xl text-ice/10 w-8 shrink-0 text-center">{rank}</span>
    )}

    {/* Photo */}
    <div className="shrink-0">
      {player.photoUrl
        ? <img src={player.photoUrl} alt={player.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
        : <div className="w-14 h-14 rounded-full bg-navy-600 border-2 border-white/10 flex items-center justify-center font-display text-2xl text-ice/30">
            {player.name?.[0]}
          </div>
      }
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="font-display text-lg text-ice tracking-wide leading-tight truncate">{player.name}</p>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        {player.teamName && (
          <span className="text-xs text-ice/40">{player.teamName}</span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded ${POSITION_COLORS[player.position] || 'text-ice/40 bg-white/5'}`}>
          {player.position}
        </span>
      </div>
      <StarRating rating={player.starRating} size="sm" />
    </div>

    {/* Stats */}
    <div className="text-right shrink-0">
      <p className="font-display text-3xl text-pitch leading-none">
        {player.stats?.goals ?? player.stats?.assists ?? 0}
      </p>
      <p className="text-xs text-ice/30 mt-0.5">
        {player.stats?.goals !== undefined ? 'Goals' : 'Assists'}
      </p>
    </div>
  </div>
)

export default PlayerCard
