import { useState, useEffect } from 'react'

const pad = (n) => String(n).padStart(2, '0')

/**
 * MatchCountdown — shows a live countdown for scheduled matches.
 * Hides itself when the match starts (diff <= 0).
 */
const MatchCountdown = ({ kickoffTime }) => {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    const target = new Date(kickoffTime)

    const tick = () => {
      const now  = new Date()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft(null)
        return
      }

      const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoffTime])

  if (!timeLeft) return null

  const { days, hours, minutes, seconds } = timeLeft

  // Show compact format based on remaining time
  if (days > 0) {
    return (
      <p className="text-center text-xs text-ice/40 mt-2 font-mono">
        ⏱ {days}d {pad(hours)}h {pad(minutes)}m
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      <span className="text-[10px] text-ice/30 tracking-wider">STARTS IN</span>
      <span className="font-mono text-xs text-pitch font-bold tracking-wider">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  )
}

export default MatchCountdown
