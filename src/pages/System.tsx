import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

export default function System() {
  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Services</h1>
          <p className="mt-2 text-sm text-gray-600">Monitor and access system services</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Service Status</h2>
            <div className="space-y-3">
              <ServiceStatusItem name="Backend API" url="http://localhost:8000/docs" description="FastAPI Documentation" />
              <ServiceStatusItem name="Frontend" url="http://localhost:80" description="Web Interface" />
              <ServiceStatusItem name="MediaMTX" url="http://localhost:8888" description="RTSP/HLS Streaming Server" />
              <ServiceStatusItem name="Prometheus" url="http://localhost:9090" description="Metrics Collection" />
              <ServiceStatusItem name="Grafana" url="http://localhost:3000" description="Metrics Visualization" />
              <ServiceStatusItem name="MinIO" url="http://localhost:9001" description="Object Storage Console" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function ServiceStatusItem({ name, url }: { name: string; url: string; description?: string }) {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      await fetch(url, { method: 'HEAD', mode: 'no-cors' })
      setStatus('online')
    } catch {
      try {
        const res = await fetch(url)
        setStatus(res.ok ? 'online' : 'offline')
      } catch {
        setStatus('offline')
      }
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div className="font-medium text-gray-900">{name}</div>
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'online'
            ? 'bg-green-100 text-green-800'
            : status === 'offline'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Checking...'}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Open
        </a>
      </div>
    </div>
  )
}

