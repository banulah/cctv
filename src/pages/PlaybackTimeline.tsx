import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Hls from 'hls.js'
import { api, Camera, API_BASE } from '../services/api'

interface CoverageBlock {
    start: string
    end: string
    duration_seconds: number
}

interface TimelineData {
    camera_id: number
    quality: string
    date: string
    day_start: string
    day_end: string
    coverage_blocks: CoverageBlock[]
    total_recorded_seconds: number
}

export default function PlaybackTimeline() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)

    const [camera, setCamera] = useState<Camera | null>(null)
    const quality: 'low' = 'low' // System only records LOW quality for space efficiency
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [availableDates, setAvailableDates] = useState<string[]>([])
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
    const [hoverTime, setHoverTime] = useState<Date | null>(null)
    const [timelineRange, setTimelineRange] = useState<1 | 2 | 4 | 24>(24) // Hours to display
    const [timelineStartHour, setTimelineStartHour] = useState(0) // Starting hour for zoomed view

    // Fetch available dates
    useEffect(() => {
        const fetchDates = async () => {
            if (!id) return

            try {
                setLoading(true)
                const data = await api.getRecordingDates(parseInt(id), quality)
                setAvailableDates(data.dates || [])
                if (data.dates && data.dates.length > 0) {
                    setSelectedDate(data.dates[0])
                } else {
                    // No recordings available - stop loading and show message
                    setLoading(false)
                    setError('No recordings available for this camera. Recordings will appear here once the system starts recording.')
                }
            } catch (err: any) {
                console.error('Error fetching dates:', err)
                setLoading(false)
                if (err.message?.includes('401') || err.message?.includes('Authentication')) {
                    setError('Authentication required. Please log in.')
                } else {
                    setError('Failed to fetch recording dates')
                }
            }
        }

        fetchDates()
    }, [id, quality])

    // Fetch camera info and timeline data
    useEffect(() => {
        const fetchData = async () => {
            if (!id || !selectedDate) return

            try {
                setLoading(true)
                setError(null)

                // Fetch camera info
                const cameras = await api.getCameras()
                const cam = cameras.find((c: Camera) => c.id === parseInt(id))
                if (!cam) {
                    setError('Camera not found')
                    return
                }
                setCamera(cam)

                // Fetch timeline data
                const timelineData = await api.getRecordingTimeline(parseInt(id), quality, selectedDate)
                setTimelineData(timelineData)

                // Auto-load first coverage block if available
                if (timelineData.coverage_blocks.length > 0) {
                    const firstBlock = timelineData.coverage_blocks[0]
                    loadVirtualPlaylist(firstBlock.start)
                }

            } catch (err: any) {
                console.error('Error fetching playback data:', err)
                setError(err.message || 'Failed to load playback data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, quality, selectedDate])

    // Draw timeline canvas
    useEffect(() => {
        if (!canvasRef.current || !timelineData) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

        const width = rect.width
        const height = rect.height

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Draw background (dark)
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(0, 0, width, height)

        // Calculate visible time range
        const dayStart = new Date(timelineData.day_start)
        const viewStart = new Date(dayStart)
        viewStart.setHours(timelineStartHour, 0, 0, 0)
        const viewEnd = new Date(viewStart)
        viewEnd.setHours(viewEnd.getHours() + timelineRange)

        const viewDuration = (viewEnd.getTime() - viewStart.getTime()) / 1000

        // Draw hour markers based on range
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 1

        const markerInterval = timelineRange <= 4 ? 1 : timelineRange === 24 ? 1 : 1
        const showMinutes = timelineRange <= 2

        for (let i = 0; i <= timelineRange; i += markerInterval) {
            const hour = timelineStartHour + i
            if (hour > 24) break

            const x = (i / timelineRange) * width
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()

            // Hour labels
            ctx.fillStyle = '#9ca3af'
            ctx.font = '10px Inter, system-ui, sans-serif'
            ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, x + 2, 12)
        }

        // Draw 15-minute markers for zoomed views
        if (showMinutes) {
            ctx.strokeStyle = '#2d3748'
            ctx.lineWidth = 0.5
            const minuteMarkers = timelineRange * 4 // 15-min intervals
            for (let i = 1; i < minuteMarkers; i++) {
                const x = (i / minuteMarkers) * width
                ctx.beginPath()
                ctx.moveTo(x, height * 0.2)
                ctx.lineTo(x, height * 0.8)
                ctx.stroke()
            }
        }

        // Draw coverage blocks
        timelineData.coverage_blocks.forEach((block) => {
            const blockStart = new Date(block.start)
            const blockEnd = new Date(block.end)

            // Skip blocks outside visible range
            if (blockEnd < viewStart || blockStart > viewEnd) return

            const startOffset = Math.max(0, (blockStart.getTime() - viewStart.getTime()) / 1000)
            const endOffset = Math.min(viewDuration, (blockEnd.getTime() - viewStart.getTime()) / 1000)
            const blockDuration = endOffset - startOffset

            const x = (startOffset / viewDuration) * width
            const blockWidth = (blockDuration / viewDuration) * width

            // Draw block with gradient
            const gradient = ctx.createLinearGradient(x, 0, x, height)
            gradient.addColorStop(0, '#3b82f6')
            gradient.addColorStop(1, '#1d4ed8')

            ctx.fillStyle = gradient
            ctx.fillRect(x, height * 0.3, blockWidth, height * 0.4)

            // Border
            ctx.strokeStyle = '#60a5fa'
            ctx.lineWidth = 1
            ctx.strokeRect(x, height * 0.3, blockWidth, height * 0.4)
        })

        // Draw hover indicator
        if (hoverTime && hoverTime >= viewStart && hoverTime <= viewEnd) {
            const hoverOffset = (hoverTime.getTime() - viewStart.getTime()) / 1000
            const x = (hoverOffset / viewDuration) * width

            ctx.strokeStyle = '#fbbf24'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
        }

    }, [timelineData, hoverTime, timelineRange, timelineStartHour])

    const loadVirtualPlaylist = useCallback((startTime: string) => {
        if (!videoRef.current || !id) return

        const video = videoRef.current
        const playlistUrl = `${API_BASE}/playback/play/${id}/virtual.m3u8?quality=${quality}&start_time=${encodeURIComponent(startTime)}`

        // Clean up previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                // Smooth playback configuration for VOD
                enableWorker: true,
                lowLatencyMode: false,

                // Buffer configuration for smooth playback
                maxBufferLength: 30,           // 30 seconds forward buffer
                maxMaxBufferLength: 60,        // Max buffer during fast seeking
                maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
                maxBufferHole: 0.5,            // Max hole to skip in buffer

                // Fragment loading
                maxFragLookUpTolerance: 0.25,  // Tolerance for finding fragments

                // Smooth playback without speed changes
                liveSyncDuration: 0,           // No live sync needed for VOD
                liveMaxLatencyDuration: 0,     // No latency management

                // Back buffer (keep previous segments for seeking)
                backBufferLength: 90,          // Keep 90s of back buffer

                // Auto quality and fragment retry
                startFragPrefetch: true,       // Prefetch next fragment
                testBandwidth: true,           // Bandwidth estimation

                // Error recovery
                fragLoadingTimeOut: 20000,     // 20s timeout for fragment load
                fragLoadingMaxRetry: 4,        // Retry up to 4 times
                fragLoadingRetryDelay: 1000,   // 1s between retries

                // ABR (disable for consistent playback)
                abrEwmaDefaultEstimate: 500000, // Default bandwidth estimate
                abrBandWidthFactor: 0.95,      // Use 95% of estimated bandwidth
                abrBandWidthUpFactor: 0.7,     // Conservative bandwidth increases

                // CRITICAL: Add authentication token to all HLS requests
                xhrSetup: (xhr: XMLHttpRequest) => {
                    const token = localStorage.getItem('auth_token')
                    if (token) {
                        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                    }
                }
            })

            hls.loadSource(playlistUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('Virtual playlist loaded, starting playback...')
                // Ensure smooth playback at 1x speed
                video.playbackRate = 1.0
                // Auto-play when manifest is ready
                video.play().catch(err => {
                    console.warn('Auto-play prevented by browser:', err)
                    // Some browsers require user interaction first
                })
            })

            hls.on(Hls.Events.ERROR, (_event, data) => {
                console.error('HLS error:', data)
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Network error, attempting recovery...')
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Media error, attempting recovery...')
                            hls.recoverMediaError()
                            break
                        default:
                            setError(`Playback error: ${data.type}`)
                            break
                    }
                }
            })

            // Monitor buffer health
            hls.on(Hls.Events.BUFFER_CREATED, () => {
                console.log('Buffer created')
            })

            hls.on(Hls.Events.BUFFER_APPENDING, () => {
                // Buffer is being filled
            })

            hlsRef.current = hls
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = playlistUrl
            video.addEventListener('loadedmetadata', () => {
                console.log('Native HLS loaded, starting playback...')
                video.play().catch(err => {
                    console.warn('Auto-play prevented by browser:', err)
                })
            }, { once: true })
        } else {
            setError('HLS playback not supported in this browser')
        }
    }, [id, quality])

    const handleTimelineClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !timelineData) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width

        const dayStart = new Date(timelineData.day_start)
        const viewStart = new Date(dayStart)
        viewStart.setHours(timelineStartHour, 0, 0, 0)
        const viewEnd = new Date(viewStart)
        viewEnd.setHours(viewEnd.getHours() + timelineRange)

        const viewDuration = (viewEnd.getTime() - viewStart.getTime()) / 1000
        const targetTime = new Date(viewStart.getTime() + (percent * viewDuration * 1000))

        // Find the coverage block containing this time
        const block = timelineData.coverage_blocks.find((block) => {
            const blockStart = new Date(block.start)
            const blockEnd = new Date(block.end)
            return targetTime >= blockStart && targetTime <= blockEnd
        })

        if (block) {
            // Load the virtual playlist at the clicked time
            // Auto-play is handled by MANIFEST_PARSED event
            loadVirtualPlaylist(targetTime.toISOString())
        }
    }

    const handleTimelineMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !timelineData) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width

        const dayStart = new Date(timelineData.day_start)
        const viewStart = new Date(dayStart)
        viewStart.setHours(timelineStartHour, 0, 0, 0)
        const viewEnd = new Date(viewStart)
        viewEnd.setHours(viewEnd.getHours() + timelineRange)

        const viewDuration = (viewEnd.getTime() - viewStart.getTime()) / 1000
        const hoverTimeValue = new Date(viewStart.getTime() + (percent * viewDuration * 1000))
        setHoverTime(hoverTimeValue)
    }

    const handleTimelineMouseLeave = () => {
        setHoverTime(null)
    }

    const handlePlayPause = () => {
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            videoRef.current.play()
        }
    }

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatVideoTime = (seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Update time and duration
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const updateTime = () => setCurrentTime(video.currentTime)
        const updateDuration = () => setDuration(video.duration)
        const updatePlayState = () => setIsPlaying(!video.paused)

        // Prevent playback rate changes (keep at 1.0x for smooth playback)
        const enforcePlaybackRate = () => {
            if (video.playbackRate !== 1.0) {
                console.log('Correcting playback rate from', video.playbackRate, 'to 1.0')
                video.playbackRate = 1.0
            }
        }

        // Monitor buffering to prevent stuttering
        const handleWaiting = () => {
            console.log('Video buffering...')
        }

        const handleCanPlay = () => {
            console.log('Video can play')
        }

        video.addEventListener('timeupdate', updateTime)
        video.addEventListener('durationchange', updateDuration)
        video.addEventListener('play', updatePlayState)
        video.addEventListener('pause', updatePlayState)
        video.addEventListener('ratechange', enforcePlaybackRate)
        video.addEventListener('waiting', handleWaiting)
        video.addEventListener('canplay', handleCanPlay)

        // Set initial playback rate
        video.playbackRate = 1.0

        return () => {
            video.removeEventListener('timeupdate', updateTime)
            video.removeEventListener('durationchange', updateDuration)
            video.removeEventListener('play', updatePlayState)
            video.removeEventListener('pause', updatePlayState)
            video.removeEventListener('ratechange', enforcePlaybackRate)
            video.removeEventListener('waiting', handleWaiting)
            video.removeEventListener('canplay', handleCanPlay)
        }
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-white mt-4">Loading timeline...</p>
                </div>
            </div>
        )
    }

    if (error || !camera) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-400 text-xl mb-4">{error || 'Camera not found'}</p>
                    <button
                        onClick={() => navigate('/live')}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded transition-colors"
                    >
                        Back to Live Wall
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header - Responsive */}
            <div className="bg-gray-900 border-b border-gray-800 p-3 sm:p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <button
                            onClick={() => navigate('/live')}
                            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Playback: {camera.name}</h1>
                            <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Click timeline to start playback</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-3 sm:p-4">
                {/* Date Selector - Mobile Friendly */}
                <div className="mb-3 sm:mb-4">
                    <label className="block text-gray-400 text-sm mb-2">Select Date</label>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full sm:w-auto bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                        {availableDates.map(date => (
                            <option key={date} value={date}>{date}</option>
                        ))}
                    </select>
                </div>

                {/* Video Player */}
                <div className="bg-gray-900 rounded-lg overflow-hidden mb-3 sm:mb-4">
                    <div className="relative aspect-video bg-black">
                        <video
                            ref={videoRef}
                            className="w-full h-full"
                            controls={false}
                        />

                        {!timelineData?.coverage_blocks.length && (
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className="text-center text-gray-400">
                                    <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm sm:text-base">No recordings for selected date</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Playback Controls - Responsive */}
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handlePlayPause}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                disabled={!timelineData?.coverage_blocks.length}
                            >
                                {isPlaying ? (
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>

                            <div className="text-white text-xs sm:text-sm font-mono flex-shrink-0">
                                {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                            </div>

                            {timelineData && (
                                <div className="text-gray-400 text-xs sm:text-sm ml-auto hidden sm:block">
                                    {timelineData.coverage_blocks.length} segments • {Math.floor(timelineData.total_recorded_seconds / 3600)}h {Math.floor((timelineData.total_recorded_seconds % 3600) / 60)}m recorded
                                </div>
                            )}
                        </div>

                        {/* Mobile Stats */}
                        {timelineData && (
                            <div className="text-gray-400 text-xs block sm:hidden text-center">
                                {timelineData.coverage_blocks.length} segments • {Math.floor(timelineData.total_recorded_seconds / 3600)}h {Math.floor((timelineData.total_recorded_seconds % 3600) / 60)}m
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline Canvas - Responsive */}
                <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    {/* Timeline Header */}
                    <div className="mb-3">
                        <h2 className="text-white font-semibold flex items-center mb-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm sm:text-base">Timeline</span>
                            {hoverTime && (
                                <span className="ml-2 sm:ml-4 text-xs sm:text-sm font-normal text-yellow-400 hidden sm:inline">
                                    {formatTime(hoverTime)}
                                </span>
                            )}
                        </h2>

                        {/* Time Range Controls - Mobile Friendly */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs sm:text-sm">Range:</span>
                                <div className="flex bg-gray-800 rounded-lg p-1">
                                    {[1, 2, 4, 24].map((hours) => (
                                        <button
                                            key={hours}
                                            onClick={() => {
                                                setTimelineRange(hours as 1 | 2 | 4 | 24)
                                                if (timelineStartHour + hours > 24) {
                                                    setTimelineStartHour(Math.max(0, 24 - hours))
                                                }
                                            }}
                                            className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                                                timelineRange === hours
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                        >
                                            {hours}h
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Hour Navigation (only show for zoomed views) */}
                            {timelineRange < 24 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setTimelineStartHour(Math.max(0, timelineStartHour - 1))}
                                        disabled={timelineStartHour === 0}
                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-gray-400 text-xs sm:text-sm min-w-[70px] sm:min-w-[80px] text-center">
                                        {timelineStartHour.toString().padStart(2, '0')}:00 - {(timelineStartHour + timelineRange).toString().padStart(2, '0')}:00
                                    </span>
                                    <button
                                        onClick={() => setTimelineStartHour(Math.min(24 - timelineRange, timelineStartHour + 1))}
                                        disabled={timelineStartHour + timelineRange >= 24}
                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Click Instruction */}
                    <p className="text-gray-500 text-xs sm:text-sm mb-2 text-center">
                        Click on blue blocks to start playback
                    </p>

                    <div ref={timelineRef} className="relative">
                        <canvas
                            ref={canvasRef}
                            onClick={handleTimelineClick}
                            onMouseMove={handleTimelineMouseMove}
                            onMouseLeave={handleTimelineMouseLeave}
                            className="w-full h-16 sm:h-20 cursor-pointer rounded bg-gray-800 touch-manipulation"
                            style={{ display: 'block' }}
                        />
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-b from-blue-500 to-blue-700 rounded mr-1.5 sm:mr-2 flex-shrink-0"></div>
                            <span>Recorded</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-700 rounded mr-1.5 sm:mr-2 flex-shrink-0"></div>
                            <span>No recording</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
