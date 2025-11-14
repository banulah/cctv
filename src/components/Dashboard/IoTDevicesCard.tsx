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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">IoT Devices</h3>
        <span className="text-xs text-gray-500">{devices.filter(d => d.status === 'online').length}/{devices.length} online</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base">{typeIcons[device.type]}</span>
                  <span className="text-xs font-medium text-gray-900 truncate">{device.name}</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Value:</span>
                  <span className="text-xs font-medium text-gray-900">{device.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Seen:</span>
                  <span className="text-xs text-gray-600">{device.lastSeen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
