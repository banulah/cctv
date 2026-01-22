export interface ProvisionalIdentity {
  provisional_id: string
  obs_count: number
  first_seen: string
  last_seen: string
  sample_event_id: number
}

export interface ReviewItem {
  rq_id: number
  obs_id: number
  candidate_id: string | null
  candidate?: {
    canonical_id: string
    display_name: string | null
    role: string | null
    representative_obs_id: number | null
  } | null
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

export interface Identity {
  canonical_id: string
  display_name: string | null
  role: string | null
  notes: string | null
  created_at: string
  representative_obs_id?: number | null
}
