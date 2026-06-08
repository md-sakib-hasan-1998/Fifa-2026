import { useState, useEffect } from 'react'

const pad = (n) => String(n).padStart(2, '0')

// FIFA World Cup 2026 first match: June 11, 2026, 19:00 UTC
const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')

const TournamentCountdown = () => {
  const [timeLeft, setTimeLeft] = useState(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const diff = TOURNAMENT_START - now

      if (diff <= 0) {
        setStarted(true)
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
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  if (started) {
    return (
      <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-pitch/10 border border-pitch/30 px-6 py-3 rounded-2xl">
          <span className="text-2xl">🏆</span>
          <span className="font-display text-lg text-pitch tracking-wider">TOURNAMENT UNDERWAY!</span>
        </div>
      </div>
    )
  }

  if (!timeLeft) return null

  const units = [
    { label: 'DAYS',    value: timeLeft.days    },
    { label: 'HRS',     value: timeLeft.hours   },
    { label: 'MIN',     value: timeLeft.minutes },
    { label: 'SEC',     value: timeLeft.seconds },
  ]

  return (
    <div className="mb-8 animate-fade-in">
      <p className="text-center text-ice/30 text-xs tracking-[0.3em] uppercase mb-3">
        FIFA World Cup 2026 · Kickoff in
      </p>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {units.map(({ label, value }, i) => (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="text-center">
              <div className="bg-navy-800 border border-white/8 rounded-xl px-3 sm:px-5 py-3 min-w-[56px] sm:min-w-[72px] shadow-lg">
                <span className="font-display text-3xl sm:text-4xl text-ice tabular-nums leading-none">
                  {pad(value)}
                </span>
              </div>
              <p className="text-[10px] text-ice/30 tracking-widest mt-1.5 uppercase">{label}</p>
            </div>
            {i < units.length - 1 && (
              <span className="font-display text-2xl text-ice/20 mb-5">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TournamentCountdown
