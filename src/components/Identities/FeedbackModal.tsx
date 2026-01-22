import { useState } from 'react'
import { ReviewItem, Identity } from '../../types/identities'

interface FeedbackModalProps {
  selectedItem: ReviewItem
  identities: Identity[]
  onClose: () => void
  onSubmit: (data: {
    is_correct: boolean
    corrected_canonical_id?: string
    notes: string
    newIdentityName?: string
  }) => Promise<void>
}

export default function FeedbackModal({ selectedItem, identities, onClose, onSubmit }: FeedbackModalProps) {
  const [feedbackForm, setFeedbackForm] = useState({
    is_correct: false,
    corrected_canonical_id: selectedItem.observation?.canonical_id || '',
    notes: ''
  })
  const [showCreateIdentity, setShowCreateIdentity] = useState(false)
  const [newIdentityName, setNewIdentityName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        is_correct: feedbackForm.is_correct,
        corrected_canonical_id: feedbackForm.corrected_canonical_id || undefined,
        notes: feedbackForm.notes,
        newIdentityName: showCreateIdentity ? newIdentityName : undefined
      })
      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback: ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Enhanced Header with Confidence Badge */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Review Observation #{selectedItem.obs_id}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Camera {selectedItem.camera_id} • {new Date(selectedItem.ts).toLocaleString()}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
              selectedItem.score >= 0.7
                ? 'bg-green-100 text-green-800 border-green-300'
                : selectedItem.score >= 0.6
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-red-100 text-red-800 border-red-300'
            }`}>
              {(selectedItem.score * 100).toFixed(1)}% confidence
            </div>
          </div>

          {/* Snapshot - Conditional Layout */}
          <div className="mb-6">
            {feedbackForm.is_correct && selectedItem.candidate?.representative_obs_id ? (
              /* Comparison View - Side by Side */
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Compare the detection with the existing identity:
                </p>
                <div className="flex gap-4 justify-center">
                  {/* Current Detection */}
                  <div className="flex flex-col items-center">
                    <img
                      src={`/api/media/snapshot/${selectedItem.obs_id}`}
                      alt="Current Detection"
                      className="h-48 w-auto rounded border border-gray-300"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4='
                      }}
                    />
                    <p className="text-xs text-gray-600 mt-2 font-medium">Current Detection</p>
                  </div>

                  {/* Existing Identity */}
                  <div className="flex flex-col items-center">
                    <img
                      src={`/api/media/snapshot/${selectedItem.candidate.representative_obs_id}`}
                      alt={selectedItem.candidate.display_name || 'Known Identity'}
                      className="h-48 w-auto rounded border border-purple-300"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4='
                      }}
                    />
                    <p className="text-xs text-gray-600 mt-2 font-medium">
                      {selectedItem.candidate.display_name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Image - Centered */
              <div className="flex justify-center">
                <img
                  src={`/api/media/snapshot/${selectedItem.obs_id}`}
                  alt="Detection"
                  className="w-64 h-64 object-cover rounded border border-gray-300"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjY0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4='
                  }}
                />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={showCreateIdentity ? '__CREATE_NEW__' : feedbackForm.corrected_canonical_id}
                  onChange={e => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setShowCreateIdentity(true)
                    } else {
                      setShowCreateIdentity(false)
                      setFeedbackForm({ ...feedbackForm, corrected_canonical_id: e.target.value })
                    }
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required={!feedbackForm.is_correct}
                >
                  <option value="">Select correct identity...</option>
                  {identities.map(identity => (
                    <option key={identity.canonical_id} value={identity.canonical_id}>
                      {identity.display_name} {identity.role && `(${identity.role})`}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__">➕ Create New Identity...</option>
                </select>

                {/* Create New Identity Form */}
                {showCreateIdentity && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      New Identity Name
                    </label>
                    <input
                      type="text"
                      value={newIdentityName}
                      onChange={e => setNewIdentityName(e.target.value)}
                      placeholder="Enter person's name..."
                      className="block w-full border border-blue-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="mt-2 text-xs text-blue-700">
                      This will create a new identity and assign all observations with this provisional ID to them.
                    </p>
                  </div>
                )}

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
                  <ul className="mt-2 text-xs text-purple-700 space-y-1">
                    <li>• <strong>Threshold Adaptation:</strong> Adjusts confidence thresholds</li>
                    <li>• <strong>Metric Learning:</strong> Refines embedding space to better separate identities</li>
                    <li>• <strong>RL Agent:</strong> Learns better cluster merging decisions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || (!feedbackForm.is_correct && !feedbackForm.corrected_canonical_id && !showCreateIdentity)}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
