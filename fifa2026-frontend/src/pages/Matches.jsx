import { useState, useMemo, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import MatchCard from '../components/match/MatchCard'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'
import api from '../utils/api'

const STAGES = ['All', 'Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Third Place', 'Final']
const GROUPS = ['All', 'A','B','C','D','E','F','G','H','I','J','K','L']

const Matches = () => {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [stage,   setStage]   = useState('All')
  const [group,   setGroup]   = useState('All')

  useEffect(() => {
    api.get('/api/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let m = matches
    if (stage !== 'All') m = m.filter(x => x.stage === stage)
    if (group !== 'All') m = m.filter(x => x.group === group)
    return m.sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
  }, [matches, stage, group])

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <p className="section-subtitle mb-1">Tournament</p>
        <h1 className="section-title">MATCH HISTORY</h1>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {STAGES.map(s => (
          <button key={s} onClick={() => setStage(s)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              stage === s ? 'bg-pitch text-navy font-bold' : 'bg-white/5 text-ice/50 hover:text-ice'
            }`}
          >{s}</button>
        ))}
      </div>

      {/* Group filter (only when Group Stage selected) */}
      {(stage === 'All' || stage === 'Group Stage') && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {GROUPS.map(g => (
            <button key={g} onClick={() => setGroup(g)}
              className={`shrink-0 w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                group === g ? 'bg-gold text-navy' : 'bg-white/5 text-ice/40 hover:text-ice'
              }`}
            >{g}</button>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {!loading && filtered.length === 0 && (
        <EmptyState icon="📅" title="No matches found" message="Try a different filter" />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((match) => (
            <MatchCard key={match._id} match={match} onRefetch={() => {}} />
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Matches
