import { useEffect, useState } from 'react'
import { api, Event, Camera, HotlistEntry, BASE_URL } from '../services/api'
import { wsService } from '../services/websocket'
import Layout from '../components/Layout'

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [filters, setFilters] = useState({ type: '', camera_id: '' })
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  // Hotlist state
  const [hotlistEntries, setHotlistEntries] = useState<HotlistEntry[]>([])
  const [showAddHotlist, setShowAddHotlist] = useState(false)
  const [hotlistFormData, setHotlistFormData] = useState({ plate_text: '', label: '' })
  const [activeTab, setActiveTab] = useState<'events' | 'hotlist'>('events')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)

    wsService.connect()
    const unsubscribe = wsService.onEvent(() => {
      loadData()
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [filters])

  useEffect(() => {
    const loadSnapshot = async () => {
      if (!selectedEvent) {
        setSnapshotUrl(null)
        return
      }

      setLoadingSnapshot(true)
      try {
        const result = await api.getSnapshotUrl(selectedEvent.id)
        setSnapshotUrl(result.url)
      } catch (error) {
        console.error('Failed to load snapshot:', error)
        setSnapshotUrl(null)
      } finally {
        setLoadingSnapshot(false)
      }
    }

    loadSnapshot()
  }, [selectedEvent])

  const loadData = async () => {
    const [cams, evts] = await Promise.all([
      api.getCameras().catch(() => []),
      api.getEvents().catch(() => [])
    ])
    // Ensure arrays before setting state
    setCameras(Array.isArray(cams) ? cams : [])
    setEvents(Array.isArray(evts) ? evts : [])
    loadHotlist()
  }

  const loadEvents = async () => {
    try {
      const data = await api.getEvents(
        filters.type || undefined,
        filters.camera_id ? parseInt(filters.camera_id) : undefined
      )
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setEvents(data)
      } else {
        console.warn('Events response is not an array:', data)
        setEvents([])
      }
    } catch (error) {
      console.error('Failed to load events:', error)
      setEvents([])
    }
  }

  const loadHotlist = async () => {
    try {
      const data = await api.getHotlist()
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setHotlistEntries(data)
      } else {
        console.warn('Hotlist response is not an array:', data)
        setHotlistEntries([])
      }
    } catch (error) {
      console.error('Failed to load hotlist:', error)
      setHotlistEntries([])
    }
  }

  const handleAddHotlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotlistFormData.plate_text) return

    try {
      await api.addHotlistEntry(hotlistFormData.plate_text, hotlistFormData.label || undefined)
      setHotlistFormData({ plate_text: '', label: '' })
      setShowAddHotlist(false)
      loadHotlist()
    } catch (error) {
      console.error('Failed to add hotlist entry:', error)
      alert('Failed to add hotlist entry')
    }
  }

  const isHotlistActive = (entry: HotlistEntry) => {
    const now = new Date()
    const from = entry.valid_from ? new Date(entry.valid_from) : null
    const to = entry.valid_to ? new Date(entry.valid_to) : null
    return (!from || from <= now) && (!to || to >= now)
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleString()
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'person': return '👤'
      case 'anpr': return '🚗'
      default: return '📋'
    }
  }

  const getRecognitionBadge = (event: Event) => {
    if (event.type !== 'person') return null

    const canonicalId = event.payload?.canonical_id
    const decision = event.payload?.decision

    if (canonicalId) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Known Person
        </span>
      )
    } else if (decision === 'provisional' || decision === 'provisional_cross_cam') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Under Review
        </span>
      )
    } else if (decision === 'unknown') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      )
    }
    return null
  }

  const getCameraName = (id: number) => {
    const cam = cameras.find(c => c.id === id)
    return cam ? cam.name : `Camera ${id}`
  }

  return (
    <Layout>
      <div className="pt-5 max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Events & Hotlist</h1>
          <p className="mt-2 text-sm text-gray-600">View system events and manage watchlist plates</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('events')}
                className={`${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('hotlist')}
                className={`${
                  activeTab === 'hotlist'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Hotlist ({hotlistEntries.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && (
          <>
            {/* Filters */}
            <div className="mb-6 bg-white shadow rounded-lg p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={filters.type}
                    onChange={e => setFilters({ ...filters, type: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="person">Person</option>
                    <option value="anpr">ANPR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camera</label>
                  <select
                    value={filters.camera_id}
                    onChange={e => setFilters({ ...filters, camera_id: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Cameras</option>
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id.toString()}>{cam.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ type: '', camera_id: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Events ({events.length})
                </h2>
                <div className="space-y-3 max-h-[800px] overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-sm text-gray-500">No events found</p>
                  ) : (
                    events.map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEvent?.id === event.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded overflow-hidden border border-gray-200 flex items-center justify-center">
                            {/* Show snapshot for person events with obs_id, or ANPR events */}
                            {(event.type === 'person' && event.payload?.obs_id) || event.type === 'anpr' ? (
                              <>
                                <img
                                  src={event.type === 'person'
                                    ? `${BASE_URL}/api/media/snapshot/${event.payload.obs_id}`
                                    : `${BASE_URL}/api/media/snapshot/${event.id}`}
                                  alt="Snapshot"
                                  className="w-full h-full object-cover"
                                  crossOrigin="use-credentials"
                                  onError={(e) => {
                                    // Hide image and show icon on error
                                    e.currentTarget.classList.add('hidden')
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      parent.classList.add('flex', 'items-center', 'justify-center')
                                      parent.innerHTML = `<div class="text-2xl">${getEventIcon(event.type)}</div>`
                                    }
                                  }}
                                />
                              </>
                            ) : (
                              <div className="text-2xl">{getEventIcon(event.type)}</div>
                            )}
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {event.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                #{event.id}
                              </span>
                            </div>

                            {/* Key Info */}
                            {event.type === 'person' && event.payload?.canonical_id && (
                              <div className="mt-1 text-xs text-gray-700 font-medium">
                                ID: {event.payload.canonical_id}
                              </div>
                            )}
                            {event.type === 'anpr' && event.payload?.plate_text && (
                              <div className="mt-1 text-sm text-gray-900 font-mono font-bold">
                                {event.payload.plate_text}
                              </div>
                            )}

                            <div className="mt-1 text-xs text-gray-600">
                              {getCameraName(event.camera_id)} • {formatTime(event.ts)}
                            </div>

                            {/* Badges */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {event.type === 'anpr' && event.payload?.hotlist_match && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Hotlist
                                </span>
                              )}
                              {getRecognitionBadge(event)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg sticky top-6">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Event Details</h2>
                {selectedEvent ? (
                  <div className="space-y-4">
                    {/* Snapshot Image */}
                    {loadingSnapshot ? (
                      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-sm text-gray-500">Loading snapshot...</div>
                      </div>
                    ) : snapshotUrl ? (
                      <div className="relative">
                        <img
                          src={snapshotUrl}
                          alt="Detection snapshot"
                          className="w-full rounded-lg border border-gray-200 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <div className="text-xs text-gray-500">Snapshot unavailable</div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <div className="text-xs text-gray-500">No snapshot available</div>
                      </div>
                    )}

                    {/* Recognition/ANPR Info */}
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                      {selectedEvent.type === 'anpr' && selectedEvent.payload?.hotlist_match && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Hotlist Match
                        </span>
                      )}
                      {getRecognitionBadge(selectedEvent)}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500">Type</label>
                      <div className="mt-1 text-sm text-gray-900 capitalize">{selectedEvent.type}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Camera</label>
                      <div className="mt-1 text-sm text-gray-900">{getCameraName(selectedEvent.camera_id)}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Timestamp</label>
                      <div className="mt-1 text-sm text-gray-900">{formatTime(selectedEvent.ts)}</div>
                    </div>

                    {/* Key Payload Details */}
                    {selectedEvent.type === 'person' && selectedEvent.payload && (
                      <div className="space-y-2">
                        {selectedEvent.payload.canonical_id && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Identity ID</label>
                            <div className="mt-1 text-sm text-gray-900 font-mono">{selectedEvent.payload.canonical_id}</div>
                          </div>
                        )}
                        {selectedEvent.payload.track_id && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Track ID</label>
                            <div className="mt-1 text-sm text-gray-900">#{selectedEvent.payload.track_id}</div>
                          </div>
                        )}
                        {selectedEvent.payload.similarity && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Match Confidence</label>
                            <div className="mt-1 text-sm text-gray-900">{(selectedEvent.payload.similarity * 100).toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedEvent.type === 'anpr' && selectedEvent.payload && (
                      <div className="space-y-2">
                        {selectedEvent.payload.plate_text && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">License Plate</label>
                            <div className="mt-1 text-lg font-mono font-bold text-gray-900">{selectedEvent.payload.plate_text}</div>
                          </div>
                        )}
                        {selectedEvent.payload.confidence && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Detection Confidence</label>
                            <div className="mt-1 text-sm text-gray-900">{(selectedEvent.payload.confidence * 100).toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Full Payload (Collapsible) */}
                    {selectedEvent.payload && (
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1">
                          <span className="transform group-open:rotate-90 transition-transform">▶</span>
                          Full Payload Data
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64 border border-gray-200">
                          {JSON.stringify(selectedEvent.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select an event to view details</p>
                )}
              </div>
            </div>
          </div>
            </div>
          </>
        )}

        {/* Hotlist Tab */}
        {activeTab === 'hotlist' && (
          <>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowAddHotlist(!showAddHotlist)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                {showAddHotlist ? 'Cancel' : '+ Add Entry'}
              </button>
            </div>

            {showAddHotlist && (
              <div className="mb-6 bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Add Hotlist Entry</h2>
                <form onSubmit={handleAddHotlist} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Plate</label>
                    <input
                      type="text"
                      value={hotlistFormData.plate_text}
                      onChange={e => setHotlistFormData({ ...hotlistFormData, plate_text: e.target.value.toUpperCase() })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ABC123"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Label (Optional)</label>
                    <input
                      type="text"
                      value={hotlistFormData.label}
                      onChange={e => setHotlistFormData({ ...hotlistFormData, label: e.target.value })}
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Hotlist Entries ({hotlistEntries.length})</h2>
                {hotlistEntries.length === 0 ? (
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
                        {hotlistEntries.map(entry => (
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
                                isHotlistActive(entry)
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isHotlistActive(entry) ? 'Active' : 'Inactive'}
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
          </>
        )}
      </div>
    </Layout>
  )
}
