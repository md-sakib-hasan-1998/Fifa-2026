import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import TeamCard from '../components/team/TeamCard'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'
import api from '../utils/api'

const GROUPS = ['All', 'A','B','C','D','E','F','G','H','I','J','K','L']

const Teams = () => {
  const [teams,   setTeams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [group,   setGroup]   = useState('All')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    api.get('/api/teams')
      .then(({ data }) => setTeams(data.teams))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let t = teams
    if (group !== 'All') t = t.filter(x => x.group === group)
    if (search.trim())   t = t.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))
    return t
  }, [teams, group, search])

  // Group teams by their group letter for the "All" view
  const grouped = useMemo(() => {
    if (group !== 'All') return null
    const map = {}
    for (const t of filtered) {
      const g = t.group || 'TBD'
      if (!map[g]) map[g] = []
      map[g].push(t)
    }
    return map
  }, [filtered, group])

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <p className="section-subtitle mb-1">48 Nations</p>
        <h1 className="section-title">TEAMS</h1>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input mb-4 max-w-sm"
        placeholder="Search team…"
      />

      {/* Group filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setGroup(g)}
            className={`shrink-0 w-10 h-10 rounded-lg text-sm font-bold transition-all ${
              group === g ? 'bg-gold text-navy' : 'bg-white/5 text-ice/40 hover:text-ice'
            }`}
          >{g}</button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {/* Group-by-group layout */}
      {!loading && grouped && Object.keys(grouped).sort().map(g => (
        <div key={g} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-display text-4xl text-gold/20">GROUP</span>
            <span className="font-display text-5xl text-gold">{g}</span>
            <div className="flex-1 border-t border-white/5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {grouped[g].map(team => <TeamCard key={team._id} team={team} />)}
          </div>
        </div>
      ))}

      {/* Single group layout */}
      {!loading && !grouped && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map(team => <TeamCard key={team._id} team={team} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState icon="🛡" title="No teams found" />
      )}
    </Layout>
  )
}

export default Teams
