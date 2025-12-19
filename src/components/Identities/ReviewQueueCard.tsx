import { useState } from 'react'
import { ReviewItem, Identity } from '../../types/identities'

interface ReviewQueueCardProps {
  item: ReviewItem
  identities: Identity[]
  onSubmitFeedback: (data: {
    rq_id: number
    is_correct: boolean
    corrected_canonical_id?: string
    notes: string
    newIdentityName?: string
  }) => Promise<void>
}

const getConfidenceBgColor = (score: number): string => {
  if (score >= 0.7) return 'bg-green-100 text-green-800 border-green-300'
  if (score >= 0.6) return 'bg-amber-100 text-amber-800 border-amber-300'
  return 'bg-red-100 text-red-800 border-red-300'
}

export default function ReviewQueueCard({ item, identities, onSubmitFeedback }: ReviewQueueCardProps) {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctedId, setCorrectedId] = useState('')
  const [showCreateIdentity, setShowCreateIdentity] = useState(false)
  const [newIdentityName, setNewIdentityName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCorrect = async () => {
    setSubmitting(true)
    try {
      await onSubmitFeedback({
        rq_id: item.rq_id,
        is_correct: true,
        notes: notes
      })
      setNotes('')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleIncorrect = () => {
    setShowCorrectionForm(true)
  }

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmitFeedback({
        rq_id: item.rq_id,
        is_correct: false,
        corrected_canonical_id: correctedId || undefined,
        notes: notes,
        newIdentityName: showCreateIdentity ? newIdentityName : undefined
      })

      // Reset form
      setShowCorrectionForm(false)
      setCorrectedId('')
      setShowCreateIdentity(false)
      setNewIdentityName('')
      setNotes('')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Get the representative image for the candidate identity
  // For "Unknown Person" (provisional ID without candidate), show the current observation image
  const candidateImageId = item.candidate?.representative_obs_id ||
    (item.observation?.provisional_id ? item.obs_id : null)

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Observation #{item.obs_id}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
              <span className="font-medium">Camera {item.camera_id}</span>
              <span>•</span>
              <span>{new Date(item.ts).toLocaleString()}</span>
              {item.observation?.track_id && (
                <>
                  <span>•</span>
                  <span>Track {item.observation.track_id}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getConfidenceBgColor(item.score)}`}>
              {(item.score * 100).toFixed(1)}%
            </div>
            {item.status === 'open' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Needs Review
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                ✓ Reviewed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Comparison Section */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Current Observation */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5 text-center">
              Current Observation
            </div>
            <div className="relative">
              <div className="h-48 rounded-lg border-2 border-gray-300 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <img
                  src={`/api/media/snapshot/${item.obs_id}`}
                  alt="Current Detection"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                        <div class="text-5xl mb-1">👤</div>
                        <div class="text-xs text-gray-600 font-medium">No Image</div>
                      </div>
                    `
                  }}
                />
              </div>
            </div>
          </div>

          {/* System's Identification */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5 text-center">
              System Identified As
            </div>
            <div className="relative">
              <div className="h-48 rounded-lg border-2 border-purple-400 overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                {candidateImageId ? (
                  <img
                    src={`/api/media/snapshot/${candidateImageId}`}
                    alt={item.candidate?.display_name || 'Known Person'}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col items-center justify-center">
                          <div class="text-5xl mb-1">👤</div>
                          <div class="text-xs text-purple-700 font-medium">${item.candidate?.display_name || 'Known Person'}</div>
                        </div>
                      `
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="text-5xl mb-1">👤</div>
                    <div className="text-xs text-amber-600 font-medium">
                      {item.observation?.provisional_id ? 'Unknown Person' : 'No Match'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-1.5 text-center">
              <div className="text-sm font-bold text-gray-900">
                {item.candidate?.display_name || (
                  item.observation?.provisional_id ? (
                    <span className="text-amber-600">Unknown Person</span>
                  ) : (
                    <span className="text-gray-400">Unidentified</span>
                  )
                )}
              </div>
              {item.candidate?.role && (
                <div className="text-xs text-gray-500 mt-0.5">{item.candidate.role}</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (if open and not showing form) */}
        {item.status === 'open' && !showCorrectionForm && (
          <div className="flex gap-2">
            <button
              onClick={handleCorrect}
              disabled={submitting}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>✓</span>
              <span>Correct</span>
            </button>
            <button
              onClick={handleIncorrect}
              disabled={submitting}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>✗</span>
              <span>Incorrect</span>
            </button>
          </div>
        )}

        {/* Already Reviewed Info */}
        {item.reviewed_at && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-green-800">
              <span className="font-semibold">✓ Reviewed by {item.reviewed_by}</span>
              <span>•</span>
              <span>{new Date(item.reviewed_at).toLocaleString()}</span>
            </div>
            {item.notes && (
              <div className="mt-1.5 text-xs text-green-700">{item.notes}</div>
            )}
          </div>
        )}
      </div>

      {/* Correction Form */}
      {showCorrectionForm && (
        <div className="border-t border-gray-200 bg-red-50 p-6">
          <form onSubmit={handleSubmitCorrection} className="space-y-4">
            <div className="text-base font-semibold text-red-900 mb-3">
              Who is this person?
            </div>

            {/* Select Correct Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Correct Identity
              </label>
              <select
                value={showCreateIdentity ? '__CREATE_NEW__' : correctedId}
                onChange={e => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setShowCreateIdentity(true)
                    setCorrectedId('')
                  } else {
                    setShowCreateIdentity(false)
                    setCorrectedId(e.target.value)
                  }
                }}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="">Select identity...</option>
                {identities.map(identity => (
                  <option key={identity.canonical_id} value={identity.canonical_id}>
                    {identity.display_name} {identity.role && `(${identity.role})`}
                  </option>
                ))}
                <option value="__CREATE_NEW__">➕ Create New Identity...</option>
              </select>

              {/* Create New Identity Inline */}
              {showCreateIdentity && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <input
                    type="text"
                    value={newIdentityName}
                    onChange={e => setNewIdentityName(e.target.value)}
                    placeholder="Enter person's name..."
                    className="block w-full border border-blue-400 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Add any additional context..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || (!correctedId && !newIdentityName.trim())}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Correction'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCorrectionForm(false)
                  setCorrectedId('')
                  setShowCreateIdentity(false)
                  setNewIdentityName('')
                  setNotes('')
                }}
                disabled={submitting}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
