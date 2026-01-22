import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_BASE } from '../services/api'

interface User {
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('user')

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            setUser(JSON.parse(savedUser))
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
          }
        } catch (error) {
          console.error('Auth verification failed:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      console.log('[Auth] Attempting login to:', `${API_BASE}/auth/login`)
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }

      const data = await response.json()

      // Store token and user info
      localStorage.setItem('auth_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      setUser(data.user)
    } catch (error: any) {
      console.error('Login error:', error)

      // Provide specific error messages for common connection issues
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        // Check if it's a mixed content error (HTTPS frontend trying to access HTTP backend)
        if (window.location.protocol === 'https:' && API_BASE.startsWith('http://')) {
          throw new Error('Mixed content error: Frontend is HTTPS but backend is HTTP. Backend must use HTTPS when frontend is deployed on HTTPS. Use Cloudflare Tunnel, ngrok, or configure proper SSL certificate.')
        }
        // Generic connection error
        throw new Error(`Cannot connect to backend at ${API_BASE}. Please ensure: (1) Backend is running, (2) Backend URL is correct, (3) CORS is configured properly.`)
      }

      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
