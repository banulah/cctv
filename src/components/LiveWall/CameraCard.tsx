import { Camera } from '../../services/api'
import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

interface CameraCardProps {
  camera: Camera
  streamError: string | null
  isInitializing: boolean
  isStarting: boolean
  isOffline: boolean
  onStartStream: () => void
  onRetry: () => void
  videoRef: (el: HTMLVideoElement | null) => void
  onCameraUpdated: () => void
}

export const CameraCard = ({
  camera,
  streamError,
  isInitializing,
  isStarting,
  isOffline,
  onStartStream,
  onRetry,
  videoRef,
  onCameraUpdated
}: CameraCardProps) => {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [hasVideoStarted, setHasVideoStarted] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  // Settings state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: camera.name, rtsp_url: camera.rtsp_url })
  const [errors, setErrors] = useState<{ name?: string; rtsp_url?: string }>({})
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [camera.id])

  const validateForm = (): boolean => {
    const newErrors: { name?: string; rtsp_url?: string } = {}

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Camera name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.rtsp_url || !formData.rtsp_url.trim()) {
      newErrors.rtsp_url = 'RTSP URL is required'
    } else {
      const rtspPattern = /^rtsp:\/\/.+/
      if (!rtspPattern.test(formData.rtsp_url.trim())) {
        newErrors.rtsp_url = 'RTSP URL must start with "rtsp://"'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateForm()) return

    setLoading(true)
    try {
      await api.updateCamera(camera.id, formData.name.trim(), formData.rtsp_url.trim())
      setSuccessMessage('Camera updated successfully!')
      setIsEditing(false)
      setTimeout(() => setSuccessMessage(null), 3000)
      onCameraUpdated()
    } catch (error: any) {
      alert(error.message || 'Failed to update camera')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete camera "${camera.name}"? This cannot be undone.`)) return

    setDeleting(true)
    try {
      await api.deleteCamera(camera.id)
      onCameraUpdated()
    } catch (error: any) {
      alert(error.message || 'Failed to delete camera')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleFeature = async (feature: 'recognition' | 'anpr', enabled: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const payload = {
        name: camera.name,
        rtsp_url: camera.rtsp_url,
        enable_recognition: feature === 'recognition' ? enabled : camera.enable_recognition,
        enable_anpr: feature === 'anpr' ? enabled : camera.enable_anpr
      }

      await fetch(`http://localhost:8000/api/cameras/${camera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const featureName = feature === 'recognition' ? 'Person Recognition' : 'ANPR'
      setSuccessMessage(`${featureName} ${enabled ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccessMessage(null), 3000)
      onCameraUpdated()
    } catch (error) {
      alert('Failed to update camera settings')
    }
  }

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
    if (isFlipped) {
      setIsEditing(false)
      setFormData({ name: camera.name, rtsp_url: camera.rtsp_url })
      setErrors({})
    }
  }

  return (
    <div className="relative" style={{ perspective: '1000px' }}>
      <div
        className={`relative w-full transition-transform duration-500 transform-gpu`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* FRONT SIDE - Live Video */}
        <div
          className="bg-black rounded-lg overflow-hidden shadow-lg relative cursor-pointer"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
          onClick={() => navigate(`/live/camera/${camera.id}`)}
        >
          <div ref={containerRef} className="relative aspect-video bg-gray-900">
            <video
              ref={handleVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              style={{ position: 'relative', zIndex: 0 }}
            />

            {/* Loading Overlay */}
            {!isOffline && ((isInitializing && !hasVideoStarted) || (isVideoLoading && !hasVideoStarted && !streamError && camera.online)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75" style={{ zIndex: 20 }}>
                <div className="text-center text-white p-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                  <div className="text-sm font-medium mb-2">
                    {isInitializing ? 'Initializing Stream...' : 'Loading Stream...'}
                  </div>
                  <div className="text-xs text-gray-300">
                    {isInitializing ? `Connecting to ${camera.name}` : 'Please wait'}
                  </div>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {!isInitializing && (isOffline || !camera.online || streamError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90" style={{ zIndex: 20 }}>
                <div className="text-center text-white p-4">
                  {isOffline ? (
                    <>
                      <div className="mb-3">
                        <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>
                        <div className="text-base font-bold mb-1 text-red-400">OFFLINE</div>
                        <div className="text-xs text-gray-300 mb-1">Camera stream unavailable</div>
                        <div className="text-xs text-gray-400">Max retry attempts reached</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRetry()
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-medium transition-colors"
                      >
                        Try Again
                      </button>
                    </>
                  ) : !camera.online ? (
                    <>
                      <div className="text-sm font-medium mb-2">Camera Offline</div>
                      <div className="text-xs text-gray-300 mb-3">
                        {camera.rtsp_url ? 'RTSP stream unavailable' : 'No RTSP URL configured'}
                      </div>
                      {camera.rtsp_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartStream()
                          }}
                          disabled={isStarting}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                        >
                          {isStarting ? 'Connecting...' : 'Connect Stream'}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium mb-1">Stream Unavailable</div>
                      <div className="text-xs text-gray-300 mb-2">{streamError}</div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartStream()
                          }}
                          disabled={isStarting}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                        >
                          {isStarting ? 'Starting...' : 'Start'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRetry()
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Camera Name */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium">
              {camera.name}
            </div>

            {/* Flip Button - Top Right */}
            <button
              onClick={handleFlip}
              className="absolute top-2 right-2 bg-black bg-opacity-75 hover:bg-opacity-90 text-white p-2 rounded transition-colors z-30"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Live Badge */}
            {camera.online && !streamError && (
              <div className="absolute bottom-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                ● Live
              </div>
            )}
          </div>
        </div>

        {/* BACK SIDE - Settings */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-700 bg-opacity-40">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${camera.online ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">{camera.name}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">ID: {camera.id}</span>
                    <span className="text-gray-500">•</span>
                    <span className={camera.online ? 'text-green-400' : 'text-red-400'}>
                      {camera.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleFlip}
                className="text-gray-300 hover:text-white transition-colors p-1 flex-shrink-0"
                title="Back to video"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Success Message - Compact */}
            {successMessage && (
              <div className="mx-3 mt-2 bg-green-500 bg-opacity-20 border border-green-500 rounded px-2 py-1 text-green-300 text-xs">
                ✓ {successMessage}
              </div>
            )}

            {/* Edit Form or Display */}
            {isEditing ? (
              <form onSubmit={handleUpdate} className="flex flex-col flex-1 p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Camera Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value })
                      if (errors.name) setErrors({ ...errors, name: undefined })
                    }}
                    className={`w-full bg-slate-700 border rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Camera name"
                  />
                  {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">RTSP URL</label>
                  <input
                    type="text"
                    value={formData.rtsp_url}
                    onChange={e => {
                      setFormData({ ...formData, rtsp_url: e.target.value })
                      if (errors.rtsp_url) setErrors({ ...errors, rtsp_url: undefined })
                    }}
                    className={`w-full bg-slate-700 border rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      errors.rtsp_url ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="rtsp://..."
                  />
                  {errors.rtsp_url && <p className="mt-0.5 text-xs text-red-400">{errors.rtsp_url}</p>}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(false)
                      setFormData({ name: camera.name, rtsp_url: camera.rtsp_url })
                      setErrors({})
                    }}
                    className="px-3 py-1.5 border border-gray-500 text-gray-300 rounded text-xs font-medium hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col flex-1 p-3">
                {/* RTSP URL - Compact */}
                <div className="mb-2 bg-slate-700 bg-opacity-40 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    RTSP Source
                  </div>
                  <div className="text-xs text-white font-mono truncate" title={camera.rtsp_url}>
                    {camera.rtsp_url}
                  </div>
                </div>

                {/* Stream Path - Compact */}
                <div className="mb-2 bg-slate-700 bg-opacity-40 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Stream Path
                  </div>
                  <div className="text-xs text-white font-mono truncate" title={camera.mediamtx_path}>
                    {camera.mediamtx_path}
                  </div>
                </div>

                {/* AI Features - Toggle Style */}
                <div className="mb-2 bg-slate-700 bg-opacity-40 rounded px-2 py-2">
                  <div className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Features
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleToggleFeature('recognition', !camera.enable_recognition, e)}
                      className={`flex flex-col items-center justify-center py-1.5 px-2 rounded transition-all ${
                        camera.enable_recognition
                          ? 'bg-blue-600 bg-opacity-30 border border-blue-500 text-blue-300'
                          : 'bg-slate-600 bg-opacity-30 border border-slate-600 text-gray-400'
                      }`}
                    >
                      <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs font-medium">Person</span>
                    </button>
                    <button
                      onClick={(e) => handleToggleFeature('anpr', !camera.enable_anpr, e)}
                      className={`flex flex-col items-center justify-center py-1.5 px-2 rounded transition-all ${
                        camera.enable_anpr
                          ? 'bg-purple-600 bg-opacity-30 border border-purple-500 text-purple-300'
                          : 'bg-slate-600 bg-opacity-30 border border-slate-600 text-gray-400'
                      }`}
                    >
                      <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-medium">ANPR</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Compact Grid */}
                <div className="grid grid-cols-3 gap-1.5 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5"
                    title="Edit Camera"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartStream()
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5"
                    title="Restart Stream"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5"
                    title="Delete Camera"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{deleting ? 'Del..' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
