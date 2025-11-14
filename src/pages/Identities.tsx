import { useEffect, useState } from 'react'
import { api, Identity } from '../services/api'
import Layout from '../components/Layout'

interface ProvisionalIdentity {
  provisional_id: string
  detections: number
  first_seen: string
  last_seen: string
  sample_event_id: number
}

interface ReviewItem {
  rq_id: number
  obs_id: number
  candidate_id: string | null
  camera_id: number
  ts: string
  status: string
  score: number
  notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  observation: {
    bbox: any
    fused_score: number
    provisional_id: string | null
    canonical_id: string | null
    track_id: number
  } | null
}

export default function Identities() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [provisionals, setProvisionals] = useState<ProvisionalIdentity[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Identity | null>(null)
  const [formData, setFormData] = useState({ display_name: '', role: '', notes: '' })
  const [activeTab, setActiveTab] = useState<'provisional' | 'known' | 'review'>('provisional')
  const [stats, setStats] = useState({ total_events: 0, unique_provisionals: 0, known_identities: 0 })

  // Review Queue state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [reviewFilter, setReviewFilter] = useState<'open' | 'reviewed' | 'all'>('open')
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    is_correct: false,
    corrected_canonical_id: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [reviewFilter])

  const loadIdentities = async () => {
    try {
      const data = await api.getIdentities()
      setIdentities(data)
    } catch (error) {
      console.error('Failed to load identities:', error)
    }
  }

  const loadProvisionals = async () => {
    try {
      const response = await fetch('/api/events?type=person')
      const events = await response.json()

      // Group by provisional_id
      const provMap = new Map<string, ProvisionalIdentity>()

      events.forEach((event: any) => {
        const provId = event.payload?.provisional_id
        if (!provId) return

        const existing = provMap.get(provId)
        if (!existing) {
          provMap.set(provId, {
            provisional_id: provId,
            detections: 1,
            first_seen: event.ts,
            last_seen: event.ts,
            sample_event_id: event.id
          })
        } else {
          existing.detections++
          if (event.ts > existing.last_seen) {
            existing.last_seen = event.ts
            existing.sample_event_id = event.id
          }
          if (event.ts < existing.first_seen) {
            existing.first_seen = event.ts
          }
        }
      })

      // Convert to array and sort by detection count
      const provArray = Array.from(provMap.values())
        .sort((a, b) => b.detections - a.detections)
        .slice(0, 50) // Show top 50

      setProvisionals(provArray)
    } catch (error) {
      console.error('Failed to load provisionals:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/events?type=person')
      const events = await response.json()

      const uniqueProvisionals = new Set(
        events.map((e: any) => e.payload?.provisional_id).filter(Boolean)
      ).size

      const knownCount = identities.length

      setStats({
        total_events: events.length,
        unique_provisionals: uniqueProvisionals,
        known_identities: knownCount
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadReviewItems = async () => {
    try {
      const status = reviewFilter === 'all' ? undefined : reviewFilter
      const items = await api.getReviewQueue(status, 50)
      setReviewItems(items)
    } catch (error) {
      console.error('Failed to load review items:', error)
    }
  }

  const loadData = async () => {
    await Promise.all([
      loadIdentities(),
      loadProvisionals(),
      loadStats(),
      loadReviewItems()
    ])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createIdentity(formData)
      setFormData({ display_name: '', role: '', notes: '' })
      setShowAdd(false)
      loadData()
    } catch (error) {
      console.error('Failed to create identity:', error)
      alert('Failed to create identity')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await api.updateIdentity(editing.canonical_id, formData)
      setEditing(null)
      setFormData({ display_name: '', role: '', notes: '' })
      loadData()
    } catch (error) {
      console.error('Failed to update identity:', error)
      alert('Failed to update identity')
    }
  }

  const startEdit = (identity: Identity) => {
    setEditing(identity)
    setFormData({
      display_name: identity.display_name || '',
      role: identity.role || '',
      notes: identity.notes || ''
    })
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleString()
  }

  const formatDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '< 1 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Review Queue functions
  const handleOpenFeedback = (item: ReviewItem) => {
    setSelectedItem(item)
    setFeedbackForm({
      is_correct: false,
      corrected_canonical_id: item.observation?.canonical_id || '',
      notes: ''
    })
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    setSubmitting(true)
    try {
      await api.submitFeedback({
        rq_id: selectedItem.rq_id,
        is_correct: feedbackForm.is_correct,
        corrected_canonical_id: feedbackForm.corrected_canonical_id || undefined,
        reviewed_by: 'admin',
        notes: feedbackForm.notes || undefined
      })

      alert('Feedback submitted! System is learning from your correction.')
      setSelectedItem(null)
      loadData()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback: ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.8) return 'text-blue-600'
    if (score >= 0.7) return 'text-amber-600'
    return 'text-red-600'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'High'
    if (score >= 0.8) return 'Medium'
    if (score >= 0.7) return 'Low'
    return 'Very Low'
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pt-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Identity Recognition</h1>
          <p className="mt-2 text-sm text-gray-600">
            AI-powered person identification and tracking system
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Detections</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.total_events.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">🔍</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unique Persons</dt>
                    <dd className="text-2xl font-semibold text-amber-600">{stats.unique_provisionals}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-500">Waiting for identification</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Known Identities</dt>
                    <dd className="text-2xl font-semibold text-blue-600">{stats.known_identities}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => {
                    setShowAdd(true)
                    setActiveTab('known')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Identity
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAdd || editing) && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editing ? 'Edit Identity' : 'Add New Identity'}
            </h2>
            <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Display Name *</label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Employee, Visitor, Admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editing ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false)
                    setEditing(null)
                    setFormData({ display_name: '', role: '', notes: '' })
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('provisional')}
              className={`${
                activeTab === 'provisional'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">🔍</span>
              Detected Persons
              <span className="ml-2 py-0.5 px-2 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                {provisionals.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('known')}
              className={`${
                activeTab === 'known'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">✅</span>
              Known Identities
              <span className="ml-2 py-0.5 px-2 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                {identities.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`${
                activeTab === 'review'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">🧠</span>
              Review Queue
              {reviewItems.filter(i => i.status === 'open').length > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                  {reviewItems.filter(i => i.status === 'open').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Provisional Identities Tab */}
        {activeTab === 'provisional' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Detected Persons (Provisional IDs)
                </h2>
                <span className="text-sm text-gray-500">
                  Top {provisionals.length} by detection count
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                These are unique persons automatically detected by the AI system. They are assigned provisional IDs until manually identified.
              </p>
              {provisionals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-sm text-gray-500">No provisional detections yet</p>
                  <p className="text-xs text-gray-400 mt-1">The system will automatically detect and track persons</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {provisionals.map(prov => (
                    <div key={prov.provisional_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Thumbnail Placeholder */}
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
                          <img
                            src={`/api/media/snapshot/${prov.sample_event_id}`}
                            alt="Detection"
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                const placeholder = document.createElement('div')
                                placeholder.className = 'text-2xl'
                                placeholder.textContent = '👤'
                                parent.appendChild(placeholder)
                              }
                            }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Unknown Person
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-1 break-all">
                                ID: {prov.provisional_id.substring(0, 18)}...
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {prov.detections} detections
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">First seen:</span> {formatTime(prov.first_seen)}
                            </div>
                            <div>
                              <span className="font-medium">Last seen:</span> {formatTime(prov.last_seen)}
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            Duration: {formatDuration(prov.first_seen, prov.last_seen)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0">
                          <a
                            href={`/events?provisional_id=${prov.provisional_id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Events →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Known Identities Tab */}
        {activeTab === 'known' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Known Identities
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Manually identified persons with assigned names and roles.
              </p>
              {identities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👥</div>
                  <p className="text-sm text-gray-500 mb-3">No known identities yet</p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + Add First Identity
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {identities.map(identity => (
                    <div key={identity.canonical_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {identity.display_name || 'Unnamed Identity'}
                          </h3>
                          <div className="mt-2 space-y-1">
                            {identity.role && (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {identity.role}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 break-all mt-2">
                              ID: {identity.canonical_id}
                            </div>
                            {identity.notes && (
                              <div className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                                {identity.notes}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Created: {new Date(identity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => startEdit(identity)}
                        className="mt-3 w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Queue Tab */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 px-6 pt-4">
                <nav className="-mb-px flex space-x-8">
                  {(['open', 'reviewed', 'all'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setReviewFilter(tab)}
                      className={`${
                        reviewFilter === tab
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                    >
                      {tab}
                      {tab === 'open' && reviewItems.filter(i => i.status === 'open').length > 0 && (
                        <span className="ml-2 py-0.5 px-2 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                          {reviewItems.filter(i => i.status === 'open').length}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm text-gray-600 mb-4">
                  Review uncertain identity recognitions and provide feedback to train the ML system
                </p>

                {/* Review Items */}
                {reviewItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-sm text-gray-500">No items in review queue</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {reviewFilter === 'open' ? 'All recognitions are confident or have been reviewed' : 'No review history yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewItems.map(item => (
                      <div key={item.rq_id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Snapshot */}
                          <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded border border-gray-300 flex flex-col items-center justify-center text-center p-2">
                            <div className="text-3xl mb-1">👤</div>
                            <div className="text-xs text-gray-600 font-medium">Obs</div>
                            <div className="text-xs text-gray-500">#{item.obs_id}</div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="text-base font-medium text-gray-900">
                                  Observation #{item.obs_id}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>Camera {item.camera_id}</span>
                                  <span>•</span>
                                  <span>{new Date(item.ts).toLocaleString()}</span>
                                  <span>•</span>
                                  <span>Track {item.observation?.track_id}</span>
                                </div>
                              </div>
                              <div>
                                {item.status === 'open' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Needs Review
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Reviewed
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recognition Details */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="bg-white rounded p-2">
                                <div className="text-xs text-gray-500 mb-1">Confidence Score</div>
                                <div className={`text-base font-semibold ${getConfidenceColor(item.score)}`}>
                                  {(item.score * 100).toFixed(1)}% ({getConfidenceLabel(item.score)})
                                </div>
                              </div>
                              <div className="bg-white rounded p-2">
                                <div className="text-xs text-gray-500 mb-1">Current Identity</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.observation?.canonical_id ? (
                                    <>
                                      {identities.find(i => i.canonical_id === item.observation?.canonical_id)?.display_name || 'Unknown'}
                                    </>
                                  ) : item.observation?.provisional_id ? (
                                    <span className="text-amber-600">Unknown Person</span>
                                  ) : (
                                    <span className="text-gray-400">Unidentified</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Review Info */}
                            {item.reviewed_at && (
                              <div className="text-sm text-gray-600 mb-2 border-t border-gray-200 pt-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-medium">Reviewed by {item.reviewed_by}</span>
                                  <span>on {new Date(item.reviewed_at).toLocaleString()}</span>
                                </div>
                                {item.notes && (
                                  <div className="mt-1 text-gray-500 text-xs">{item.notes}</div>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            {item.status === 'open' && (
                              <button
                                onClick={() => handleOpenFeedback(item)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                              >
                                Provide Feedback
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Review Observation #{selectedItem.obs_id}
                </h2>

                {/* Snapshot */}
                <div className="mb-6">
                  <img
                    src={`/api/media/snapshot/${selectedItem.obs_id}`}
                    alt="Detection"
                    className="w-full max-w-md mx-auto rounded border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjY0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4='
                    }}
                  />
                </div>

                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  {/* Is Correct? */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Is the recognition correct?
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFeedbackForm({ ...feedbackForm, is_correct: true })}
                        className={`flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-colors ${
                          feedbackForm.is_correct
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        ✓ Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackForm({ ...feedbackForm, is_correct: false })}
                        className={`flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-colors ${
                          !feedbackForm.is_correct
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        ✗ Incorrect
                      </button>
                    </div>
                  </div>

                  {/* Correction */}
                  {!feedbackForm.is_correct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Identity
                      </label>
                      <select
                        value={feedbackForm.corrected_canonical_id}
                        onChange={e => setFeedbackForm({ ...feedbackForm, corrected_canonical_id: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        required={!feedbackForm.is_correct}
                      >
                        <option value="">Select correct identity...</option>
                        {identities.map(identity => (
                          <option key={identity.canonical_id} value={identity.canonical_id}>
                            {identity.display_name} {identity.role && `(${identity.role})`}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        The ML system will learn from this correction to improve future recognition
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={feedbackForm.notes}
                      onChange={e => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                      rows={3}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Add any additional context..."
                    />
                  </div>

                  {/* ML Learning Info */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-2xl mr-3">🧠</div>
                      <div>
                        <h4 className="text-sm font-medium text-purple-900 mb-1">
                          Your feedback trains the AI system
                        </h4>
                        <p className="text-xs text-purple-700">
                          When you provide corrections, three ML systems learn:
                        </p>
                        <ul className="text-xs text-purple-700 mt-1 ml-4 list-disc">
                          <li><strong>Threshold Adaptation:</strong> Adjusts confidence thresholds</li>
                          <li><strong>Metric Learning:</strong> Refines embedding distance metric</li>
                          <li><strong>RL Agent:</strong> Learns better cluster merging decisions</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(null)}
                      disabled={submitting}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
