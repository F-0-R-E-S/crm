import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { usePermissions } from '../hooks/usePermissions'
import { api } from '../lib/api'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { has, role } = usePermissions()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }

    setPwLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
      setPwSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="text-gray-900 font-medium">{user?.name || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-gray-900 font-medium">{user?.email || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Role</span>
              <p className="text-gray-900 font-medium capitalize">{role.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          {pwError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{pwError}</div>}
          {pwSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{pwSuccess}</div>}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" required />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" required minLength={8} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" required minLength={8} />
            <button type="submit" disabled={pwLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sessions</h3>
          <p className="text-sm text-gray-500 mb-3">View and manage your active sessions.</p>
          <Link to="/settings/sessions" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            Manage Sessions &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h3>
          <p className="text-sm text-gray-500 mb-3">Configure Telegram, email, and webhook notifications.</p>
          <Link to="/settings/notifications" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            Configure Notifications &rarr;
          </Link>
        </div>

        {has('apikeys:read') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
            <p className="text-gray-500 text-sm">Manage your API keys for affiliate access.</p>
          </div>
        )}
      </div>
    </div>
  )
}
