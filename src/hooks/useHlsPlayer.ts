import { useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'
import { Quality, StreamInfo, LiveStats } from '../types/camera'

interface UseHlsPlayerOptions {
  videoElement: HTMLVideoElement | null
  hlsUrl: string
  quality: Quality
  enableAudio?: boolean
  onStreamInfo?: (info: StreamInfo) => void
  onLiveStats?: (stats: LiveStats) => void
  onError?: (error: string) => void
}

export const useHlsPlayer = ({
  videoElement,
  hlsUrl,
  quality,
  enableAudio = false,
  onStreamInfo,
  onLiveStats,
  onError
}: UseHlsPlayerOptions) => {
  const hlsRef = useRef<Hls | null>(null)
  const statsIntervalRef = useRef<number | null>(null)

  const getQualityConfig = useCallback((quality: Quality) => {
    const configs = {
      high: {
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10
      },
      medium: {
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        maxBufferSize: 40 * 1000 * 1000,
        abrBandWidthFactor: 0.7,
        abrBandWidthUpFactor: 0.5,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 6
      },
      low: {
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        maxBufferSize: 20 * 1000 * 1000,
        abrBandWidthFactor: 0.5,
        abrBandWidthUpFactor: 0.3,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 3
      }
    }
    return configs[quality]
  }, [])

  const initializeHls = useCallback(() => {
    if (!videoElement || !Hls.isSupported()) return

    const qualityConfig = getQualityConfig(quality)

    const hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: false,
      ...qualityConfig,
      maxBufferHole: 2.0,
      backBufferLength: 10,
      maxFragLookUpTolerance: 0.5,
      manifestLoadingTimeOut: 20000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut: 20000,
      levelLoadingMaxRetry: 4,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      xhrSetup: (xhr) => {
        xhr.withCredentials = false
        xhr.timeout = 20000
      }
    })

    hls.loadSource(hlsUrl)
    hls.attachMedia(videoElement)
    hlsRef.current = hls

    // Track FPS and bitrate
    let lastFrameCount = 0
    let lastFpsCheck = Date.now()
    let calculatedFps = 15
    let calculatedBitrate = 0
    let lastBandwidth = 0

    // Video metadata loaded
    videoElement.addEventListener('loadedmetadata', () => {
      if (onStreamInfo) {
        const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`
        onStreamInfo({ resolution, fps: calculatedFps, bitrate: '...' })
      }
    })

    // Force quality level on manifest parse
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const levelMap = { high: 0, medium: 1, low: 2 }
      const targetLevel = levelMap[quality]

      if (targetLevel !== undefined && hls.levels[targetLevel]) {
        hls.currentLevel = targetLevel
      }

      // Disable audio if not needed (for grid view)
      if (!enableAudio && hls.audioTracks.length > 0) {
        hls.audioTrack = -1
      }
    })

    // Track bitrate from level switching
    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const level = hls.levels[data.level]
      if (level && level.bitrate) {
        calculatedBitrate = level.bitrate

        if (onStreamInfo) {
          const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`
          onStreamInfo({
            resolution,
            fps: calculatedFps,
            bitrate: `${(calculatedBitrate / 1000000).toFixed(1)} Mbps`
          })
        }
      }
    })

    // Track bandwidth from fragment loading
    hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
      if (data.frag && data.frag.stats) {
        const stats = data.frag.stats
        const duration = (stats.total || 1000) / 1000
        if (stats.loaded && duration > 0) {
          lastBandwidth = (stats.loaded * 8) / duration
        }
      }
    })

    // Error handling
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (onError) {
          onError(`HLS Error: ${data.type} - ${data.details}`)
        }
      }
    })

    // FPS tracking interval
    const fpsInterval = setInterval(() => {
      if (videoElement && videoElement.getVideoPlaybackQuality) {
        const quality = videoElement.getVideoPlaybackQuality()
        const now = Date.now()
        const elapsed = (now - lastFpsCheck) / 1000
        const frameCount = quality.totalVideoFrames || 0
        const framesDiff = frameCount - lastFrameCount

        if (elapsed > 0 && framesDiff > 0) {
          calculatedFps = Math.round(framesDiff / elapsed)
          lastFrameCount = frameCount
          lastFpsCheck = now

          if (onStreamInfo) {
            const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`
            onStreamInfo({
              resolution,
              fps: calculatedFps,
              bitrate: calculatedBitrate > 0
                ? `${(calculatedBitrate / 1000000).toFixed(1)} Mbps`
                : '...'
            })
          }
        }
      }
    }, 1000)

    // Live stats tracking interval
    if (onLiveStats) {
      statsIntervalRef.current = setInterval(() => {
        if (videoElement && hls) {
          const bufferLength = videoElement.buffered.length > 0
            ? videoElement.buffered.end(0) - videoElement.currentTime
            : 0

          const droppedFrames = videoElement.getVideoPlaybackQuality
            ? videoElement.getVideoPlaybackQuality().droppedVideoFrames || 0
            : 0

          onLiveStats({
            bufferLength,
            bandwidth: lastBandwidth,
            droppedFrames
          })
        }
      }, 1000) as unknown as number
    }

    return () => {
      clearInterval(fpsInterval)
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [videoElement, hlsUrl, quality, enableAudio, onStreamInfo, onLiveStats, onError, getQualityConfig])

  useEffect(() => {
    const cleanup = initializeHls()

    return () => {
      if (cleanup) cleanup()
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [initializeHls])

  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
  }, [])

  return { hls: hlsRef.current, destroy }
}
