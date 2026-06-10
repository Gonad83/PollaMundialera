import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { HeaderActionsProvider } from './context/HeaderActionsContext'
import Layout from './components/layout/Layout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import TournamentPage from './pages/TournamentPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import RulesPage from './pages/RulesPage'
import WelcomePage from './pages/WelcomePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import JoinPage from './pages/JoinPage'
import SimulatorPage from './pages/SimulatorPage'
import SettingsPage from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// Rutas protegidas
const Protected = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />
  return children
}

const Spinner = () => (
  <div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin" />
)

function AppContent() {
  useEffect(() => {
    // Invalidar cache de matches al cargar la app
    queryClient.invalidateQueries({ queryKey: ['matches-all'] })
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
        <HeaderActionsProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <Routes>
              {/* Públicas */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/join/:token" element={<JoinPage />} />

              {/* Onboarding fuera del Layout (pantalla completa) */}
              <Route path="/welcome" element={<Protected><WelcomePage /></Protected>} />

              {/* App con layout */}
              <Route element={<Layout />}>
                <Route path="/matches" element={<Protected><MatchesPage /></Protected>} />
                <Route path="/matches/:id" element={<Protected><MatchDetailPage /></Protected>} />
                <Route path="/tournament" element={<Protected><TournamentPage /></Protected>} />
                <Route path="/leaderboard" element={<Protected><LeaderboardPage /></Protected>} />
                <Route path="/groups" element={<Protected><GroupsPage /></Protected>} />
                <Route path="/groups/:id" element={<Protected><GroupDetailPage /></Protected>} />
                <Route path="/profile/:id" element={<Protected><ProfilePage /></Protected>} />
                <Route path="/simulator" element={<Protected><SimulatorPage /></Protected>} />
                <Route path="/rules" element={<Protected><RulesPage /></Protected>} />
                <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
                <Route path="/payment-success" element={<Protected><PaymentSuccessPage /></Protected>} />
                <Route path="/admin" element={<Protected adminOnly><AdminPage /></Protected>} />
              </Route>
            </Routes>
          </HeaderActionsProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}