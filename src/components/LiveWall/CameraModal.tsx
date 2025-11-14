import { Camera } from '../../services/api'
import { useState, useRef, useEffect } from 'react'

interface CameraModalProps {
  camera: Camera
  streamInfo?: { resolution: string; fps: number; bitrate: string }
  liveStats?: { bufferLength: number; bandwidth: number; droppedFrames: number }
  quality: 'high' | 'low'
  isMuted: boolean
  onClose: () => void
  onQualityChange: (quality: 'high' | 'low') => void
  onToggleMute: () => void
  onRefresh: () => void
  videoRef: (el: HTMLVideoElement | null) => void
  onClick?: (e: React.MouseEvent) => void
}

export const CameraModal = ({
  camera,
  streamInfo,
  liveStats,
  quality,
  isMuted,
  onClose,
  onQualityChange,
  onToggleMute,
  onRefresh,
  videoRef,
  onClick
}: CameraModalProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [hasVideoStarted, setHasVideoStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  // Update video ref callback to also store local ref
  const handleVideoRef = (el: HTMLVideoElement | null) => {
    videoElementRef.current = el
    videoRef(el)
  }

  // Manage video event listeners in useEffect
  useEffect(() => {
    const video = videoElementRef.current
    if (!video) return

    // Reset loading state when video element changes
    setIsVideoLoading(true)
    setHasVideoStarted(false)

    // Track loading states
    const handleLoadStart = () => {
      console.log(`[Modal Camera ${camera.id}] Video loadstart`)
      setIsVideoLoading(true)
    }

    const handleCanPlay = () => {
      console.log(`[Modal Camera ${camera.id}] Video canplay`)
      setIsVideoLoading(false)
    }

    const handlePlaying = () => {
      console.log(`[Modal Camera ${camera.id}] Video playing - hiding loading overlay`)
      setIsVideoLoading(false)
      setHasVideoStarted(true)
    }

    const handleWaiting = () => {
      console.log(`[Modal Camera ${camera.id}] Video waiting`)
      setIsVideoLoading(true)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('waiting', handleWaiting)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [camera.id, quality]) // Re-run when camera or quality changes

  const qualityLabels = {
    high: 'High (2880x1620)',
    low: 'Low (480p)'
  }

  const qualityLabelsShort = {
    high: 'High',
    low: 'Low'
  }

  const handleQualitySelect = (newQuality: 'high' | 'low') => {
    onQualityChange(newQuality)
    setIsDropdownOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-90" />

        {/* Modal panel */}
        <div
          className="inline-block align-bottom bg-black rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-6xl"
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(e)
          }}
        >
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">{camera.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{camera.mediamtx_path}</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Quality selector - Mobile dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsDropdownOpen(!isDropdownOpen)
                  }}
                  className="flex items-center bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors"
                >
                  {qualityLabelsShort[quality]}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQualitySelect('high')
                      }}
                      className={`w-full px-4 py-2 text-xs font-medium text-left transition-colors ${
                        quality === 'high'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {qualityLabels.high}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQualitySelect('low')
                      }}
                      className={`w-full px-4 py-2 text-xs font-medium text-left transition-colors ${
                        quality === 'low'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {qualityLabels.low}
                    </button>
                  </div>
                )}
              </div>

              {/* Quality selector - Desktop buttons */}
              <div className="hidden md:flex items-center bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onQualityChange('high')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    quality === 'high'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  title="High quality for AI detection (2880x1620)"
                >
                  High
                </button>
                <button
                  onClick={() => onQualityChange('low')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    quality === 'low'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  title="Low quality for bandwidth efficiency (480p)"
                >
                  Low
                </button>
              </div>
              {/* Audio control button */}
              <button
                onClick={onToggleMute}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              {/* Refresh stream button */}
              <button
                onClick={onRefresh}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                title="Refresh stream"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video Container */}
          <div ref={containerRef} className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            <video
              ref={handleVideoRef}
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
                    Loading {quality === 'high' ? 'High Quality' : 'Low Quality'} Stream...
                  </div>
                  <div className="text-sm text-gray-300">
                    {quality === 'high' ? '2880x1620' : '480p'} @ H.264
                  </div>
                </div>
              </div>
            )}

            {camera.online && !isVideoLoading && (
              <div className="absolute bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <span className="animate-pulse mr-2">●</span> LIVE
              </div>
            )}
          </div>

          {/* Camera Details & Events */}
          <div className="bg-gray-800 px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Info */}
            <div className="text-white">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Camera Information</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={camera.online ? 'text-green-400' : 'text-red-400'}>
                    {camera.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-white font-medium capitalize">{quality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolution:</span>
                  <span className="text-white font-medium">
                    {streamInfo?.resolution || 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Frame Rate:</span>
                  <span className="text-white font-medium">
                    {streamInfo?.fps ? `${streamInfo.fps} fps` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bitrate:</span>
                  <span className="text-white font-medium">
                    {streamInfo?.bitrate || 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Codec:</span>
                  <span className="text-white font-medium">H.264 Main</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <h5 className="text-xs font-medium text-gray-300 mb-1">Live Statistics</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Buffer:</span>
                      <span className={`text-xs font-medium ${
                        (liveStats?.bufferLength || 0) > 5 ? 'text-green-400' :
                        (liveStats?.bufferLength || 0) > 2 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {liveStats?.bufferLength?.toFixed(1) || '0.0'}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Bandwidth:</span>
                      <span className="text-white text-xs font-medium">
                        {liveStats?.bandwidth
                          ? `${(liveStats.bandwidth / 1000000).toFixed(2)} Mbps`
                          : '0.00 Mbps'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Dropped Frames:</span>
                      <span className={`text-xs font-medium ${
                        (liveStats?.droppedFrames || 0) === 0 ? 'text-green-400' :
                        (liveStats?.droppedFrames || 0) < 10 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {liveStats?.droppedFrames || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-1 mt-2">
                  <span className="text-gray-400 text-xs">RTSP URL:</span>
                  <span className="text-gray-300 text-xs truncate max-w-xs">
                    {camera.rtsp_url}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
