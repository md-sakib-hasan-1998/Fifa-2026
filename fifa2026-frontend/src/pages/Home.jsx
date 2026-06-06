import { useState, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import MatchCard from '../components/match/MatchCard'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'
import LiveDot from '../components/common/LiveDot'
import { useLiveMatches } from '../hooks/useLiveMatches'

const FILTERS = ['All', 'Live', 'Today', 'Finished', 'Upcoming']

const Home = () => {
  const { matches, loading, error, refetch } = useLiveMatches()
  const [filter, setFilter] = useState('All')

  const today = useMemo(() => new Date().toDateString(), [])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Live':     return matches.filter(m => m.status === 'live' || m.status === 'halftime')
      case 'Today':    return matches.filter(m => new Date(m.kickoffTime).toDateString() === today)
      case 'Finished': return matches.filter(m => m.status === 'finished')
      case 'Upcoming': return matches.filter(m => m.status === 'scheduled')
      default:         return matches
    }
  }, [matches, filter, today])

  const liveCount = matches.filter(m => m.status === 'live' || m.status === 'halftime').length

  return (
    <Layout>
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-in">
        <p className="section-subtitle mb-2">USA · Canada · Mexico</p>
        <h1 className="font-display text-6xl sm:text-8xl text-ice tracking-wider leading-none">
          WORLD<span className="text-pitch">CUP</span>
        </h1>
        <p className="font-display text-2xl text-ice/20 tracking-[0.3em] mt-1">2026</p>
      </div>

      {/* Live count banner */}
      {liveCount > 0 && (
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 bg-scarlet/10 border border-scarlet/20 px-4 py-2 rounded-full">
            <LiveDot />
            <span className="text-scarlet font-bold text-sm tracking-wider">
              {liveCount} MATCH{liveCount > 1 ? 'ES' : ''} LIVE NOW
            </span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
              filter === f
                ? 'bg-pitch text-navy font-bold'
                : 'bg-white/5 text-ice/50 hover:text-ice hover:bg-white/10'
            }`}
          >
            {f}
            {f === 'Live' && liveCount > 0 && (
              <span className="ml-1.5 bg-scarlet text-white text-xs rounded-full px-1.5 py-0.5">{liveCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Match grid */}
      {loading && (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="text-center py-10 text-scarlet/60 text-sm">
          Failed to load matches. <button onClick={refetch} className="underline text-pitch">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon="⚽" title="No matches found" message={`No ${filter.toLowerCase()} matches right now`} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((match, i) => (
            <div key={match._id} className={`stagger-${Math.min(i + 1, 6)}`} style={{ opacity: 0, animation: 'slideUp 0.5s ease forwards' }}>
              <MatchCard match={match} onRefetch={refetch} />
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Home
