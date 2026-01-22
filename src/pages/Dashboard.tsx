import { useEffect, useState } from 'react'
import { api, Camera, Event, BASE_URL } from '../services/api'
import { wsService } from '../services/websocket'
import Layout from '../components/Layout'
import { StatCard, EventsCard, CamerasCard, IoTDevicesCard } from '../components/Dashboard'
import { CameraIcon, EventIcon, PersonIcon, PeopleIcon, VehicleIcon, ServerIcon } from '../components/Icons'

interface ServiceStatus {
  name: string
  url: string
  description: string
  status: 'loading' | 'online' | 'offline'
}

export default function Dashboard() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEvents: 0,
    personEvents: 0,
    anprEvents: 0,
    onlineCameras: 0,
    totalIdentities: 0
  })
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Backend API', url: `${BASE_URL}/health`, description: 'FastAPI', status: 'loading' },
    { name: 'MediaMTX', url: `${BASE_URL}/hls/`, description: 'Streaming', status: 'loading' },
    { name: 'Grafana', url: 'http://localhost:3000', description: 'Metrics', status: 'loading' },
    { name: 'Prometheus', url: 'http://localhost:9090', description: 'Monitoring', status: 'loading' },
    { name: 'MinIO', url: 'http://localhost:9001', description: 'Storage', status: 'loading' },
  ])

  useEffect(() => {
    loadData()
    checkServices()
    // Reduced refresh frequency - full reload every 60 seconds instead of 10
    const dataInterval = setInterval(loadData, 60000)
    const servicesInterval = setInterval(checkServices, 30000)

    // Throttle WebSocket event updates - only refresh every 5 seconds max
    let eventUpdateTimeout: number | null = null
    let pendingUpdate = false

    // WebSocket for live event updates - throttled to avoid spam
    wsService.connect()
    const unsubscribe = wsService.onEvent((event) => {
      if (event.type === 'person' || event.type === 'anpr') {
        // Mark that we have a pending update
        pendingUpdate = true

        // If no timeout is set, schedule an update in 5 seconds
        if (!eventUpdateTimeout) {
          eventUpdateTimeout = setTimeout(() => {
            if (pendingUpdate) {
              loadEventsOnly()
              pendingUpdate = false
            }
            eventUpdateTimeout = null
          }, 5000) // Update every 5 seconds at most
        }
      }
    })

    return () => {
      clearInterval(dataInterval)
      clearInterval(servicesInterval)
      if (eventUpdateTimeout) clearTimeout(eventUpdateTimeout)
      unsubscribe()
    }
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [cams, evts, ids] = await Promise.all([
        api.getCameras().catch(() => []),
        api.getEvents().catch(() => []),
        api.getIdentities().catch(() => [])
      ])

      // Ensure arrays before processing
      const cameras = Array.isArray(cams) ? cams : []
      const events = Array.isArray(evts) ? evts : []
      const identities = Array.isArray(ids) ? ids : []

      setCameras(cameras)
      setEvents(events.slice(0, 30)) // Show 30 latest events instead of 10

      const personEvents = events.filter(e => e.type === 'person').length
      const anprEvents = events.filter(e => e.type === 'anpr').length

      // Count cameras that are actually online (not just total cameras)
      const onlineCameras = cameras.filter(c => c.online).length

      setStats({
        totalEvents: events.length,
        personEvents,
        anprEvents,
        onlineCameras,
        totalIdentities: identities.length
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load only events for WebSocket updates - no full page reload
  const loadEventsOnly = async () => {
    try {
      const evts = await api.getEvents().catch(() => [])
      const events = Array.isArray(evts) ? evts : []

      setEvents(events.slice(0, 30)) // Show 30 latest events

      // Update stats for events only
      const personEvents = events.filter(e => e.type === 'person').length
      const anprEvents = events.filter(e => e.type === 'anpr').length

      setStats(prev => ({
        ...prev,
        totalEvents: events.length,
        personEvents,
        anprEvents
      }))
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const checkServices = async () => {
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          // Use GET with timeout and no-cors mode to avoid CORS issues
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

          await fetch(service.url, {
            method: 'GET',
            mode: 'no-cors', // Avoid CORS errors in console
            signal: controller.signal,
            cache: 'no-cache'
          })
          clearTimeout(timeoutId)

          // With no-cors, we can't read response, so assume online if no error
          return { ...service, status: 'online' as const }
        } catch (error) {
          // Service is unreachable or timed out
          return { ...service, status: 'offline' as const }
        }
      })
    )
    setServices(updatedServices)
  }

  return (
    <Layout>
      <div className="min-h-screen flex flex-col py-6 bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-screen-2xl mx-auto w-full px-4 lg:px-6 flex-1 flex flex-col">
          {/* Main Layout - Left Column (Stats) + Right Column (Content) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Left Column - Stats - 1 column on mobile, 2 columns on tablet, 1 column on desktop */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                <StatCard
                  title="Online Cameras"
                  value={`${stats.onlineCameras}/${cameras.length}`}
                  subtitle={`${cameras.length - stats.onlineCameras} offline`}
                  icon={<CameraIcon className="w-6 h-6" />}
                />
                <StatCard
                  title="Total Events"
                  value={stats.totalEvents}
                  subtitle="All detections"
                  icon={<EventIcon className="w-6 h-6" />}
                />
                <StatCard
                  title="Person Events"
                  value={stats.personEvents}
                  subtitle="Face recognition"
                  icon={<PersonIcon className="w-6 h-6" />}
                />
                <StatCard
                  title="ANPR Events"
                  value={stats.anprEvents}
                  subtitle="Vehicle detection"
                  icon={<VehicleIcon className="w-6 h-6" />}
                />
                <StatCard
                  title="Identities"
                  value={stats.totalIdentities}
                  subtitle="Known persons"
                  icon={<PeopleIcon className="w-6 h-6" />}
                />
              </div>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-9 space-y-5 flex flex-col min-h-0 max-h-[calc(100vh-8rem)]">
              {/* Events and Cameras Row - Fixed height with scroll */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-[500px] lg:h-[600px]">
                <EventsCard events={events} isLoading={isLoading} />
                <CamerasCard cameras={cameras} isLoading={isLoading} />
              </div>

              {/* IoT Devices and System Services Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <IoTDevicesCard isLoading={isLoading} />

                {/* System Services Card - With Real Status */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm px-6 py-5 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">System Services</h3>
                    <ServerIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {services.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-slate-50/50 transition-all border border-slate-200/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${service.status === 'online'
                            ? 'bg-emerald-500 animate-pulse'
                            : service.status === 'offline'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                            }`}></span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{service.name}</div>
                            <div className="text-xs text-slate-500 truncate">{service.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${service.status === 'online'
                            ? 'bg-emerald-100 text-emerald-700'
                            : service.status === 'offline'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                            {service.status === 'online' ? '✓' : service.status === 'offline' ? '✗' : '...'}
                          </span>
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-600 hover:text-slate-900 font-bold transition-colors"
                          >
                            →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
