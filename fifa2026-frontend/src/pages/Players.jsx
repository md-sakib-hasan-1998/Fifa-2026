import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import PlayerCard from '../components/player/PlayerCard'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'
import api from '../utils/api'

const TABS = [
  { id: 'all',      label: '⭐ World Class Stars' },
  { id: 'scorers',  label: '⚽ Top Scorers'        },
  { id: 'assists',  label: '🎯 Top Assists'         },
]

const Players = () => {
  const [tab,      setTab]      = useState('all')
  const [scorers,  setScorers]  = useState([])
  const [assists,  setAssists]  = useState([])
  const [all,      setAll]      = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [s, a, p] = await Promise.all([
          api.get('/api/teams/players/top-scorers'),
          api.get('/api/teams/players/top-assists'),
          api.get('/api/teams/players?minStars=4&limit=200'),
        ])
        setScorers(s.data.players || [])
        setAssists(a.data.players || [])
        setAll(p.data.players     || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const displayList = () => {
    let list = tab === 'scorers' ? scorers : tab === 'assists' ? assists : all
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }

  const enrichedList = displayList()
  const tournamentStarted = all.some(p => (p.stats?.goals ?? 0) > 0 || (p.stats?.assists ?? 0) > 0)

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <p className="section-subtitle mb-1">Tournament</p>
        <h1 className="section-title">PLAYERS</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-pitch/20 text-pitch border border-pitch/30' : 'bg-white/5 text-ice/50 hover:text-ice'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input mb-4 max-w-sm"
        placeholder="Search player…"
      />

      {/* Notice for when tournament hasn't started */}
      {!loading && !tournamentStarted && (tab === 'scorers' || tab === 'assists') && (
        <div className="flex items-center gap-3 bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 mb-5 text-sm text-gold/80">
          ⏳ Tournament begins June 11, 2026. Goal and assist stats will update live once matches start.
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {!loading && enrichedList.length === 0 && (
        <EmptyState icon="⚽" title="No players found" message="Try a different search or tab" />
      )}

      {!loading && enrichedList.length > 0 && (
        <div className="flex flex-col gap-3">
          {enrichedList.map((player, i) => (
            <PlayerCard
              key={player._id}
              player={player}
              rank={tab !== 'all' ? i + 1 : null}
            />
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Players

