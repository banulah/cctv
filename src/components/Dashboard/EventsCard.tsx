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

  const getEventStyle = (event: Event) => {
    if (event.type === 'anpr' && event.payload?.hotlist_match) {
      return 'border-l-rose-500 bg-rose-50/50'
    }
    if (event.type === 'person' && event.payload?.canonical_id) {
      return 'border-l-slate-600 bg-slate-50/50'
    }
    return 'border-l-slate-300 bg-white'
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/80 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Events</h3>
        <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">{events.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm font-medium text-slate-500">No events yet</p>
            <p className="text-xs text-slate-400 mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <div
                key={event.id}
                className={`border-l-[3px] p-3.5 rounded-r-lg transition-all hover:shadow-sm ${getEventStyle(event)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0 border border-slate-200">
                    <span className="text-base">{getEventIcon(event.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {event.type === 'anpr' ? 'Vehicle' : 'Person'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{formatTime(event.ts)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-slate-200/60 text-slate-700 rounded-md">
                        Cam {event.camera_id}
                      </span>

                      {event.type === 'person' && event.payload?.canonical_id && (
                        <span className="px-2 py-1 text-xs bg-slate-700 text-white rounded-md font-semibold">
                          Known #{event.payload.canonical_id.substring(0, 6)}
                        </span>
                      )}

                      {event.type === 'anpr' && event.payload?.plate_text && (
                        <span className="px-2.5 py-1 text-xs bg-amber-400 text-slate-900 rounded-md font-bold border border-slate-800">
                          {event.payload.plate_text}
                        </span>
                      )}

                      {event.payload?.hotlist_match && (
                        <span className="px-2 py-1 text-xs bg-rose-600 text-white rounded-md font-semibold animate-pulse">
                          🚨 Alert
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
