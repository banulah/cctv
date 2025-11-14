import { Event } from '../../services/api'

interface EventsCardProps {
  events: Event[]
  isLoading?: boolean
}

export const EventsCard = ({ events, isLoading }: EventsCardProps) => {
  const formatTime = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getEventIcon = (type: string) => {
    return type === 'person' ? '👤' : '🚗'
  }

  const getEventColor = (event: Event) => {
    if (event.type === 'anpr' && event.payload?.hotlist_match) {
      return 'border-l-red-500 bg-red-50'
    }
    if (event.type === 'person' && event.payload?.canonical_id) {
      return 'border-l-blue-500 bg-blue-50'
    }
    return 'border-l-gray-300'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Recent Events</h3>
        <span className="text-xs text-gray-500">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-3xl mb-2">📋</span>
            <p className="text-sm text-gray-500">No events yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <div
                key={event.id}
                className={`border-l-4 p-3 rounded-r-lg transition-all hover:shadow-sm ${getEventColor(event)}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900">
                        {event.type === 'anpr' ? 'Vehicle' : 'Person'}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(event.ts)}</span>
                    </div>

                    <div className="mt-1 flex items-center space-x-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                        Cam {event.camera_id}
                      </span>

                      {event.type === 'person' && event.payload?.canonical_id && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                          Known #{event.payload.canonical_id.substring(0, 6)}
                        </span>
                      )}

                      {event.type === 'anpr' && event.payload?.plate_text && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-400 text-gray-900 rounded font-bold border border-gray-800">
                          {event.payload.plate_text}
                        </span>
                      )}

                      {event.payload?.hotlist_match && (
                        <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded font-medium animate-pulse">
                          🚨 Hotlist
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
