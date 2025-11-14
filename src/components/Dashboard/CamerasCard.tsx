import { Camera } from '../../services/api'

interface CamerasCardProps {
  cameras: Camera[]
  isLoading?: boolean
}

export const CamerasCard = ({ cameras, isLoading }: CamerasCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Camera Status</h3>
        <span className="text-xs text-gray-500">{cameras.length} cameras</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cameras.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-3xl mb-2">📷</span>
            <p className="text-sm text-gray-500">No cameras configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className={`p-2 rounded-lg ${camera.online ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className="text-lg">{camera.online ? '📹' : '📷'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-900">{camera.name}</p>
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        camera.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}></span>
                      <span className={`text-xs font-medium ${
                        camera.online ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {camera.online ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {camera.mediamtx_path}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
