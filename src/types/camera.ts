export interface Camera {
  id: number
  name: string
  rtsp_url: string
  mediamtx_path: string
  online: boolean
  enable_recognition: boolean  // Toggle person recognition (face + body re-ID)
  enable_anpr: boolean          // Toggle license plate recognition (ANPR)
  created_at: string
  hls_url?: {
    high: string | null  // HIGH quality (2880x1620 @ 6Mbps) for AI detection
    low: string | null   // LOW quality (854x480 @ 800kbps) for grid view
  }
  webrtc_url?: string
  // Computed/frontend properties
  location?: string
  is_active?: boolean
  stream_status?: 'idle' | 'starting' | 'streaming' | 'failed'
}

export interface StreamInfo {
  resolution: string
  fps: number
  bitrate: string
}

export interface LiveStats {
  bufferLength: number
  bandwidth: number
  droppedFrames: number
}

export interface DetectionEvent {
  camera_id: number
  event_type: string
  timestamp: string
  confidence?: number
  [key: string]: any
}

export type Quality = 'high' | 'medium' | 'low'
