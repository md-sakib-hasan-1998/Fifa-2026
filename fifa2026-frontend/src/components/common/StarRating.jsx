// StarRating — supports full, half, and empty stars for values like 4.5
const StarRating = ({ rating = 3, size = 'md' }) => {
  const sizeCls = size === 'sm' ? 'text-xs gap-0.5' : 'text-sm gap-1'

  const stars = Array.from({ length: 5 }, (_, i) => {
    const full = i + 1
    if (rating >= full)       return 'full'
    if (rating >= full - 0.5) return 'half'
    return 'empty'
  })

  return (
    <div className={`flex items-center mt-0.5 ${sizeCls}`}>
      {stars.map((type, i) => (
        <span key={i} className={
          type === 'full'  ? 'text-gold' :
          type === 'half'  ? 'text-gold/60' :
                             'text-white/15'
        }>
          {type === 'half' ? '⯨' : '★'}
        </span>
      ))}
    </div>
  )
}

export default StarRating
