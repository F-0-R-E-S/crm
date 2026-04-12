export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads Over Time</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion by Broker</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div>
        </div>
      </div>
    </div>
  )
}
