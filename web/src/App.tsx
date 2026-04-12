import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import BrokersPage from './pages/BrokersPage'
import AffiliatesPage from './pages/AffiliatesPage'
import RoutingPage from './pages/RoutingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import SessionsPage from './pages/SessionsPage'
import NotificationPreferencesPage from './pages/NotificationPreferencesPage'
import OnboardingPage from './pages/OnboardingPage'
import AcceptInvitePage from './pages/AcceptInvitePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="brokers" element={<BrokersPage />} />
        <Route path="affiliates" element={<AffiliatesPage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/sessions" element={<SessionsPage />} />
        <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>
    </Routes>
  )
}
