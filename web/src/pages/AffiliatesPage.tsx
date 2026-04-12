export default function AffiliatesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Affiliates</h2>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
          Add Affiliate
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">No affiliates configured yet.</p>
      </div>
    </div>
  )
}
