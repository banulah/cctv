import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Hls from 'hls.js'
import { api, Camera, API_BASE } from '../services/api'

interface Recording {
  id: number
  camera_id: number
  quality: string
  start_time: string
  end_time: string
  duration_seconds: number
  segment_count: number
  file_size_bytes: number
  storage_path: string
}

export default function Playback() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // Read query parameters
  const urlDate = searchParams.get('date') || ''
  const urlHour = searchParams.get('hour') || 'all'
  const urlQuality = searchParams.get('quality') || 'high'

  const [camera, setCamera] = useState<Camera | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [quality, setQuality] = useState<'high' | 'low'>(urlQuality as 'high' | 'low')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(urlDate)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [filterHour, setFilterHour] = useState<string>(urlHour)
  const [availableHours, setAvailableHours] = useState<number[]>([])

  // Fetch available dates
  useEffect(() => {
    const fetchDates = async () => {
      if (!id) return

      try {
        const response = await fetch(
          `${API_BASE}/playback/recordings/${id}/dates?quality=${quality}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          setAvailableDates(data.dates || [])
          // Auto-select most recent date
          if (data.dates && data.dates.length > 0) {
            setSelectedDate(data.dates[0])
          }
        }
      } catch (err) {
        console.error('Error fetching dates:', err)
      }
    }

    fetchDates()
  }, [id, quality])

  // Fetch camera info and recordings
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

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

        // Build query parameters
        let url = `${API_BASE}/playback/recordings/${id}?quality=${quality}`

        // Add date filter if selected
        if (selectedDate) {
          const startTime = `${selectedDate}T00:00:00Z`
          const endTime = `${selectedDate}T23:59:59Z`
          url += `&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
        }

        // Fetch recordings
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch recordings')
        }

        const data = await response.json()
        let allRecordings = data.recordings || []

        // Extract unique hours that have recordings
        const hoursSet = new Set<number>()
        allRecordings.forEach((rec: Recording) => {
          const recHour = new Date(rec.start_time).getHours()
          hoursSet.add(recHour)
        })
        const hours = Array.from(hoursSet).sort((a, b) => a - b)
        setAvailableHours(hours)

        // Filter by hour if specified
        let filteredRecordings = allRecordings
        if (filterHour !== 'all') {
          const targetHour = parseInt(filterHour)
          filteredRecordings = allRecordings.filter((rec: Recording) => {
            const recHour = new Date(rec.start_time).getHours()
            return recHour === targetHour
          })
        }

        setRecordings(filteredRecordings)

        // Auto-select most recent recording
        if (filteredRecordings.length > 0) {
          setSelectedRecording(filteredRecordings[0])
        } else {
          setSelectedRecording(null)
        }
      } catch (err: any) {
        console.error('Error fetching playback data:', err)
        setError(err.message || 'Failed to load playback data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, quality, selectedDate, filterHour])

  // Load video when recording is selected
  useEffect(() => {
    if (!selectedRecording || !videoRef.current) return

    const video = videoRef.current
    const playlistUrl = `${API_BASE}/playback/play/${id}/${selectedRecording.id}/playlist.m3u8`

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      })

      hls.loadSource(playlistUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded for recording', selectedRecording.id)
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error:', data)
        if (data.fatal) {
          setError(`Playback error: ${data.type}`)
        }
      })

      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = playlistUrl
    } else {
      setError('HLS playback not supported in this browser')
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [selectedRecording, id])

  // Update time and duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const updatePlayState = () => setIsPlaying(!video.paused)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('durationchange', updateDuration)
    video.addEventListener('play', updatePlayState)
    video.addEventListener('pause', updatePlayState)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('durationchange', updateDuration)
      video.removeEventListener('play', updatePlayState)
      video.removeEventListener('pause', updatePlayState)
    }
  }, [])

  const handlePlayPause = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = parseFloat(e.target.value)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`
    }
    return `${(mb / 1024).toFixed(2)} GB`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-white mt-4">Loading recordings...</p>
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
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/live')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Playback: {camera.name}</h1>
              <p className="text-gray-400 text-sm">7-day recording history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              {/* Video */}
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls={false}
                />

                {!selectedRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Select a recording to play</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              {selectedRecording && (
                <div className="p-4 space-y-3">
                  {/* Timeline */}
                  <div className="flex items-center space-x-3">
                    <span className="text-white text-sm font-mono min-w-[45px]">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, #374151 ${(currentTime / (duration || 1)) * 100}%, #374151 100%)`
                      }}
                    />
                    <span className="text-white text-sm font-mono min-w-[45px]">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Play/Pause Button */}
                      <button
                        onClick={handlePlayPause}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>

                      {/* Divider */}
                      <div className="h-8 w-px bg-gray-700"></div>

                      {/* Date Filter */}
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <select
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          title="Select date"
                        >
                          <option value="">All Dates</option>
                          {availableDates.map(date => (
                            <option key={date} value={date}>{date}</option>
                          ))}
                        </select>
                      </div>

                      {/* Hour Filter */}
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <select
                          value={filterHour}
                          onChange={(e) => setFilterHour(e.target.value)}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          title="Select hour"
                          disabled={availableHours.length === 0}
                        >
                          <option value="all">All Hours</option>
                          {availableHours.map(hour => (
                            <option key={hour} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quality Filter */}
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <select
                          value={quality}
                          onChange={(e) => setQuality(e.target.value as 'high' | 'low')}
                          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          title="Select quality"
                        >
                          <option value="high">High</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Recording Info */}
                    <div className="text-gray-400 text-sm">
                      <span className="mr-4">{selectedRecording.segment_count} segments</span>
                      <span>{formatSize(selectedRecording.file_size_bytes)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recording List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Available Recordings
              </h2>

              {recordings.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm">No recordings available</p>
                  <p className="text-xs mt-1">Recordings will appear here as they're saved</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recordings.map((recording) => (
                    <button
                      key={recording.id}
                      onClick={() => setSelectedRecording(recording)}
                      className={`w-full text-left p-3 rounded transition-colors ${selectedRecording?.id === recording.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="text-sm font-semibold">
                            {new Date(recording.start_time).toLocaleDateString()}
                          </div>
                          <div className="text-lg font-bold">
                            {new Date(recording.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {selectedRecording?.id === recording.id && (
                          <svg className="w-4 h-4 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="text-xs opacity-75 space-y-1">
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{Math.floor(recording.duration_seconds / 60)}m {recording.duration_seconds % 60}s</span>
                          <span className="mx-1">•</span>
                          <span>{recording.segment_count} segments</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <span>{formatSize(recording.file_size_bytes)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
