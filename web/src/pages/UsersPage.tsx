import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import PermissionGate from '../components/PermissionGate'
import clsx from 'clsx'

interface User {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  is_2fa_enabled: boolean
  last_login_at: string | null
  created_at: string
}

interface InviteItem {
  id: string
  email: string
  role: string
  name: string
  expires_at: string
  created_at: string
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'network_admin', label: 'Network Admin' },
  { value: 'affiliate_manager', label: 'Affiliate Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'media_buyer', label: 'Media Buyer' },
  { value: 'finance_manager', label: 'Finance Manager' },
]

export default function UsersPage() {
  const { has } = usePermissions()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('media_buyer')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: User[]; total: number }>('/users?limit=100'),
  })

  const { data: invitesData, refetch: refetchInvites } = useQuery({
    queryKey: ['invites'],
    queryFn: () => api.get<{ invites: InviteItem[] }>('/auth/invites'),
    enabled: has('users:invite'),
  })

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviteLoading(true)
    try {
      await api.post('/auth/invites', { email: inviteEmail, role: inviteRole, name: inviteName })
      setInviteSuccess(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
      setShowInvite(false)
      refetchInvites()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole })
      refetchUsers()
    } catch { /* ignore */ }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await api.post(`/users/${userId}/${isActive ? 'deactivate' : 'activate'}`, {})
      refetchUsers()
    } catch { /* ignore */ }
  }

  async function handleDeleteInvite(inviteId: string) {
    try {
      await api.delete(`/auth/invites/${inviteId}`)
      refetchInvites()
    } catch { /* ignore */ }
  }

  const users = usersData?.users || []
  const invites = invitesData?.invites || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
        <PermissionGate permission="users:invite">
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
          >
            Invite User
          </button>
        </PermissionGate>
      </div>

      {inviteSuccess && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{inviteSuccess}</div>
      )}

      {showInvite && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New User</h3>
          {inviteError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{inviteError}</div>
          )}
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Name"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">2FA</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{u.name || u.email}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {has('users:write') ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-gray-700">
                      {ROLES.find((r) => r.value === u.role)?.label || u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('text-xs', u.is_2fa_enabled ? 'text-green-600' : 'text-gray-400')}>
                    {u.is_2fa_enabled ? 'Enabled' : 'Off'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <PermissionGate permission="users:delete">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{inv.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ROLES.find((r) => r.value === inv.role)?.label || inv.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteInvite(inv.id)} className="text-xs text-red-600 hover:text-red-700">
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
