export default function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace</h3>
          <p className="text-gray-500">Workspace settings will appear here.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
          <p className="text-gray-500">Manage your API keys here.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <p className="text-gray-500">Configure notification preferences.</p>
        </div>
      </div>
    </div>
  )
}
