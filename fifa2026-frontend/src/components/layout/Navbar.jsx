import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleBadgeClass, cap } from '../../utils/helpers'
import { useSocket } from '../../context/SocketContext'

const NAV_LINKS = [
  { to: '/',        label: 'Scores'  },
  { to: '/matches', label: 'Matches' },
  { to: '/teams',   label: 'Teams'   },
  { to: '/players', label: 'Players' },
]

const Navbar = () => {
  const { user, isLoggedIn, isAdminOrMod, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setDropOpen(false)
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-navy/95 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏆</span>
          <span className="font-display text-xl text-ice tracking-wider leading-none hidden sm:block">
            WC<span className="text-pitch">2026</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-pitch/15 text-pitch'
                    : 'text-ice/50 hover:text-ice hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          {isAdminOrMod && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-gold/15 text-gold' : 'text-gold/60 hover:text-gold hover:bg-gold/5'
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-pitch animate-pulse-slow' : 'bg-white/20'}`} />
            <span className="text-xs text-ice/30">{connected ? 'Live' : 'Offline'}</span>
          </div>

          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 hover:border-pitch/30 transition-colors duration-150"
              >
                <div className="w-6 h-6 rounded-full bg-pitch/20 flex items-center justify-center text-pitch text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-ice/80 hidden sm:block max-w-24 truncate">{user?.name}</span>
                <svg className="w-3.5 h-3.5 text-ice/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-navy-800 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-sm font-medium text-ice truncate">{user?.name}</p>
                      <p className="text-xs text-ice/40 truncate">{user?.email}</p>
                      <span className={`mt-1 badge-role text-xs ${roleBadgeClass(user?.role)}`}>
                        {cap(user?.role)}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ice/70 hover:text-ice hover:bg-white/5 transition-colors"
                    >
                      <span>👤</span> My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-scarlet/70 hover:text-scarlet hover:bg-scarlet/5 transition-colors"
                    >
                      <span>→</span> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm py-1.5 px-3">Sign In</Link>
              <Link to="/signup" className="btn-primary text-sm py-1.5 px-4">Join</Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden text-ice/60 hover:text-ice p-1"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-navy-800 animate-slide-up">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 text-sm border-b border-white/5 ${
                  isActive ? 'text-pitch bg-pitch/10' : 'text-ice/60'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          {isAdminOrMod && (
            <NavLink to="/admin" onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-sm text-gold/70 border-b border-white/5"
            >
              Admin Panel
            </NavLink>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
