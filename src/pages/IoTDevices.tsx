import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

interface IoTDevice {
  id: number
  name: string
  type: 'sensor' | 'actuator' | 'controller'
  status: 'online' | 'offline' | 'warning'
  value: string
  unit?: string
  lastSeen: string
  location: string
  manufacturer?: string
  model?: string
  firmware?: string
  ipAddress?: string
}

export default function IoTDevices() {
  const [devices, setDevices] = useState<IoTDevice[]>([
    {
      id: 1,
      name: 'Temperature Sensor',
      type: 'sensor',
      status: 'online',
      value: '24.5',
      unit: '°C',
      lastSeen: '2 minutes ago',
      location: 'Server Room',
      manufacturer: 'Xiaomi',
      model: 'TH-100',
      firmware: 'v2.3.1',
      ipAddress: '192.168.1.101'
    },
    {
      id: 2,
      name: 'Motion Detector',
      type: 'sensor',
      status: 'online',
      value: 'Clear',
      lastSeen: '1 minute ago',
      location: 'Main Entrance',
      manufacturer: 'Sonoff',
      model: 'MD-200',
      firmware: 'v1.8.5',
      ipAddress: '192.168.1.102'
    },
    {
      id: 3,
      name: 'Smart Door Lock',
      type: 'actuator',
      status: 'online',
      value: 'Locked',
      lastSeen: 'Just now',
      location: 'Front Door',
      manufacturer: 'Yale',
      model: 'SL-400',
      firmware: 'v3.1.0',
      ipAddress: '192.168.1.103'
    },
    {
      id: 4,
      name: 'LED Lights',
      type: 'actuator',
      status: 'online',
      value: 'On',
      unit: '80%',
      lastSeen: '5 minutes ago',
      location: 'Office Area',
      manufacturer: 'Philips Hue',
      model: 'LED-300',
      firmware: 'v2.5.2',
      ipAddress: '192.168.1.104'
    },
    {
      id: 5,
      name: 'Humidity Sensor',
      type: 'sensor',
      status: 'warning',
      value: '68',
      unit: '%',
      lastSeen: '15 minutes ago',
      location: 'Storage Room',
      manufacturer: 'DHT',
      model: 'HUM-150',
      firmware: 'v1.2.3',
      ipAddress: '192.168.1.105'
    },
    {
      id: 6,
      name: 'Access Controller',
      type: 'controller',
      status: 'online',
      value: 'Active',
      lastSeen: '30 seconds ago',
      location: 'Security Gate',
      manufacturer: 'Hikvision',
      model: 'AC-500',
      firmware: 'v4.0.1',
      ipAddress: '192.168.1.106'
    },
    {
      id: 7,
      name: 'Air Quality Sensor',
      type: 'sensor',
      status: 'online',
      value: '45',
      unit: 'AQI',
      lastSeen: '3 minutes ago',
      location: 'Office Area',
      manufacturer: 'Awair',
      model: 'AQ-250',
      firmware: 'v2.1.0',
      ipAddress: '192.168.1.107'
    },
    {
      id: 8,
      name: 'Smart Thermostat',
      type: 'actuator',
      status: 'online',
      value: '22',
      unit: '°C',
      lastSeen: '1 minute ago',
      location: 'Server Room',
      manufacturer: 'Nest',
      model: 'TH-400',
      firmware: 'v5.2.1',
      ipAddress: '192.168.1.108'
    },
    {
      id: 9,
      name: 'Smoke Detector',
      type: 'sensor',
      status: 'online',
      value: 'Normal',
      lastSeen: '10 minutes ago',
      location: 'Kitchen',
      manufacturer: 'Nest',
      model: 'SM-100',
      firmware: 'v3.0.5',
      ipAddress: '192.168.1.109'
    },
    {
      id: 10,
      name: 'Power Monitor',
      type: 'sensor',
      status: 'offline',
      value: '-',
      unit: 'W',
      lastSeen: '2 hours ago',
      location: 'Electrical Room',
      manufacturer: 'TP-Link',
      model: 'PM-200',
      firmware: 'v1.5.0',
      ipAddress: '192.168.1.110'
    },
    {
      id: 11,
      name: 'Smart Relay',
      type: 'actuator',
      status: 'online',
      value: 'Off',
      lastSeen: '8 minutes ago',
      location: 'Parking Lot',
      manufacturer: 'Sonoff',
      model: 'RL-300',
      firmware: 'v2.0.0',
      ipAddress: '192.168.1.111'
    },
    {
      id: 12,
      name: 'Water Leak Detector',
      type: 'sensor',
      status: 'online',
      value: 'Dry',
      lastSeen: '6 minutes ago',
      location: 'Basement',
      manufacturer: 'Xiaomi',
      model: 'WL-50',
      firmware: 'v1.3.2',
      ipAddress: '192.168.1.112'
    },
  ])

  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddDevice, setShowAddDevice] = useState(false)

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => ({
        ...device,
        // Randomly update some values for sensors
        value: device.type === 'sensor' && Math.random() > 0.7
          ? (parseFloat(device.value) + (Math.random() - 0.5) * 2).toFixed(1)
          : device.value
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sensor': return '📡'
      case 'actuator': return '🔧'
      case 'controller': return '🎛️'
      default: return '📱'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800'
      case 'offline': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredDevices = devices.filter(device => {
    if (filterType !== 'all' && device.type !== filterType) return false
    if (filterStatus !== 'all' && device.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length,
    sensors: devices.filter(d => d.type === 'sensor').length,
    actuators: devices.filter(d => d.type === 'actuator').length,
    controllers: devices.filter(d => d.type === 'controller').length,
  }

  const handleDeviceControl = (deviceId: number, action: string) => {
    setDevices(prev => prev.map(device => {
      if (device.id === deviceId) {
        if (action === 'toggle') {
          return { ...device, value: device.value === 'On' ? 'Off' : 'On' }
        }
        if (action === 'lock') {
          return { ...device, value: 'Locked' }
        }
        if (action === 'unlock') {
          return { ...device, value: 'Unlocked' }
        }
      }
      return device
    }))
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pt-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">IoT Devices</h1>
          <p className="mt-2 text-sm text-gray-600">Monitor and control connected IoT devices</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Devices</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.online}</div>
            <div className="text-xs text-gray-600 mt-1">Online</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
            <div className="text-xs text-gray-600 mt-1">Offline</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
            <div className="text-xs text-gray-600 mt-1">Warning</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-purple-600">{stats.sensors}</div>
            <div className="text-xs text-gray-600 mt-1">Sensors</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="text-2xl font-bold text-indigo-600">{stats.actuators}</div>
            <div className="text-xs text-gray-600 mt-1">Actuators</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
            <div className="text-2xl font-bold text-cyan-600">{stats.controllers}</div>
            <div className="text-xs text-gray-600 mt-1">Controllers</div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="sensor">Sensors ({stats.sensors})</option>
                  <option value="actuator">Actuators ({stats.actuators})</option>
                  <option value="controller">Controllers ({stats.controllers})</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online ({stats.online})</option>
                  <option value="offline">Offline ({stats.offline})</option>
                  <option value="warning">Warning ({stats.warning})</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterType('all')
                  setFilterStatus('all')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowAddDevice(true)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                + Add Device
              </button>
            </div>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDevices.map(device => (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(device.type)}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{device.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{device.type}</p>
                    </div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(device.status)} ${device.status === 'online' ? 'animate-pulse' : ''}`}></span>
                </div>

                {/* Value */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-500 mb-1">Current Value</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {device.value}
                    {device.unit && <span className="text-sm text-gray-600 ml-1">{device.unit}</span>}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900 font-medium">{device.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Last Seen:</span>
                    <span className="text-gray-900">{device.lastSeen}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(device.status)} capitalize`}>
                      {device.status}
                    </span>
                  </div>
                </div>

                {/* Quick Actions for Actuators */}
                {device.type === 'actuator' && device.status === 'online' && (
                  <div className="pt-3 border-t border-gray-200">
                    {device.name.includes('Lock') ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeviceControl(device.id, 'lock')
                          }}
                          className="flex-1 text-xs py-1.5 px-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
                        >
                          🔒 Lock
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeviceControl(device.id, 'unlock')
                          }}
                          className="flex-1 text-xs py-1.5 px-2 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                        >
                          🔓 Unlock
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeviceControl(device.id, 'toggle')
                        }}
                        className="w-full text-xs py-1.5 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                      >
                        Toggle {device.value === 'On' ? 'Off' : 'On'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">📱</div>
            <p className="text-sm text-gray-500">No devices found matching the filters</p>
          </div>
        )}

        {/* Device Details Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{getTypeIcon(selectedDevice.type)}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedDevice.name}</h2>
                      <p className="text-sm text-gray-600 capitalize">{selectedDevice.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Current Value</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {selectedDevice.value}
                      {selectedDevice.unit && <span className="text-lg ml-1">{selectedDevice.unit}</span>}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedDevice.status)} capitalize`}>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedDevice.status)} mr-2`}></span>
                      {selectedDevice.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Location</span>
                    <span className="text-sm font-medium text-gray-900">{selectedDevice.location}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Last Seen</span>
                    <span className="text-sm font-medium text-gray-900">{selectedDevice.lastSeen}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">IP Address</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">{selectedDevice.ipAddress}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Manufacturer</span>
                    <span className="text-sm font-medium text-gray-900">{selectedDevice.manufacturer}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Model</span>
                    <span className="text-sm font-medium text-gray-900">{selectedDevice.model}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Firmware</span>
                    <span className="text-sm font-medium text-gray-900">{selectedDevice.firmware}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedDevice.type === 'actuator' && selectedDevice.status === 'online' && (
                    <button
                      onClick={() => {
                        handleDeviceControl(selectedDevice.id, 'toggle')
                        setSelectedDevice(null)
                      }}
                      className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Control Device
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Device Modal Placeholder */}
        {showAddDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Device</h2>
              <p className="text-sm text-gray-600 mb-4">Device registration form coming soon...</p>
              <button
                onClick={() => setShowAddDevice(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
