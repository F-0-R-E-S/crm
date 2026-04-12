import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import BrokersPage from './pages/BrokersPage'
import AffiliatesPage from './pages/AffiliatesPage'
import RoutingPage from './pages/RoutingPage'
import UADPage from './pages/UADPage'
import SmartRoutingPage from './pages/SmartRoutingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import SessionsPage from './pages/SessionsPage'
import NotificationPreferencesPage from './pages/NotificationPreferencesPage'
import OnboardingPage from './pages/OnboardingPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import StatusGroupsPage from './pages/StatusGroupsPage'
import StatusAnalyticsPage from './pages/StatusAnalyticsPage'
import AuditLogPage from './pages/AuditLogPage'
import CompliancePage from './pages/CompliancePage'
import FraudDashboardPage from './pages/FraudDashboardPage'
import BlacklistsPage from './pages/BlacklistsPage'
import FraudProfilesPage from './pages/FraudProfilesPage'
import ShaveDetectionPage from './pages/ShaveDetectionPage'
import FraudAnalyticsPage from './pages/FraudAnalyticsPage'
import FraudExperimentsPage from './pages/FraudExperimentsPage'

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
        <Route path="uad" element={<UADPage />} />
        <Route path="smart-routing" element={<SmartRoutingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/sessions" element={<SessionsPage />} />
        <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="fraud" element={<FraudDashboardPage />} />
        <Route path="fraud/blacklists" element={<BlacklistsPage />} />
        <Route path="fraud/profiles" element={<FraudProfilesPage />} />
        <Route path="fraud/shaves" element={<ShaveDetectionPage />} />
        <Route path="fraud/analytics" element={<FraudAnalyticsPage />} />
        <Route path="fraud/experiments" element={<FraudExperimentsPage />} />
        <Route path="status-groups" element={<StatusGroupsPage />} />
        <Route path="status-analytics" element={<StatusAnalyticsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="compliance" element={<CompliancePage />} />
      </Route>
    </Routes>
  )
}
