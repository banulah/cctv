import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Camera, Event } from '../services/api'
import Layout from '../components/Layout'
import Hls from 'hls.js'

export default function CameraDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [camera, setCamera] = useState<Camera | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quality, setQuality] = useState<'high' | 'low'>('low')  // Default to low for better performance
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [streamInfo, setStreamInfo] = useState<{ resolution: string, fps: number, bitrate: string }>({ resolution: '...', fps: 0, bitrate: '...' })
  const [liveStats, setLiveStats] = useState<{ bufferLength: number, bandwidth: number, droppedFrames: number }>({ bufferLength: 0, bandwidth: 0, droppedFrames: 0 })
  const statsIntervalRef = useRef<number | null>(null)
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const eventsIntervalRef = useRef<number | null>(null)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [hasVideoStarted, setHasVideoStarted] = useState(false)
  const errorCountRef = useRef<number>(0)

  useEffect(() => {
    if (!id) return
    loadCamera()
  }, [id])

  useEffect(() => {
    if (camera && videoRef.current) {
      setupVideo()
    }
    return () => {
      const video = videoRef.current
      if (video) {
        video.removeEventListener('loadstart', () => {})
        video.removeEventListener('canplay', () => {})
        video.removeEventListener('playing', () => {})
        video.removeEventListener('waiting', () => {})
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
        statsIntervalRef.current = null
      }
    }
  }, [camera, quality])

  useEffect(() => {
    if (!camera) return

    // Load events immediately
    loadRecentEvents()

    // Poll for new events every 5 seconds
    eventsIntervalRef.current = setInterval(() => {
      loadRecentEvents()
    }, 5000)

    return () => {
      if (eventsIntervalRef.current) {
        clearInterval(eventsIntervalRef.current)
        eventsIntervalRef.current = null
      }
    }
  }, [camera])

  const loadCamera = async () => {
    try {
      setLoading(true)
      const cameras = await api.getCameras()
      const found = cameras.find(c => c.id === parseInt(id!))
      if (found) {
        setCamera(found)
      } else {
        setError('Camera not found')
      }
    } catch (err) {
      console.error('Failed to load camera:', err)
      setError('Failed to load camera')
    } finally {
      setLoading(false)
    }
  }

  const loadRecentEvents = async () => {
    if (!camera) return
    try {
      const events = await api.getRecentEvents(camera.id, 10)
      setRecentEvents(events)
    } catch (err) {
      console.error('Failed to load events:', err)
    }
  }

  const setupVideo = () => {
    if (!camera || !videoRef.current) return

    const video = videoRef.current
    // Use the selected quality stream URL
    let streamUrl: string
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin

    if (camera.hls_url && camera.hls_url[quality]) {
      // Use the selected quality URL (high or low) from the backend API
      const hlsPath = camera.hls_url[quality]
      // If path is relative, prepend backend URL
      streamUrl = hlsPath.startsWith('http') ? hlsPath : `${backendUrl}${hlsPath}`
    } else {
      // Fallback: construct URL (for backward compatibility)
      streamUrl = `${backendUrl}/hls/cam${camera.id}/${quality}/index.m3u8`
    }

    // Reset loading state when video element changes
    setIsVideoLoading(true)
    setHasVideoStarted(false)

    // Add video event listeners
    const handleLoadStart = () => {
      setIsVideoLoading(true)
    }

    const handleCanPlay = () => {
      setIsVideoLoading(false)
    }

    const handlePlaying = () => {
      setIsVideoLoading(false)
      setHasVideoStarted(true)
    }

    const handleWaiting = () => {
      setIsVideoLoading(true)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('waiting', handleWaiting)

    if (hlsRef.current) {
      hlsRef.current.destroy()
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        // SIMPLE QUALITY SELECTION (no adaptive bitrate - user chooses quality)
        enableWorker: true,
        maxLoadingDelay: 4,

        // Balanced buffering
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,

        // Live sync for low latency
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,

        // More retries for stability
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 10
      })

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      // FORCE SEEK TO LIVE EDGE on every fragment loaded
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (video && !video.paused) {
          const bufferEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0
          const currentTime = video.currentTime
          const latency = bufferEnd - currentTime

          // If we're more than 6 seconds behind live, jump forward
          if (latency > 6) {
            console.log(`Latency too high (${latency.toFixed(1)}s), seeking to live edge`)
            video.currentTime = bufferEnd - 1  // Seek to 1 second before buffer end
          }
        }
      })

      let lastFrameCount = 0
      let lastFpsCheck = Date.now()
      let lastBandwidth = 0

      // Get stream info from manifest
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Reset error count on successful manifest load
        errorCountRef.current = 0
        setError(null)

        if (hls.levels && hls.levels.length > 0) {
          const level = hls.levels[0]
          setStreamInfo({
            resolution: `${level.width}x${level.height}`,
            fps: 0,
            bitrate: `${(level.bitrate / 1000000).toFixed(1)} Mbps`
          })
        }
        video.play().catch(err => console.error('Play error:', err))
      })

      // Reset error count when playback starts successfully
      video.addEventListener('playing', () => {
        errorCountRef.current = 0
        setError(null)
        setIsVideoLoading(false)
        setHasVideoStarted(true)
      })

      // Track bandwidth from fragments
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        if (data.frag && data.frag.stats) {
          const stats = data.frag.stats
          const duration = (stats.total || 1000) / 1000
          if (stats.loaded && duration > 0) {
            lastBandwidth = (stats.loaded * 8) / duration
          }
        }
      })

      // Start stats tracking
      statsIntervalRef.current = setInterval(() => {
        if (video && hls) {
          const bufferLength = video.buffered.length > 0
            ? video.buffered.end(video.buffered.length - 1) - video.currentTime
            : 0

          const videoQuality = (video as any).getVideoPlaybackQuality?.()
          const droppedFrames = videoQuality?.droppedVideoFrames || 0

          // Calculate FPS
          const now = Date.now()
          const elapsed = (now - lastFpsCheck) / 1000
          const frameCount = videoQuality?.totalVideoFrames || 0
          const framesDiff = frameCount - lastFrameCount

          if (elapsed > 0 && framesDiff > 0) {
            const calculatedFps = Math.round(framesDiff / elapsed)
            lastFrameCount = frameCount
            lastFpsCheck = now

            setStreamInfo(prev => ({
              ...prev,
              fps: calculatedFps
            }))
          }

          setLiveStats({
            bufferLength: Math.max(0, bufferLength),
            bandwidth: lastBandwidth,
            droppedFrames
          })
        }
      }, 1000)

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS error:', data)
          errorCountRef.current += 1

          // Handle 404 errors - stream not available
          if (data.details === 'manifestLoadError' && data.response?.code === 404) {
            setError('Stream not available. Please check camera connection.')
            // Retry after delay
            setTimeout(() => {
              if (camera && videoRef.current) {
                setupVideo()
              }
            }, 3000)
            return
          }

          // Handle media sequence mismatch - recreate HLS instance
          if (data.details === 'levelParsingError' || data.details === 'levelLoadError') {
            console.warn('Playlist parsing error, attempting recovery...')
            errorCountRef.current += 1
            // Retry setup after short delay
            setTimeout(() => {
              if (camera && videoRef.current) {
                setupVideo()
              }
            }, 2000)
            return
          }

          // Handle other fatal errors
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error')
              setError('Network error - stream unavailable. Retrying...')
              // Retry after delay
              setTimeout(() => {
                setError(null)
                if (camera && videoRef.current) {
                  setupVideo()
                }
              }, 3000)
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error')
              setError('Media error - unable to play stream')
              break
            default:
              setError('Stream error - please refresh')
              break
          }
        } else {
          // Non-fatal errors - log but don't show error to user
          if (data.details === 'levelParsingError') {
            console.warn('Non-fatal playlist parsing error, continuing...')
          } else if (!data.details?.includes('buffer')) {
            console.warn('Non-fatal HLS error:', data.details)
          }
        }
      })

      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => console.error('Play error:', err))
      })
    }
  }


  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading camera...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !camera) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Camera not found'}</p>
            <button
              onClick={() => navigate('/live')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Back to Live Wall
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 ">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/live')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{camera.name}</h1>
              <p className="text-sm text-gray-500">Camera ID: {camera.id}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              camera.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {camera.online ? '● Live' : '● Offline'}
            </div>
          </div>

          {/* Quality Toggle with AI Overlays */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setQuality('low')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  quality === 'low'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Low (360p + AI)
              </button>
              <button
                onClick={() => setQuality('high')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  quality === 'high'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                High ({quality === 'high' ? 'Original' : '2880x1620'} + AI)
              </button>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg overflow-hidden shadow-lg">
              <div className="aspect-video relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Loading Overlay - Only show before video actually starts */}
                {isVideoLoading && !hasVideoStarted && camera.online && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60" style={{ zIndex: 20 }}>
                    <div className="text-center text-white p-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                      <div className="text-base font-medium mb-2">
                        Loading {quality === 'high' ? 'High Quality' : 'Low Quality'} Stream with AI Overlays...
                      </div>
                      <div className="text-sm text-gray-300">
                        {quality === 'high' ? '2880x1620' : '640x360'} with AI detection overlays @ H.264
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Badge */}
                {camera.online && !isVideoLoading && (
                  <div className="absolute bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <span className="animate-pulse mr-2">●</span> LIVE
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stream Information */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Stream Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality:</span>
                  <span className="font-medium text-gray-900">{quality === 'high' ? 'High + AI' : 'Low + AI'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolution:</span>
                  <span className="font-medium text-gray-900">
                    {streamInfo.resolution}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frame Rate:</span>
                  <span className="font-medium text-gray-900">
                    {streamInfo.fps ? `${streamInfo.fps} fps` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bitrate:</span>
                  <span className="font-medium text-gray-900">
                    {streamInfo.bitrate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Codec:</span>
                  <span className="font-medium text-gray-900">H.264 Main</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Buffer:</span>
                  <span className={`font-medium ${
                    liveStats.bufferLength > 5 ? 'text-green-600' :
                    liveStats.bufferLength > 2 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {liveStats.bufferLength.toFixed(1)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bandwidth:</span>
                  <span className="font-medium text-gray-900">
                    {liveStats.bandwidth
                      ? `${(liveStats.bandwidth / 1000000).toFixed(2)} Mbps`
                      : '0.00 Mbps'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dropped Frames:</span>
                  <span className={`font-medium ${
                    liveStats.droppedFrames === 0 ? 'text-green-600' :
                    liveStats.droppedFrames < 10 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {liveStats.droppedFrames}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Alerts</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    No recent events
                  </div>
                ) : (
                  recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-2 rounded border text-xs ${
                        event.type === 'person'
                          ? 'bg-blue-50 border-blue-200'
                          : event.type === 'anpr'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-1">
                          {event.type === 'person' ? (
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : event.type === 'anpr' ? (
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          )}
                          <span className="font-semibold text-gray-900 capitalize">{event.type}</span>
                        </div>
                        <span className="text-gray-500">
                          {new Date(event.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.payload && (
                        <div className="text-gray-700 truncate">
                          {event.type === 'anpr' && event.payload.plate_text ? (
                            <span className="font-mono font-semibold">{event.payload.plate_text}</span>
                          ) : event.type === 'person' && event.payload.identity_name ? (
                            <span>{event.payload.identity_name}</span>
                          ) : (
                            <span className="text-gray-400">Detection</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
