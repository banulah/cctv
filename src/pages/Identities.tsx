import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { wsService } from '../services/websocket'
import Layout from '../components/Layout'
import {
  ProvisionalIdentityCard,
  KnownIdentityCard,
  TabNavigation
} from '../components/Identities'
import ConsolidationStats from '../components/Dashboard/ConsolidationStats'
import { ProvisionalIdentity, Identity } from '../types/identities'

export default function Identities() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [provisionals, setProvisionals] = useState<ProvisionalIdentity[]>([])
  const [activeTab, setActiveTab] = useState<'provisional' | 'known'>('provisional')
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toISOString())

  useEffect(() => {
    loadData()
    // Still keep periodic refresh as safety net, but reduced frequency (30s)
    const interval = setInterval(loadData, 30000)

    // Optimistic Real-Time Updates
    const cleanupWs = wsService.onEvent((event: any) => {
      if (event.type === 'recognition') {
        // Handle new observation
        handleNewObservation(event)
      } else if (event.type === 'provisional_merged') {
        // Handle merge event (remove loser, update winner)
        handleMergeEvent(event)
      }
    })

    return () => {
      clearInterval(interval)
      cleanupWs()
    }
  }, [])

  // Optimistic update handlers
  const handleNewObservation = (event: any) => {
    // Only care about provisional or unknown
    if (event.canonical_id) return // Handled in Known tab (less critical)

    // Check if we already have this provisional
    const provId = event.provisional_id
    if (!provId) return

    setProvisionals(prev => {
      const existingIndex = prev.findIndex(p => p.provisional_id === provId)

      if (existingIndex >= 0) {
        // Update existing card optimistically
        const newArr = [...prev]
        newArr[existingIndex] = {
          ...newArr[existingIndex],
          obs_count: newArr[existingIndex].obs_count + 1,
          last_seen: event.ts,
          // Update snapshot if quality is good (simple heuristic)
          sample_event_id: event.quality?.average > 0.6 ? event.obs_id : newArr[existingIndex].sample_event_id
        }
        return newArr.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
      } else {
        // Add new card
        const newProv: ProvisionalIdentity = {
          provisional_id: provId,
          obs_count: 1,
          first_seen: event.ts,
          last_seen: event.ts,
          sample_event_id: event.obs_id
        }
        return [newProv, ...prev]
      }
    })
  }

  const handleMergeEvent = (event: any) => {
    const { winner_id, loser_id } = event

    setProvisionals(prev => {
      const loser = prev.find(p => p.provisional_id === loser_id)
      if (!loser) return prev // Loser not visible, nothing to do

      // Remove loser
      const filtered = prev.filter(p => p.provisional_id !== loser_id)

      // Find winner to update its count
      const winnerIndex = filtered.findIndex(p => p.provisional_id === winner_id)

      if (winnerIndex >= 0) {
        // Winner exists, add loser's counts to it
        const newArr = [...filtered]
        newArr[winnerIndex] = {
          ...newArr[winnerIndex],
          obs_count: newArr[winnerIndex].obs_count + loser.obs_count,
          last_seen: new Date(loser.last_seen) > new Date(newArr[winnerIndex].last_seen)
            ? loser.last_seen
            : newArr[winnerIndex].last_seen
        }
        return newArr
      } else {
        // Winner not visible yet (shouldn't happen often if we just loaded), 
        // but if so, maybe trigger reload or just let it be
        return filtered
      }
    })
  }

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
      // Use new dedicated endpoint which returns consolidated provisionals
      const data = await api.getProvisionals()
      setProvisionals(data)
      setLastRefreshed(new Date().toISOString())
    } catch (error) {
      console.error('Failed to load provisionals:', error)
    }
  }

  const loadData = async () => {
    await Promise.all([
      loadIdentities(),
      loadProvisionals()
    ])
  }

  const handleUpdateIdentity = async (id: string, data: Partial<Identity>) => {
    try {
      await api.updateIdentity(id, data)
      await loadIdentities()
    } catch (error) {
      console.error('Failed to update identity:', error)
      throw error
    }
  }

  const handleDeleteIdentity = async (id: string) => {
    try {
      const response = await fetch(`/api/identities/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete identity')
      }

      alert('✅ Identity deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Failed to delete identity:', error)
      throw error
    }
  }

  const handlePromoteToKnown = async (provisionalId: string, canonicalId: string) => {
    try {
      // Call backend to link provisional observations to canonical identity
      const response = await fetch(`/api/identities/${canonicalId}/link-provisional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provisional_id: provisionalId })
      })

      if (!response.ok) {
        throw new Error('Failed to link provisional identity')
      }

      alert('✅ Successfully linked unknown person to identity!')
      await loadData()
    } catch (error) {
      console.error('Failed to promote:', error)
      throw error
    }
  }

  const handleCreateIdentityFromProvisional = async (provisionalId: string, name: string) => {
    try {
      // Create the new identity with the provisional ID
      const response = await fetch('/api/identities/from-provisional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name.trim(),
          provisional_id: provisionalId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create identity')
      }

      alert(`✅ Identity "${name}" created successfully!`)
      await loadData()
    } catch (error) {
      console.error('Failed to create identity:', error)
      throw error
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Identity Management</h1>
          <p className="mt-2 text-gray-600">
            Manage known identities and promote unknown persons to known identities
          </p>
        </div>

        {/* Stats */}
        <ConsolidationStats
          totalObservations={provisionals.reduce((acc, p) => acc + p.obs_count, 0)}
          uniquePersons={provisionals.length}
          lastConsolidated={lastRefreshed}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Known Identities</div>
            <div className="mt-2 text-3xl font-bold text-green-700">{identities.length}</div>
            <p className="text-xs text-gray-500 mt-1">People you've identified</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Unknown Persons</div>
            <div className="mt-2 text-3xl font-bold text-amber-600">{provisionals.length}</div>
            <p className="text-xs text-gray-500 mt-1">Unidentified detections</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          provisionalCount={provisionals.length}
          knownCount={identities.length}
          reviewCount={0}
        />

        {/* Tab Content */}
        {activeTab === 'provisional' && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Unknown Persons</h2>
              <p className="text-sm text-gray-600 mt-1">
                Click "Add to Known Identities" to match them with existing people or create new identities.
              </p>
            </div>
            {provisionals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-6xl mb-3">👥</div>
                <p className="text-gray-500">No unknown persons detected yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Unknown people will appear here when the system detects them
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {provisionals.map(prov => (
                  <ProvisionalIdentityCard
                    key={prov.provisional_id}
                    identity={prov}
                    knownIdentities={identities}
                    onPromoteToKnown={handlePromoteToKnown}
                    onCreateNewIdentity={handleCreateIdentityFromProvisional}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'known' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Known Identities</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage people you've identified in the system
                </p>
              </div>
              <button
                onClick={async () => {
                  const name = prompt('Enter new identity name:')
                  if (name?.trim()) {
                    try {
                      await api.createIdentity({ display_name: name.trim() })
                      alert('✅ Identity created!')
                      await loadIdentities()
                    } catch (error) {
                      alert('Failed to create identity')
                    }
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                <span>Add New Identity</span>
              </button>
            </div>

            {identities.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-6xl mb-3">👤</div>
                <p className="text-gray-500">No identities created yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create identities from unknown persons or add them manually
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {identities.map(identity => (
                  <KnownIdentityCard
                    key={identity.canonical_id}
                    identity={identity}
                    onUpdate={handleUpdateIdentity}
                    onDelete={handleDeleteIdentity}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
