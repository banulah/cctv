import { useEffect, useState } from 'react'
import { api, HotlistEntry } from '../services/api'
import Layout from '../components/Layout'

export default function Hotlist() {
  const [entries, setEntries] = useState<HotlistEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [formData, setFormData] = useState({ plate_text: '', label: '' })

  useEffect(() => {
    loadHotlist()
  }, [])

  const loadHotlist = async () => {
    try {
      const data = await api.getHotlist()
      setEntries(data)
    } catch (error) {
      console.error('Failed to load hotlist:', error)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plate_text) return

    try {
      await api.addHotlistEntry(formData.plate_text, formData.label || undefined)
      setFormData({ plate_text: '', label: '' })
      setShowAdd(false)
      loadHotlist()
    } catch (error) {
      console.error('Failed to add hotlist entry:', error)
      alert('Failed to add hotlist entry')
    }
  }

  const isActive = (entry: HotlistEntry) => {
    const now = new Date()
    const from = entry.valid_from ? new Date(entry.valid_from) : null
    const to = entry.valid_to ? new Date(entry.valid_to) : null
    return (!from || from <= now) && (!to || to >= now)
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hotlist</h1>
            <p className="mt-2 text-sm text-gray-600">Manage watchlist plates for alerts</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            {showAdd ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add Hotlist Entry</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">License Plate</label>
                <input
                  type="text"
                  value={formData.plate_text}
                  onChange={e => setFormData({ ...formData, plate_text: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABC123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Label (Optional)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., VIP, Watchlist, Stolen"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                Add to Hotlist
              </button>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Hotlist Entries ({entries.length})</h2>
            {entries.length === 0 ? (
              <p className="text-sm text-gray-500">No hotlist entries. Add one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Label
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map(entry => (
                      <tr key={entry.entry_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.plate_text}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.label || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {entry.valid_from ? new Date(entry.valid_from).toLocaleDateString() : 'Always'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {entry.valid_to ? new Date(entry.valid_to).toLocaleDateString() : 'Always'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isActive(entry)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive(entry) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

