export default function DashboardPage() {
  const stats = [
    { label: 'Leads Today', value: '\u2014', change: '' },
    { label: 'Delivered', value: '\u2014', change: '' },
    { label: 'Conversion Rate', value: '\u2014', change: '' },
    { label: 'Revenue', value: '\u2014', change: '' },
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</div>
            <div className="text-sm text-gray-400 mt-1">{stat.change}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <p className="text-gray-500">Connect to the API to see live data.</p>
      </div>
    </div>
  )
}
