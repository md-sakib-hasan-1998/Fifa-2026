import { starsArray } from '../../utils/helpers'

const StarRating = ({ rating = 3, size = 'md' }) => {
  const stars = starsArray(rating)
  const sizeCls = size === 'sm' ? 'text-xs gap-0.5' : 'text-sm gap-1'

  return (
    <div className={`flex items-center mt-0.5 ${sizeCls}`}>
      {stars.map((filled, i) => (
        <span key={i} className={filled ? 'text-gold' : 'text-white/15'}>
          ★
        </span>
      ))}
    </div>
  )
}

export default StarRating
