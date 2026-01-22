import { useState } from 'react'
import { ProvisionalIdentity, Identity } from '../../types/identities'

interface ProvisionalIdentityCardProps {
  identity: ProvisionalIdentity
  knownIdentities: Identity[]
  onPromoteToKnown?: (provisionalId: string, canonicalId: string) => Promise<void>
  onCreateNewIdentity?: (provisionalId: string, name: string) => Promise<void>
}

export default function ProvisionalIdentityCard({
  identity,
  knownIdentities,
  onPromoteToKnown,
  onCreateNewIdentity
}: ProvisionalIdentityCardProps) {
  const [showPromoteOptions, setShowPromoteOptions] = useState(false)
  const [showNewIdentityForm, setShowNewIdentityForm] = useState(false)
  const [selectedIdentityId, setSelectedIdentityId] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePromoteToExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIdentityId || !onPromoteToKnown) return

    setSaving(true)
    try {
      await onPromoteToKnown(identity.provisional_id, selectedIdentityId)
      setShowPromoteOptions(false)
      setSelectedIdentityId('')
    } catch (error) {
      console.error('Failed to promote:', error)
      alert('Failed to promote identity')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !onCreateNewIdentity) return

    setSaving(true)
    try {
      await onCreateNewIdentity(identity.provisional_id, newName.trim())
      setShowNewIdentityForm(false)
      setNewName('')
    } catch (error) {
      console.error('Failed to create identity:', error)
      alert('Failed to create identity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
      {/* Snapshot Image */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={`/api/media/snapshot/${identity.sample_event_id}`}
          alt="Unknown Person"
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement!.innerHTML = `
              <div class="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col items-center justify-center">
                <div class="text-6xl mb-2">👤</div>
                <div class="text-sm text-amber-600 font-medium">No Image</div>
              </div>
            `
          }}
        />
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-amber-600">
            Unknown Person
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            {identity.obs_count} seen
          </span>
        </div>

        <div className="text-sm text-gray-600 space-y-1 mb-3">
          <p>
            <span className="font-medium">ID:</span>{' '}
            <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">
              {identity.provisional_id.slice(0, 8)}
            </span>
          </p>
          <p>
            <span className="font-medium">First seen:</span>{' '}
            {new Date(identity.first_seen).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Last seen:</span>{' '}
            {new Date(identity.last_seen).toLocaleString()}
          </p>
        </div>

        {/* Promote Button */}
        {!showPromoteOptions && !showNewIdentityForm && (
          <button
            onClick={() => setShowPromoteOptions(true)}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>⬆</span>
            <span>Add to Known Identities</span>
          </button>
        )}

        {/* Promote Options */}
        {showPromoteOptions && !showNewIdentityForm && (
          <div className="space-y-2">
            {knownIdentities.length > 0 && (
              <form onSubmit={handlePromoteToExisting} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Match with existing identity:
                </label>
                <select
                  value={selectedIdentityId}
                  onChange={e => setSelectedIdentityId(e.target.value)}
                  className="block w-full border border-purple-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select identity...</option>
                  {knownIdentities.map(known => (
                    <option key={known.canonical_id} value={known.canonical_id}>
                      {known.display_name} {known.role && `(${known.role})`}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={saving || !selectedIdentityId}
                  className="w-full bg-purple-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Matching...' : 'Match with Selected'}
                </button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPromoteOptions(false)
                setShowNewIdentityForm(true)
              }}
              className="w-full bg-green-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              ➕ Create New Identity
            </button>

            <button
              onClick={() => {
                setShowPromoteOptions(false)
                setSelectedIdentityId('')
              }}
              disabled={saving}
              className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Create New Identity Form */}
        {showNewIdentityForm && (
          <form onSubmit={handleCreateNew} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Create new identity:
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter person's name..."
              className="block w-full border border-green-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="flex-1 bg-green-600 text-white py-1.5 px-3 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewIdentityForm(false)
                  setNewName('')
                }}
                disabled={saving}
                className="flex-1 bg-gray-100 text-gray-700 py-1.5 px-3 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
