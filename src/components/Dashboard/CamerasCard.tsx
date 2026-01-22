import { Camera } from '../../services/api'

interface CamerasCardProps {
  cameras: Camera[]
  isLoading?: boolean
}

export const CamerasCard = ({ cameras, isLoading }: CamerasCardProps) => {
  const onlineCameras = cameras.filter(c => c.online).length

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/80 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Camera Status</h3>
        <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">
          {onlineCameras}/{cameras.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600"></div>
          </div>
        ) : cameras.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span className="text-2xl">📷</span>
            </div>
            <p className="text-sm font-medium text-slate-500">No cameras configured</p>
            <p className="text-xs text-slate-400 mt-1">Add cameras to start monitoring</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="flex items-center gap-3 p-3.5 rounded-lg hover:bg-slate-50/50 transition-all border border-slate-200/50"
              >
                <div className={`p-2.5 rounded-lg ${
                  camera.online
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50'
                    : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50'
                }`}>
                  <span className="text-base">{camera.online ? '📹' : '📷'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{camera.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        camera.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}></span>
                      <span className={`text-xs font-semibold ${
                        camera.online ? 'text-emerald-700' : 'text-slate-500'
                      }`}>
                        {camera.online ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
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
