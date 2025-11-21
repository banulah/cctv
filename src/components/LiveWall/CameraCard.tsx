import { useState, memo } from 'react'
import { Link } from 'react-router-dom'
import { Camera } from '../../services/api'

interface CameraCardProps {
  camera: Camera
  streamError: string | null
  isInitializing: boolean
  isStarting: boolean
  isOffline: boolean
  onStartStream: () => void
  onRestartStream: () => void
  onRetry: () => void
  videoRef: (el: HTMLVideoElement | null) => void
  onCameraUpdated: () => void
}

function CameraCardComponent({
  camera,
  streamError,
  isInitializing,
  isStarting,
  isOffline,
  onStartStream,
  onRestartStream,
  onRetry,
  videoRef,
  onCameraUpdated
}: CameraCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingRecognition, setIsTogglingRecognition] = useState(false)
  const [isTogglingANPR, setIsTogglingANPR] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const handleToggleRecognition = async () => {
    setIsTogglingRecognition(true)
    setToggleError(null)
    try {
      const { api } = await import('../../services/api')
      await api.toggleRecognition(camera.id)
      // Refresh camera data
      onCameraUpdated()
    } catch (error: any) {
      setToggleError(error.message || 'Failed to toggle recognition')
      console.error('Failed to toggle recognition:', error)
    } finally {
      setIsTogglingRecognition(false)
    }
  }

  const handleToggleANPR = async () => {
    setIsTogglingANPR(true)
    setToggleError(null)
    try {
      const { api } = await import('../../services/api')
      await api.toggleANPR(camera.id)
      // Refresh camera data
      onCameraUpdated()
    } catch (error: any) {
      setToggleError(error.message || 'Failed to toggle ANPR')
      console.error('Failed to toggle ANPR:', error)
    } finally {
      setIsTogglingANPR(false)
    }
  }

  const handleDeleteCamera = async () => {
    setIsDeleting(true)
    try {
      const { api } = await import('../../services/api')
      await api.deleteCamera(camera.id)
      // Refresh camera list
      onCameraUpdated()
      setShowDeleteConfirm(false)
    } catch (error: any) {
      alert(error.message || 'Failed to delete camera')
      console.error('Failed to delete camera:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative w-full" style={{ perspective: '1000px', minHeight: '300px' }}>
      {/* Flip Container */}
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT SIDE - Camera Feed */}
        <div
          className="bg-gray-900 rounded-lg overflow-hidden shadow-lg relative group"
          style={{
            backfaceVisibility: 'hidden',
            pointerEvents: isFlipped ? 'none' : 'auto'
          }}
        >
          {/* Camera Name Header */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-semibold text-sm truncate">
                  {camera.name}
                </h3>
                {camera.online ? (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 text-xs">Live</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-red-400 text-xs">Offline</span>
                  </span>
                )}
              </div>

              {/* Flip Button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsFlipped(!isFlipped)
                }}
                className="text-white hover:bg-white/20 rounded p-1 transition-colors"
                title="Show camera settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative aspect-video bg-gray-950">
            {/* Video element - ALWAYS rendered so HLS can attach */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Loading Overlay - Initializing */}
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="text-white mt-3 text-sm">Initializing stream...</p>
                </div>
              </div>
            )}

            {/* Loading Overlay - Starting */}
            {isStarting && !isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                  <p className="text-white mt-3 text-sm font-medium">Starting transcoding...</p>
                  <p className="text-gray-400 mt-1 text-xs">This may take 15-20 seconds</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {streamError && !isInitializing && !isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="text-center p-6">
                  <svg className="w-16 h-16 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-400 font-semibold mb-1">{streamError}</p>
                  <p className="text-gray-400 text-sm mb-4">Stream unavailable</p>
                  <div className="space-y-2">
                    <button
                      onClick={onRetry}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Retry Connection
                    </button>
                    {!camera.online && (
                      <button
                        onClick={onStartStream}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                      >
                        Start Stream
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Offline Overlay */}
            {isOffline && !isInitializing && !isStarting && !streamError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="text-center p-6">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 font-semibold mb-4">Camera Offline</p>
                  <button
                    onClick={onStartStream}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded transition-colors"
                  >
                    Start Stream
                  </button>
                </div>
              </div>
            )}

            {/* Hover Overlay - Only show when no overlays are active */}
            {!isInitializing && !isStarting && !streamError && !isOffline && (
              <Link
                to={`/live/camera/${camera.id}`}
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
              >
                <div className="text-white text-center">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <p className="font-semibold">Click to view full screen</p>
                </div>
              </Link>
            )}
          </div>

          {/* Bottom Info */}
          <div className="p-3 bg-gray-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3 text-gray-400">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{camera.online ? 'Streaming' : 'Stopped'}</span>
                </span>
                {camera.enable_recognition && (
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Recognition</span>
                  </span>
                )}
                {camera.enable_anpr && (
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>ANPR</span>
                  </span>
                )}
              </div>
              <Link
                to={`/live/camera/${camera.id}`}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Details →
              </Link>
            </div>
          </div>
        </div>

        {/* BACK SIDE - Camera Settings/Info */}
        <div
          className="absolute inset-0 bg-gray-900 rounded-lg overflow-hidden shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-900 rounded-lg h-full flex flex-col">
            {/* Back Header */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Camera Settings
                </h3>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsFlipped(!isFlipped)
                  }}
                  className="text-white hover:bg-white/20 rounded p-1 transition-colors"
                  title="Show camera feed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Camera Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Camera Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">{camera.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-medium ${camera.online ? 'text-green-400' : 'text-red-400'}`}>
                      {camera.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-gray-300 font-mono text-xs">{camera.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Path:</span>
                    <span className="text-gray-300 font-mono text-xs">{camera.mediamtx_path}</span>
                  </div>
                </div>
              </div>

              {/* RTSP URL */}
              <div className="space-y-2 border-t border-gray-700 pt-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Connection</h4>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-xs text-gray-400 mb-1">RTSP URL:</p>
                  <p className="text-xs text-gray-300 font-mono break-all">{camera.rtsp_url}</p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 border-t border-gray-700 pt-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Features</h4>
                {toggleError && (
                  <div className="bg-red-900 border border-red-700 rounded p-2 text-xs text-red-300">
                    {toggleError}
                  </div>
                )}
                <div className="space-y-2">
                  <button
                    onClick={handleToggleRecognition}
                    disabled={isTogglingRecognition}
                    className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-gray-300">Face Recognition</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      camera.enable_recognition 
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isTogglingRecognition ? '...' : (camera.enable_recognition ? 'ON' : 'OFF')}
                    </span>
                  </button>
                  <button
                    onClick={handleToggleANPR}
                    disabled={isTogglingANPR}
                    className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-300">ANPR (License Plate)</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      camera.enable_anpr 
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isTogglingANPR ? '...' : (camera.enable_anpr ? 'ON' : 'OFF')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t border-gray-700 pt-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</h4>
                <div className="space-y-2">
                  <Link
                    to={`/live/camera/${camera.id}`}
                    className="flex items-center justify-center space-x-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Full Screen</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRestartStream()
                    }}
                    className="flex items-center justify-center space-x-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Restart Stream</span>
                  </button>
                  {streamError && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onRetry()
                      }}
                      className="flex items-center justify-center space-x-2 w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Retry Connection</span>
                    </button>
                  )}
                  {!camera.online && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onStartStream()
                      }}
                      className="flex items-center justify-center space-x-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Start Stream</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowDeleteConfirm(true)
                    }}
                    className="flex items-center justify-center space-x-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Camera</span>
                  </button>

                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
                      <div className="fixed inset-0 bg-black/50"></div>
                      <div 
                        className="relative bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full mx-4 border border-red-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Camera?</h3>
                        <p className="text-gray-300 text-sm mb-4">
                          Are you sure you want to permanently delete <span className="font-semibold">{camera.name}</span>?
                        </p>
                        <p className="text-gray-400 text-xs mb-4">
                          This will:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Stop the camera stream</li>
                            <li>Delete all recorded observations</li>
                            <li>Delete all events from this camera</li>
                            <li>Cannot be undone</li>
                          </ul>
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteCamera()
                            }}
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders that interrupt video playback
export const CameraCard = memo(CameraCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.camera.id === nextProps.camera.id &&
    prevProps.camera.name === nextProps.camera.name &&
    prevProps.camera.online === nextProps.camera.online &&
    prevProps.camera.enable_recognition === nextProps.camera.enable_recognition &&
    prevProps.camera.enable_anpr === nextProps.camera.enable_anpr &&
    prevProps.streamError === nextProps.streamError &&
    prevProps.isInitializing === nextProps.isInitializing &&
    prevProps.isStarting === nextProps.isStarting &&
    prevProps.isOffline === nextProps.isOffline
  )
})
