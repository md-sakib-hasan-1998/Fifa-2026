import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import Spinner from './components/common/Spinner'

// Pages
import Home        from './pages/Home'
import Matches     from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import Teams       from './pages/Teams'
import Players     from './pages/Players'
import Login       from './pages/Login'
import Signup      from './pages/Signup'
import Profile     from './pages/Profile'
import Admin       from './pages/Admin'

// ── Protected route: must be logged in and approved ─────
const ProtectedRoute = ({ children }) => {
  const { user, loading, isLoggedIn } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!user)       return <Navigate to="/login"  state={{ from: location }} replace />
  if (!isLoggedIn) return <Navigate to="/pending" replace />
  return children
}

// ── Admin/mod only route ─────────────────────────────────
const AdminRoute = ({ children }) => {
  const { isAdminOrMod, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!isAdminOrMod) return <Navigate to="/" replace />
  return children
}

// ── Pending approval page ────────────────────────────────
const PendingPage = () => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <div className="text-center max-w-sm">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="font-display text-3xl text-ice tracking-wide mb-3">PENDING APPROVAL</h2>
      <p className="text-ice/50 text-sm leading-relaxed">
        Your account is awaiting approval from an admin or moderator. Please check back soon.
      </p>
    </div>
  </div>
)

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/"          element={<Home />} />
    <Route path="/matches"   element={<Matches />} />
    <Route path="/matches/:id" element={<MatchDetail />} />
    <Route path="/teams"     element={<Teams />} />
    <Route path="/players"   element={<Players />} />
    <Route path="/login"     element={<Login />} />
    <Route path="/signup"    element={<Signup />} />
    <Route path="/pending"   element={<PendingPage />} />

    {/* Protected */}
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

    {/* Admin / Mod */}
    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

    {/* 404 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
