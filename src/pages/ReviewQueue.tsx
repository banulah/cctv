import { useEffect, useState } from 'react'
import { api, Identity } from '../services/api'
import Layout from '../components/Layout'

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

export default function ReviewQueue() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [identities, setIdentities] = useState<Identity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'reviewed' | 'all'>('open')
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
  }, [filter])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadReviewItems(),
        loadIdentities()
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadReviewItems = async () => {
    try {
      const status = filter === 'all' ? undefined : filter
      const items = await api.getReviewQueue(status, 50)
      setReviewItems(items)
    } catch (error) {
      console.error('Failed to load review items:', error)
    }
  }

  const loadIdentities = async () => {
    try {
      const data = await api.getIdentities()
      setIdentities(data)
    } catch (error) {
      console.error('Failed to load identities:', error)
    }
  }

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
        reviewed_by: 'admin', // TODO: Get from auth context
        notes: feedbackForm.notes || undefined
      })

      alert('✅ Feedback submitted! System is learning from your correction.')
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
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review uncertain identity recognitions and provide feedback to train the ML system
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['open', 'reviewed', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`${
                  filter === tab
                    ? 'border-blue-500 text-blue-600'
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

        {/* Review Items */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading review items...</p>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-sm text-gray-500">No items in review queue</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'open' ? 'All recognitions are confident or have been reviewed' : 'No review history yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewItems.map(item => (
              <div key={item.rq_id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-6">
                  {/* Snapshot Placeholder - Observations don't have snapshot URIs yet */}
                  <div className="flex-shrink-0 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded border border-gray-300 flex flex-col items-center justify-center text-center p-2">
                    <div className="text-4xl mb-1">👤</div>
                    <div className="text-xs text-gray-600 font-medium">Observation</div>
                    <div className="text-xs text-gray-500">#{item.obs_id}</div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Observation #{item.obs_id}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>Camera {item.camera_id}</span>
                          <span>•</span>
                          <span>{new Date(item.ts).toLocaleString()}</span>
                          <span>•</span>
                          <span>Track {item.observation?.track_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">Confidence Score</div>
                        <div className={`text-lg font-semibold ${getConfidenceColor(item.score)}`}>
                          {(item.score * 100).toFixed(1)}% ({getConfidenceLabel(item.score)})
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
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
                      <div className="text-sm text-gray-600 mb-3 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Reviewed by {item.reviewed_by}</span>
                          <span>on {new Date(item.reviewed_at).toLocaleString()}</span>
                        </div>
                        {item.notes && (
                          <div className="mt-1 text-gray-500">{item.notes}</div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {item.status === 'open' && (
                      <button
                        onClick={() => handleOpenFeedback(item)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
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
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add any additional context..."
                    />
                  </div>

                  {/* ML Learning Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-2xl mr-3">🧠</div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          Your feedback trains the AI system
                        </h4>
                        <p className="text-xs text-blue-700">
                          When you provide corrections, three ML systems learn:
                        </p>
                        <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
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
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
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
