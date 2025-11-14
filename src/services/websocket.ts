type EventCallback = (event: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private callbacks: EventCallback[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    // Use public WebSocket URL for production
    const isProd = import.meta.env.PROD
    const wsUrl = isProd
      ? 'wss://122.255.33.126:36589/ws/alerts'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alerts`

    console.log('[WebSocket] Attempting to connect to:', wsUrl)
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected successfully!')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Removed console.log to prevent spam - events come in multiple times per second
        this.callbacks.forEach(cb => cb(data))
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e, event.data)
      }
    }

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error occurred:', error)
    }

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected. Code:', event.code, 'Reason:', event.reason)
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
      } else {
        console.error('[WebSocket] Max reconnect attempts reached. Giving up.')
      }
    }
  }

  onEvent(callback: EventCallback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.callbacks = []
  }
}

export const wsService = new WebSocketService()

