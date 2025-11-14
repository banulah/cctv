import { useEffect, useState } from 'react'
import { api, Camera, Event } from '../services/api'
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
    { name: 'Backend API', url: 'http://localhost:8000/docs', description: 'FastAPI', status: 'loading' },
    { name: 'MediaMTX', url: 'http://localhost:8888', description: 'Streaming', status: 'loading' },
    { name: 'Grafana', url: 'http://localhost:3000', description: 'Metrics', status: 'loading' },
    { name: 'Prometheus', url: 'http://localhost:9090', description: 'Monitoring', status: 'loading' },
    { name: 'MinIO', url: 'http://localhost:9001', description: 'Storage', status: 'loading' },
  ])

  useEffect(() => {
    loadData()
    checkServices()
    const dataInterval = setInterval(loadData, 10000)
    const servicesInterval = setInterval(checkServices, 30000)

    // WebSocket for live updates
    wsService.connect()
    const unsubscribe = wsService.onEvent((event) => {
      if (event.type === 'person' || event.type === 'anpr') {
        loadData()
      }
    })

    return () => {
      clearInterval(dataInterval)
      clearInterval(servicesInterval)
      unsubscribe()
    }
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [cams, evts, ids] = await Promise.all([
        api.getCameras(),
        api.getEvents(),
        api.getIdentities()
      ])

      setCameras(cams)
      setEvents(evts.slice(0, 10))

      const personEvents = evts.filter(e => e.type === 'person').length
      const anprEvents = evts.filter(e => e.type === 'anpr').length
      const onlineCameras = cams.filter(c => c.online).length

      setStats({
        totalEvents: evts.length,
        personEvents,
        anprEvents,
        onlineCameras,
        totalIdentities: ids.length
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkServices = async () => {
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          await fetch(service.url, { method: 'HEAD', mode: 'no-cors' })
          return { ...service, status: 'online' as const }
        } catch {
          try {
            const res = await fetch(service.url)
            return { ...service, status: res.ok ? 'online' as const : 'offline' as const }
          } catch {
            return { ...service, status: 'offline' as const }
          }
        }
      })
    )
    setServices(updatedServices)
  }

  return (
    <Layout>
      <div className="h-full flex flex-col p-4 md:p-6 space-y-4">
        {/* Top Header - System Title & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <ServerIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Rise Village</h1>
              <p className="text-sm text-gray-500">Security & Surveillance System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-green-700">System Online</span>
          </div>
        </div>

        {/* Main Layout - Left Column (Stats) + Right Column (Content) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Left Column - Stats */}
          <div className="lg:col-span-3 space-y-4">
            <StatCard
              title="Online Cameras"
              value={`${stats.onlineCameras}/${cameras.length}`}
              subtitle={`${cameras.length - stats.onlineCameras} offline`}
              icon={<CameraIcon className="w-7 h-7" />}
              color="cyan"
            />
            <StatCard
              title="Total Events"
              value={stats.totalEvents}
              subtitle="All detections"
              icon={<EventIcon className="w-7 h-7" />}
              color="purple"
            />
            <StatCard
              title="Person Events"
              value={stats.personEvents}
              subtitle="Face recognition"
              icon={<PersonIcon className="w-7 h-7" />}
              color="green"
            />
            <StatCard
              title="ANPR Events"
              value={stats.anprEvents}
              subtitle="Vehicle detection"
              icon={<VehicleIcon className="w-7 h-7" />}
              color="orange"
            />
            <StatCard
              title="Identities"
              value={stats.totalIdentities}
              subtitle="Known persons"
              icon={<PeopleIcon className="w-7 h-7" />}
              color="indigo"
            />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-9 space-y-4 flex flex-col min-h-0">
            {/* Events and Cameras Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
              <EventsCard events={events} isLoading={isLoading} />
              <CamerasCard cameras={cameras} isLoading={isLoading} />
            </div>

            {/* IoT Devices and System Services Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IoTDevicesCard isLoading={isLoading} />

              {/* System Services Card - With Real Status */}
              <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">System Services</h3>
                    <ServerIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            service.status === 'online'
                              ? 'bg-green-500 animate-pulse'
                              : service.status === 'offline'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}></span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate">{service.name}</div>
                            <div className="text-xs text-gray-500 truncate">{service.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            service.status === 'online'
                              ? 'bg-green-100 text-green-700'
                              : service.status === 'offline'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {service.status === 'online' ? '✓' : service.status === 'offline' ? '✗' : '...'}
                          </span>
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
