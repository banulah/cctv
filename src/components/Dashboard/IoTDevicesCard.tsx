interface IoTDevicesCardProps {
  isLoading?: boolean
}

export const IoTDevicesCard = ({ isLoading }: IoTDevicesCardProps) => {
  const devices = [
    { id: 1, name: 'Temperature', type: 'sensor', status: 'online', value: '24°C', lastSeen: '2m' },
    { id: 2, name: 'Motion', type: 'sensor', status: 'online', value: 'Clear', lastSeen: '1m' },
    { id: 3, name: 'Door Lock', type: 'actuator', status: 'online', value: 'Locked', lastSeen: 'now' },
    { id: 4, name: 'Lights', type: 'actuator', status: 'online', value: 'On', lastSeen: '5m' },
    { id: 5, name: 'Humidity', type: 'sensor', status: 'offline', value: '-', lastSeen: '2h' },
    { id: 6, name: 'Access', type: 'controller', status: 'online', value: 'Active', lastSeen: '30s' },
  ]

  const typeIcons: Record<string, string> = {
    sensor: '📡',
    actuator: '🔧',
    controller: '🎛️'
  }

  const onlineDevices = devices.filter(d => d.status === 'online').length

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm px-6 py-5 border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">IoT Devices</h3>
        <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">
          {onlineDevices}/{devices.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-3 rounded-lg border border-slate-200/50 hover:border-slate-300 hover:shadow-sm transition-all bg-white/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base flex-shrink-0">{typeIcons[device.type]}</span>
                  <span className="text-xs font-bold text-slate-900 truncate">{device.name}</span>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}></span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Value:</span>
                  <span className="text-xs font-semibold text-slate-900">{device.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Seen:</span>
                  <span className="text-xs font-medium text-slate-600">{device.lastSeen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
