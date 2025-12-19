import { useEffect, useRef, useState, useCallback } from 'react'
import { api, Camera, BASE_URL } from '../services/api'
import Hls from 'hls.js'
import Layout from '../components/Layout'
import { CameraCard, CameraGrid } from '../components/LiveWall'

export default function LiveWall() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamErrors, setStreamErrors] = useState<{ [key: number]: string }>({})
  const [startingStreams, setStartingStreams] = useState<{ [key: number]: boolean }>({})
  const [initializingCameras, setInitializingCameras] = useState<{ [key: number]: boolean }>({})
  const [offlineCameras, setOfflineCameras] = useState<{ [key: number]: boolean }>({})
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({})
  const hlsInstances = useRef<{ [key: number]: Hls | null }>({})
  const retryCounts = useRef<{ [key: number]: number }>({})
  const maxRetries = 30  // Retry for ~90 seconds (30 * 3s) to allow Edge service to start stream
  const initializedCameras = useRef<Set<number>>(new Set())

  // Camera addition state
  const [showAddCamera, setShowAddCamera] = useState(false)
  const [addingCamera, setAddingCamera] = useState(false)
  const [formData, setFormData] = useState({ name: '', rtsp_url: '' })
  const [formErrors, setFormErrors] = useState<{ name?: string; rtsp_url?: string }>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Define loadCameras before useEffect so it can be used
  const loadCameras = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getCameras()
      console.log('Loaded cameras:', data.length, data)
      setCameras(data || []) // Show all cameras, not just online ones
      setLoading(false)
    } catch (error: any) {
      console.error('Failed to load cameras:', error)
      setError(error.message || 'Failed to load cameras')
      setLoading(false)
      setCameras([]) // Clear cameras on error
    }
  }, [])

  useEffect(() => {
    // Load cameras immediately on mount
    loadCameras()
    // Reload cameras periodically to catch stream status changes
    const interval = setInterval(loadCameras, 30000)  // Every 30 seconds

    return () => {
      clearInterval(interval)
      // Cleanup all HLS instances on unmount
      Object.values(hlsInstances.current).forEach(hls => hls?.destroy())
    }
  }, [loadCameras])

  useEffect(() => {
    // Get current camera IDs
    const currentCameraIds = new Set(cameras.map(c => c.id))

    // Clean up removed cameras
    Array.from(initializedCameras.current).forEach(id => {
      if (!currentCameraIds.has(id)) {
        hlsInstances.current[id]?.destroy()
        delete hlsInstances.current[id]
        delete videoRefs.current[id]
        initializedCameras.current.delete(id)
      }
    })

    // Initialize new cameras only
    cameras.forEach(cam => {
      // Skip if already initialized
      if (initializedCameras.current.has(cam.id)) return
      const video = videoRefs.current[cam.id]
      if (!video) return

      // Mark as initialized to prevent recreation
      initializedCameras.current.add(cam.id)

      // Mark camera as initializing (will be cleared when video starts playing)
      setInitializingCameras(prev => ({ ...prev, [cam.id]: true }))

      // Fallback: Clear initializing state after 5 seconds even if playing event doesn't fire
      setTimeout(() => {
        setInitializingCameras(prev => {
          const newState = { ...prev }
          delete newState[cam.id]
          return newState
        })
      }, 5000)

      // Use LOW quality for grid view (now includes AI detection overlays from Edge AI)
      const relativeUrl = cam.hls_url?.low || `/hls/cam/${cam.id}/low/index.m3u8`
      // Use backend URL from environment config (for production) or current origin (for development with proxy)
      const backendUrl = BASE_URL
      const hlsUrl = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${backendUrl}${relativeUrl}`

      console.log(`Loading HLS stream for ${cam.name}: ${hlsUrl}`)

      // Clear previous error
      setStreamErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[cam.id]
        return newErrors
      })

      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,  // Disable debug for grid view performance
          enableWorker: true,
          lowLatencyMode: true,  // ENABLED for synchronized low-latency playback

          // MINIMAL BUFFER - Optimized for real-time A/V synchronization
          maxBufferLength: 2,        // Only buffer 2 seconds for ultra-low latency
          maxMaxBufferLength: 4,     // Max 4 seconds buffer
          maxBufferSize: 2 * 1000 * 1000,  // 2MB buffer for tighter sync
          maxBufferHole: 0.1,        // Very small gap tolerance for A/V sync

          // ULTRA LOW LATENCY LIVE SYNC - Stay at absolute live edge for A/V sync
          backBufferLength: 0.5,            // Minimal back buffer (0.5s)
          liveSyncDurationCount: 1,         // Start 1 segment from live edge for stability
          liveMaxLatencyDurationCount: 4,   // Jump forward if more than 4 segments behind
          liveDurationInfinity: true,       // Treat as infinite for live
          liveBackBufferLength: 0.5,        // 0.5 second live back buffer
          highBufferWatchdogPeriod: 0.5,    // Check buffer every 0.5 seconds

          // Fragment loading with aggressive timeouts for low latency
          maxFragLookUpTolerance: 0.1,
          manifestLoadingTimeOut: 5000,      // 5 seconds (reduced)
          manifestLoadingMaxRetry: 6,        // More retries
          levelLoadingTimeOut: 5000,         // 5 seconds (reduced)
          levelLoadingMaxRetry: 6,           // More retries
          fragLoadingTimeOut: 5000,          // 5 seconds (reduced)
          fragLoadingMaxRetry: 10,           // More retries for stability

          xhrSetup: (xhr) => {
            xhr.withCredentials = false
            xhr.timeout = 5000               // 5 seconds (reduced)
          }
        })

        hls.loadSource(hlsUrl)
        hls.attachMedia(video)

        // AGGRESSIVE SYNC TO LIVE EDGE - Keep all streams synchronized
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (video && !video.paused) {
            const bufferEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0
            const currentTime = video.currentTime
            const latency = bufferEnd - currentTime

            // AGGRESSIVE: If we're more than 2 seconds behind live, jump forward
            // This keeps all cameras at the same live edge for perfect sync
            if (latency > 2) {
              console.log(`${cam.name}: Latency ${latency.toFixed(1)}s, seeking to live edge`)
              video.currentTime = bufferEnd - 0.5  // Stay 0.5s from live edge
            }
          }
        })

        // Track playback state
        let isPlaying = false
        let lastPlayTime = Date.now()

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log(`HLS manifest parsed for ${cam.name}`)
          // Disable audio track immediately after manifest is parsed
          // This prevents audio loading for muted grid view videos
          hls.audioTrack = -1
          console.log(`Audio disabled for ${cam.name}`)

          // Play with proper error handling for browser power-saving
          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log(`Playback started for ${cam.name}`)
            }).catch(err => {
              console.error(`Play error for ${cam.name}:`, err)
              // If AbortError (browser power-saving), retry playback
              if (err.name === 'AbortError') {
                console.log(`Retrying playback for ${cam.name} after AbortError...`)
                setTimeout(() => {
                  video.play().catch(e => console.error(`Retry failed for ${cam.name}:`, e))
                }, 1000)
              } else {
                setStreamErrors(prev => ({ ...prev, [cam.id]: 'Playback failed' }))
              }
            })
          }
        })

        // Capture stream information when metadata loads and track real-time stats
        video.addEventListener('loadedmetadata', () => {
          // Video metadata loaded
        })

        // Track when video is actually playing
        video.addEventListener('playing', () => {
          isPlaying = true
          lastPlayTime = Date.now()
          // Clear errors and initializing state when playing starts
          setStreamErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[cam.id]
            return newErrors
          })
          setInitializingCameras(prev => ({ ...prev, [cam.id]: false }))

          // Reset retry count on successful play
          retryCounts.current[cam.id] = 0

          // Update camera online status in local state when video starts playing
          setCameras((prev: Camera[]) => prev.map((c: Camera) =>
            c.id === cam.id ? { ...c, online: true } : c
          ))
        })

        video.addEventListener('waiting', () => {
          // Video is buffering - be more patient for live streams
          const now = Date.now()
          const timeSinceLastPlay = (now - lastPlayTime) / 1000

          // If buffering for more than 20 seconds (longer tolerance), try to recover
          if (timeSinceLastPlay > 20 && isPlaying) {
            console.warn(`Buffering too long for ${cam.name} (${timeSinceLastPlay.toFixed(1)}s), trying to recover...`)
            try {
              hls.startLoad()
            } catch (e) {
              console.error(`Recovery failed for ${cam.name}, will retry...`)
            }
          }
        })

        video.addEventListener('stalled', () => {
          console.warn(`Stream stalled for ${cam.name}, trying to recover...`)
          try {
            hls.startLoad()
          } catch (e) {
            console.error(`Recovery failed for ${cam.name}`)
          }
        })

        // Auto-resume if video gets paused unexpectedly
        video.addEventListener('pause', () => {
          // Only auto-resume if we were playing (not user-initiated pause)
          if (isPlaying && video.readyState >= 2) {
            console.warn(`Video paused unexpectedly for ${cam.name}, resuming...`)
            setTimeout(() => {
              video.play().catch(err => {
                console.error(`Failed to auto-resume ${cam.name}:`, err)
              })
            }, 100)
          }
        })

        // Track retry attempts
        if (!retryCounts.current[cam.id]) {
          retryCounts.current[cam.id] = 0
        }
        // Never give up - keep retrying for continuous streams

        const retryLoad = () => {
          if (!videoRefs.current[cam.id]) return

          retryCounts.current[cam.id] = (retryCounts.current[cam.id] || 0) + 1

          // Check if max retries reached - mark as offline and stop retrying
          if (retryCounts.current[cam.id] >= maxRetries) {
            console.log(`Camera ${cam.name} offline after ${maxRetries} attempts, marking as offline`)
            setOfflineCameras(prev => ({ ...prev, [cam.id]: true }))
            setStreamErrors(prev => ({ ...prev, [cam.id]: 'Camera Offline' }))
            setInitializingCameras(prev => ({ ...prev, [cam.id]: false }))

            // Clean up HLS instance to stop retry loop
            if (hlsInstances.current[cam.id]) {
              hlsInstances.current[cam.id]?.destroy()
              hlsInstances.current[cam.id] = null
            }
            return  // Stop retrying
          }

          // Log retry attempts
          if (retryCounts.current[cam.id] % 10 === 0) {
            console.log(`Retrying stream for ${cam.name} (attempt ${retryCounts.current[cam.id]})...`)
          }
          // Use LOW quality for retry (now includes AI detection overlays from Edge AI)
          const relativeUrl = cam.hls_url?.low || `/hls/cam/${cam.id}/low/index.m3u8`
          // Use backend URL from environment config (for production) or current origin (for development with proxy)
          const backendUrl = BASE_URL
          const hlsUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `${backendUrl}${relativeUrl}`

          // Destroy existing instance
          if (hlsInstances.current[cam.id]) {
            hlsInstances.current[cam.id]?.destroy()
            hlsInstances.current[cam.id] = null
          }

          // Create new HLS instance with ULTRA LOW LATENCY settings for A/V sync
          const newHls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,  // ENABLED for synchronized low-latency playback

            // MINIMAL BUFFER - Optimized for real-time A/V synchronization
            maxBufferLength: 2,        // Only buffer 2 seconds for ultra-low latency
            maxMaxBufferLength: 4,     // Max 4 seconds buffer
            maxBufferSize: 2 * 1000 * 1000,  // 2MB buffer for tighter sync
            maxBufferHole: 0.1,        // Very small gap tolerance for A/V sync

            // ULTRA LOW LATENCY LIVE SYNC - Stay at absolute live edge for A/V sync
            backBufferLength: 0.5,            // Minimal back buffer (0.5s)
            liveSyncDurationCount: 1,         // Start 1 segment from live edge for stability
            liveMaxLatencyDurationCount: 4,   // Jump forward if more than 4 segments behind
            liveDurationInfinity: true,
            liveBackBufferLength: 0.5,        // 0.5 second live back buffer
            highBufferWatchdogPeriod: 0.5,    // Check buffer every 0.5 seconds

            // Fragment loading with aggressive timeouts
            maxFragLookUpTolerance: 0.1,
            manifestLoadingTimeOut: 5000,      // 5 seconds
            manifestLoadingMaxRetry: 6,        // More retries
            levelLoadingTimeOut: 5000,         // 5 seconds
            levelLoadingMaxRetry: 6,           // More retries
            fragLoadingTimeOut: 5000,          // 5 seconds
            fragLoadingMaxRetry: 10,           // More retries for stability

            xhrSetup: (xhr) => {
              xhr.withCredentials = false
              xhr.timeout = 5000               // 5 seconds
            }
          })

          newHls.loadSource(hlsUrl)
          newHls.attachMedia(videoRefs.current[cam.id]!)

          newHls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log(`Stream loaded successfully for ${cam.name}`)
            // Disable audio track immediately
            newHls.audioTrack = -1
            console.log(`Audio disabled for ${cam.name} (retry)`)

            retryCounts.current[cam.id] = 0
            setStreamErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[cam.id]
              return newErrors
            })
            videoRefs.current[cam.id]?.play().catch(console.error)
          })

          newHls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              console.error(`HLS error during retry for ${cam.name}:`, data)
              setTimeout(retryLoad, 3000) // Retry after 3 seconds (longer delay)
            }
          })

          hlsInstances.current[cam.id] = newHls
        }

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error(`HLS error for ${cam.name}:`, data)

            // Handle 404 errors (manifest not found) - Common during startup
            if (data.details === 'manifestLoadError' && data.response?.code === 404) {
              console.log(`Stream not ready for ${cam.name} (404), retrying in 3s...`)

              // Don't show error overlay immediately for 404s, just retry
              // Only mark as error if we've retried many times (handled by retryCounts check above)
              setTimeout(retryLoad, 3000)
              return
            }

            // Handle level parsing errors (media sequence mismatch) - recover gracefully
            if (data.details === 'levelParsingError' || data.details === 'levelLoadError') {
              console.warn(`Playlist error for ${cam.name}, attempting recovery...`)
              // Destroy and recreate HLS instance to reset state
              setTimeout(retryLoad, 2000)
              return
            }

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log(`Network error for ${cam.name}, trying to recover...`)
                try {
                  hls.startLoad()
                  // If recovery fails, retry after delay (with limit)
                  setTimeout(() => {
                    if (hlsInstances.current[cam.id] === hls && hls.media?.readyState === 0) {
                      retryLoad()
                    }
                  }, 3000)
                } catch (e) {
                  console.error(`Recovery failed for ${cam.name}, will retry...`)
                  setTimeout(retryLoad, 3000)
                }
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`Media error for ${cam.name}, trying to recover...`)
                try {
                  hls.recoverMediaError()
                  // If recovery fails, retry after delay
                  setTimeout(() => {
                    if (hlsInstances.current[cam.id] === hls && hls.media?.readyState === 0) {
                      retryLoad()
                    }
                  }, 3000)
                } catch (e) {
                  console.error(`Media recovery failed for ${cam.name}, will retry...`)
                  setTimeout(retryLoad, 3000)
                }
                break
              default:
                console.log(`Fatal error for ${cam.name}, will retry...`)
                setTimeout(retryLoad, 3000)
                break
            }
          } else {
            // Non-fatal error - handle specific cases that affect playback
            if (data.details === 'audioTrackLoadTimeOut') {
              console.warn(`Audio track timeout for ${cam.name}, continuing with video only...`)
              // Try to continue playback - HLS.js should continue with video only
              try {
                hls.startLoad()
              } catch (e) {
                console.error(`Failed to restart after audio timeout for ${cam.name}`)
              }
            } else if (data.details === 'bufferAppendError') {
              // Audio buffer append error - can be safely ignored since videos are muted
              console.warn(`Buffer append error for ${cam.name} (likely audio), continuing...`)
            } else if (data.details === 'bufferStalledError') {
              console.warn(`Buffer stalled for ${cam.name}, trying to skip ahead...`)
              // Try to jump ahead slightly to get past the stall
              try {
                if (video.buffered.length > 0) {
                  const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                  if (bufferedEnd > video.currentTime + 0.5) {
                    video.currentTime = bufferedEnd - 0.1
                    console.log(`Jumped to ${video.currentTime} for ${cam.name}`)
                  }
                }
              } catch (e) {
                console.error(`Failed to skip stall for ${cam.name}`)
              }
            } else if (data.details === 'levelParsingError') {
              // Non-fatal level parsing error - try to continue
              console.warn(`Non-fatal playlist parsing error for ${cam.name}, continuing...`)
            } else if (!data.details?.includes('buffer')) {
              // Log non-buffer errors to avoid console spam
              console.warn(`Non-fatal HLS error for ${cam.name}:`, data.details)
            }
          }
        })

        hlsInstances.current[cam.id] = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = hlsUrl
        video.addEventListener('error', () => {
          setStreamErrors(prev => ({ ...prev, [cam.id]: 'Stream not available' }))
        })
        video.play().catch(err => {
          console.error(`Play error for ${cam.name}:`, err)
          setStreamErrors(prev => ({ ...prev, [cam.id]: 'Playback failed' }))
        })
      } else {
        console.error(`HLS not supported for ${cam.name}`)
        setStreamErrors(prev => ({ ...prev, [cam.id]: 'HLS not supported' }))
      }
    })

    // No cleanup here - we handle camera removal at the start of the effect
    // Cleanup only happens on component unmount (handled in the mount effect)
  }, [cameras])

  const validateCameraForm = (): boolean => {
    const newErrors: { name?: string; rtsp_url?: string } = {}

    // Validate name
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Camera name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Camera name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Camera name must be less than 100 characters'
    }

    // Validate RTSP URL
    if (!formData.rtsp_url || !formData.rtsp_url.trim()) {
      newErrors.rtsp_url = 'RTSP URL is required'
    } else {
      const rtspPattern = /^rtsp:\/\/.+/
      if (!rtspPattern.test(formData.rtsp_url.trim())) {
        newErrors.rtsp_url = 'RTSP URL must start with "rtsp://"'
      } else if (formData.rtsp_url.trim().length < 10) {
        newErrors.rtsp_url = 'RTSP URL is too short'
      }
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateCameraForm()) {
      return
    }

    setAddingCamera(true)
    try {
      await api.addCamera(formData.name.trim(), formData.rtsp_url.trim())
      const cameraName = formData.name.trim()

      setFormData({ name: '', rtsp_url: '' })
      setFormErrors({})
      setShowAddCamera(false)

      // Show success message
      setSuccessMessage(`Camera "${cameraName}" added! It will appear shortly once the edge service connects.`)
      setTimeout(() => setSuccessMessage(null), 5000)

      // Reload cameras quickly to show the new camera in list
      setLoading(true)
      setTimeout(() => {
        loadCameras()
        setLoading(false)
      }, 2000)
    } catch (error: any) {
      console.error('Failed to add camera:', error)
      alert(error.message || 'Failed to add camera')
    } finally {
      setAddingCamera(false)
    }
  }

  const handleStartStream = useCallback(async (cameraId: number) => {
    try {
      setStartingStreams(prev => ({ ...prev, [cameraId]: true }))
      await api.startCameraStream(cameraId)
      // Wait a moment for stream to start, then reload cameras
      setTimeout(() => {
        loadCameras()
        setStartingStreams(prev => ({ ...prev, [cameraId]: false }))
      }, 3000)
    } catch (error: any) {
      console.error('Failed to start stream:', error)
      setStreamErrors(prev => ({ ...prev, [cameraId]: error.message || 'Failed to start stream' }))
      setStartingStreams(prev => ({ ...prev, [cameraId]: false }))
    }
  }, [loadCameras])

  const handleRestartStream = useCallback(async (cameraId: number) => {
    try {
      setStartingStreams(prev => ({ ...prev, [cameraId]: true }))
      setStreamErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[cameraId]
        return newErrors
      })
      setOfflineCameras(prev => {
        const newOffline = { ...prev }
        delete newOffline[cameraId]
        return newOffline
      })

      // Clear retry count and re-initialize
      retryCounts.current[cameraId] = 0
      initializedCameras.current.delete(cameraId)

      await api.restartStream(cameraId)

      // Wait for stream to restart, then reload cameras
      setTimeout(() => {
        loadCameras()
        setStartingStreams(prev => ({ ...prev, [cameraId]: false }))
      }, 5000)
    } catch (error: any) {
      console.error('Failed to restart stream:', error)
      setStreamErrors(prev => ({ ...prev, [cameraId]: error.message || 'Failed to restart stream' }))
      setStartingStreams(prev => ({ ...prev, [cameraId]: false }))
    }
  }, [loadCameras])

  const handleRetry = useCallback((cameraId: number) => {
    // Clear errors, offline status, and retry
    setStreamErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[cameraId]
      return newErrors
    })
    setOfflineCameras(prev => {
      const newOffline = { ...prev }
      delete newOffline[cameraId]
      return newOffline
    })
    retryCounts.current[cameraId] = 0
    initializedCameras.current.delete(cameraId)  // Allow re-initialization
    loadCameras()
  }, [loadCameras])

  return (
    <Layout>
      <div className="p-5 max-w-screen-2xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Wall</h1>
            <p className="mt-2 text-sm text-gray-600">Real-time camera feeds</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowAddCamera(!showAddCamera)
                setFormData({ name: '', rtsp_url: '' })
                setFormErrors({})
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAddCamera ? 'Cancel' : '+ Add Camera'}
            </button>
          </div>
        </div>

        {/* Success notification */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Camera Form */}
        {showAddCamera && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Camera</h2>
            <form onSubmit={handleAddCamera} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Camera Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value })
                    if (formErrors.name) setFormErrors({ ...formErrors, name: undefined })
                  }}
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., Gate 1, Main Entrance, Front Door"
                  required
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  RTSP URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.rtsp_url}
                  onChange={e => {
                    setFormData({ ...formData, rtsp_url: e.target.value })
                    if (formErrors.rtsp_url) setFormErrors({ ...formErrors, rtsp_url: undefined })
                  }}
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formErrors.rtsp_url ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="rtsp://username:password@ip:port/stream"
                  required
                />
                {formErrors.rtsp_url && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.rtsp_url}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: rtsp://[username]:[password]@[ip]:[port]/[path]
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={addingCamera}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {addingCamera ? 'Adding...' : 'Add Camera'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCamera(false)
                    setFormData({ name: '', rtsp_url: '' })
                    setFormErrors({})
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-2">Loading cameras...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
            <p className="text-red-600 mb-2 font-medium">Error loading cameras</p>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={loadCameras}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : cameras.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-2">No cameras available</p>
            <p className="text-sm text-gray-400 mb-4">Click the "+ Add Camera" button above to add your first camera</p>
            <button
              onClick={loadCameras}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <CameraGrid>
            {cameras.map(camera => {
              // Create stable callback refs to prevent unnecessary re-renders
              const handleStart = () => handleStartStream(camera.id)
              const handleRestart = () => handleRestartStream(camera.id)
              const handleRetryClick = () => handleRetry(camera.id)
              const setVideoRef = (el: HTMLVideoElement | null) => {
                videoRefs.current[camera.id] = el
              }

              return (
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  streamError={streamErrors[camera.id] || null}
                  isInitializing={initializingCameras[camera.id] || false}
                  isStarting={startingStreams[camera.id] || false}
                  isOffline={offlineCameras[camera.id] || false}
                  onStartStream={handleStart}
                  onRestartStream={handleRestart}
                  onRetry={handleRetryClick}
                  videoRef={setVideoRef}
                  onCameraUpdated={loadCameras}
                />
              )
            })}
          </CameraGrid>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How It Works</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "+ Add Camera" and enter your camera's name and RTSP URL</li>
            <li>The backend automatically starts transcoding in dual quality (High: 1620p, Low: 360p)</li>
            <li>The camera appears in the Live Wall grid with real-time low quality video (360p)</li>
            <li>Click on a camera card to open the detailed view page with high quality stream</li>
            <li>Use the settings gear icon on camera cards to edit, restart, or delete cameras</li>
            <li>Toggle AI features (Person Recognition, ANPR) from the camera detail page</li>
          </ol>
        </div>
      </div>
    </Layout>
  )
}
