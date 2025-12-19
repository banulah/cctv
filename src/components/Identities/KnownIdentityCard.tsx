import { useState } from 'react'
import { Identity } from '../../types/identities'

interface KnownIdentityCardProps {
  identity: Identity
  onUpdate: (id: string, data: Partial<Identity>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export default function KnownIdentityCard({ identity, onUpdate, onDelete }: KnownIdentityCardProps) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: identity.display_name || '',
    role: identity.role || '',
    notes: identity.notes || ''
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(identity.canonical_id, editForm)
      setEditing(false)
    } catch (error) {
      console.error('Failed to update identity:', error)
      alert('Failed to update identity')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${identity.display_name || 'this identity'}"?\n\n` +
      'This will remove the identity, but observations will remain in the database as unknown persons.'
    )

    if (!confirmed) return

    setDeleting(true)
    try {
      await onDelete(identity.canonical_id)
    } catch (error) {
      console.error('Failed to delete identity:', error)
      alert('Failed to delete identity')
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Photo Preview */}
        {identity.representative_obs_id && (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            <img
              src={`/api/media/snapshot/${identity.representative_obs_id}`}
              alt={identity.display_name || 'Identity'}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center">
                    <div class="text-6xl mb-2">👤</div>
                    <div class="text-sm text-green-600 font-medium">No Image</div>
                  </div>
                `
              }}
            />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={editForm.display_name}
              onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={editForm.role}
              onChange={e => setEditForm({ ...editForm, role: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Employee, Visitor, Family"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Additional information..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setEditForm({
                  display_name: identity.display_name || '',
                  role: identity.role || '',
                  notes: identity.notes || ''
                })
              }}
              disabled={saving}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
      {/* Photo */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {identity.representative_obs_id ? (
          <img
            src={`/api/media/snapshot/${identity.representative_obs_id}`}
            alt={identity.display_name || 'Identity'}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement!.innerHTML = `
                <div class="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center">
                  <div class="text-6xl mb-2">👤</div>
                  <div class="text-sm text-green-600 font-medium">No Image</div>
                </div>
              `
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center">
            <div className="text-6xl mb-2">👤</div>
            <div className="text-sm text-green-600 font-medium">No Image</div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-green-700 truncate">
              {identity.display_name || 'Unnamed'}
            </h3>
            {identity.role && (
              <p className="text-sm text-gray-600 mt-0.5">{identity.role}</p>
            )}
          </div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
        {identity.notes && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{identity.notes}</p>
        )}
        <p className="text-xs text-gray-500">
          Created {new Date(identity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
