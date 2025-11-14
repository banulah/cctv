import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveWall from './pages/LiveWall'
import CameraDetail from './pages/CameraDetail'
import Events from './pages/Events'
import Identities from './pages/Identities'
import IoTDevices from './pages/IoTDevices'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live"
            element={
              <ProtectedRoute>
                <LiveWall />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/camera/:id"
            element={
              <ProtectedRoute>
                <CameraDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/identities"
            element={
              <ProtectedRoute>
                <Identities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/iot"
            element={
              <ProtectedRoute>
                <IoTDevices />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

