// Use environment variable for API base URL
// When deploying to Vercel, this variable must be set in the Vercel Dashboard
export const BASE_URL = (import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');

// API Base: e.g. https://api.yourdomain.com/api
export const API_BASE = `${BASE_URL}/api`;

// WebSocket Base: Derived from Backend URL if not explicitly provided
// e.g. wss://api.yourdomain.com/ws
export const WS_BASE = import.meta.env.VITE_WS_URL ||
  BASE_URL.replace(/^http/, 'ws') + '/ws';

// Debug: Log environment configuration
console.log('[API Config]', {
  BASE_URL: BASE_URL,
  API_BASE: API_BASE,
  WS_BASE: WS_BASE,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
})

// Helper function to add auth token to requests
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    }
  }
  return {}
}

// Helper function for authenticated fetch
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  }

  const response = await fetch(url, { ...options, headers })

  // If unauthorized, redirect to login
  if (response.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return response
}

export interface Camera {
  id: number
  name: string
  rtsp_url: string
  mediamtx_path: string
  online: boolean
  enable_recognition: boolean
  enable_anpr: boolean
  created_at: string
  hls_url?: {
    high: string | null
    low: string | null
  }
  webrtc_url?: string
}

export interface Event {
  id: number
  ts: string
  camera_id: number
  type: string
  payload: any
}

export interface Identity {
  canonical_id: string
  display_name: string | null
  role: string | null
  notes: string | null
  created_at: string
}

export interface HotlistEntry {
  entry_id: number
  plate_text: string
  label: string | null
  valid_from: string | null
  valid_to: string | null
}

export interface ProvisionalIdentity {
  provisional_id: string
  obs_count: number
  first_seen: string
  last_seen: string
  sample_event_id: number
}

export const api = {
  // Cameras
  getCameras: async (): Promise<Camera[]> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras`)
    if (!res.ok) {
      throw new Error(`Failed to fetch cameras: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },

  addCamera: async (name: string, rtsp_url: string): Promise<Camera> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rtsp_url })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to add camera')
    }
    return res.json()
  },

  // Provisionals
  getProvisionals: async (limit: number = 100): Promise<ProvisionalIdentity[]> => {
    const res = await authenticatedFetch(`${API_BASE}/provisionals?limit=${limit}`)
    if (!res.ok) {
      throw new Error('Failed to fetch provisionals')
    }
    return res.json()
  },

  updateCamera: async (id: number, name: string, rtsp_url: string): Promise<Camera> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rtsp_url })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to update camera')
    }
    return res.json()
  },

  deleteCamera: async (id: number): Promise<void> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to delete camera')
    }
  },

  startCameraStream: async (id: number): Promise<{ status: string; path: string; message?: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/start-stream`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to start stream')
    }
    return res.json()
  },

  // Alias methods for consistency
  startStream: async (id: number): Promise<{ status: string; path: string; message?: string }> => {
    return api.startCameraStream(id)
  },

  stopStream: async (id: number): Promise<void> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/stop-stream`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to stop stream')
    }
  },

  restartStream: async (id: number): Promise<{ status: string; path: string; message?: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/restart-stream`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to restart stream')
    }
    return res.json()
  },

  toggleRecognition: async (id: number): Promise<{ status: string; camera_id: number; enable_recognition: boolean; message: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/toggle-recognition`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to toggle recognition')
    }
    return res.json()
  },

  toggleANPR: async (id: number): Promise<{ status: string; camera_id: number; enable_anpr: boolean; message: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/toggle-anpr`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to toggle ANPR')
    }
    return res.json()
  },

  setRecognition: async (id: number, enable: boolean): Promise<{ status: string; camera_id: number; enable_recognition: boolean; message: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/set-recognition?enable=${enable}`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to set recognition')
    }
    return res.json()
  },

  setANPR: async (id: number, enable: boolean): Promise<{ status: string; camera_id: number; enable_anpr: boolean; message: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/cameras/${id}/set-anpr?enable=${enable}`, {
      method: 'POST'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to set ANPR')
    }
    return res.json()
  },
  getEvents: async (type?: string, camera_id?: number): Promise<Event[]> => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    if (camera_id) params.append('camera_id', camera_id.toString())
    const res = await authenticatedFetch(`${API_BASE}/events?${params}`)
    return res.json()
  },

  getRecentEvents: async (camera_id?: number, limit: number = 10, type?: string): Promise<Event[]> => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (camera_id) params.append('camera_id', camera_id.toString())
    if (type) params.append('type', type)
    const res = await authenticatedFetch(`${API_BASE}/events/recent?${params}`)
    return res.json()
  },

  // Identities
  getIdentities: async (): Promise<Identity[]> => {
    const res = await authenticatedFetch(`${API_BASE}/identities`)
    return res.json()
  },

  createIdentity: async (data: Partial<Identity>): Promise<Identity> => {
    const res = await authenticatedFetch(`${API_BASE}/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  getIdentity: async (id: string): Promise<Identity> => {
    const res = await authenticatedFetch(`${API_BASE}/identities/${id}`)
    return res.json()
  },

  updateIdentity: async (id: string, data: Partial<Identity>): Promise<Identity> => {
    const res = await authenticatedFetch(`${API_BASE}/identities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Hotlist
  getHotlist: async (): Promise<HotlistEntry[]> => {
    const res = await authenticatedFetch(`${API_BASE}/hotlist`)
    return res.json()
  },

  addHotlistEntry: async (plate_text: string, label?: string): Promise<HotlistEntry> => {
    const res = await authenticatedFetch(`${API_BASE}/hotlist?plate_text=${encodeURIComponent(plate_text)}${label ? `&label=${encodeURIComponent(label)}` : ''}`, {
      method: 'POST'
    })
    return res.json()
  },

  // Media
  getSnapshotUrl: async (event_id: number): Promise<{ url: string }> => {
    const res = await authenticatedFetch(`${API_BASE}/media/snapshot/${event_id}`)
    return res.json()
  },

  // Review Queue & Feedback
  getReviewQueue: async (status?: string, limit?: number): Promise<any[]> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (limit) params.append('limit', limit.toString())
    const res = await authenticatedFetch(`${API_BASE}/review-queue?${params}`)
    if (!res.ok) throw new Error('Failed to fetch review queue')
    return res.json()
  },

  submitFeedback: async (data: {
    rq_id: number
    is_correct: boolean
    corrected_canonical_id?: string
    reviewed_by: string
    notes?: string
  }): Promise<any> => {
    const res = await authenticatedFetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to submit feedback')
    }
    return res.json()
  },

  // Clustering
  getProvisionalClusters: async (camera_id: number, hours_back?: number): Promise<any> => {
    const params = new URLSearchParams({ camera_id: camera_id.toString() })
    if (hours_back) params.append('hours_back', hours_back.toString())
    const res = await authenticatedFetch(`${API_BASE}/provisional-clusters?${params}`)
    if (!res.ok) throw new Error('Failed to fetch clusters')
    return res.json()
  },

  getAdvancedClusters: async (params: {
    camera_id: number
    hours_back?: number
    algorithm?: 'hdbscan' | 'threshold'
    min_cluster_size?: number
    consolidate?: boolean
  }): Promise<any> => {
    const searchParams = new URLSearchParams({ camera_id: params.camera_id.toString() })
    if (params.hours_back) searchParams.append('hours_back', params.hours_back.toString())
    if (params.algorithm) searchParams.append('algorithm', params.algorithm)
    if (params.min_cluster_size) searchParams.append('min_cluster_size', params.min_cluster_size.toString())
    if (params.consolidate !== undefined) searchParams.append('consolidate', params.consolidate.toString())

    const res = await authenticatedFetch(`${API_BASE}/advanced-clusters?${searchParams}`)
    if (!res.ok) throw new Error('Failed to fetch advanced clusters')
    return res.json()
  },

  assignClusterToIdentity: async (data: {
    cluster_id: string
    obs_ids: number[]
    canonical_id?: string
    new_identity_name?: string
  }): Promise<any> => {
    const res = await authenticatedFetch(`${API_BASE}/clusters/${data.cluster_id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obs_ids: data.obs_ids,
        canonical_id: data.canonical_id,
        new_identity_name: data.new_identity_name
      })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to assign cluster')
    }
    return res.json()
  },

  deleteIdentity: async (id: string): Promise<void> => {
    const res = await authenticatedFetch(`${API_BASE}/identities/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to delete identity')
    }
  },

  linkProvisionalToIdentity: async (canonicalId: string, provisionalId: string): Promise<any> => {
    const res = await authenticatedFetch(`${API_BASE}/identities/${canonicalId}/link-provisional`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provisional_id: provisionalId })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to link provisional identity')
    }
    return res.json()
  },

  createIdentityFromProvisional: async (displayName: string, provisionalId: string): Promise<Identity> => {
    const res = await authenticatedFetch(`${API_BASE}/identities/from-provisional`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        provisional_id: provisionalId
      })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to create identity')
    }
    return res.json()
  },

  // Playback
  getRecordingDates: async (cameraId: number, quality: string): Promise<{ dates: string[] }> => {
    const res = await authenticatedFetch(`${API_BASE}/playback/recordings/${cameraId}/dates?quality=${quality}`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to fetch recording dates' }))
      throw new Error(error.detail || 'Failed to fetch recording dates')
    }
    return res.json()
  },

  getRecordingTimeline: async (cameraId: number, quality: string, date: string): Promise<any> => {
    const res = await authenticatedFetch(`${API_BASE}/playback/recordings/${cameraId}/timeline?quality=${quality}&date=${date}`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to fetch timeline' }))
      throw new Error(error.detail || 'Failed to fetch timeline')
    }
    return res.json()
  }
}

