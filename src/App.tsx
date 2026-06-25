import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Cockpit } from './pages/Cockpit'
import { RadarProjets } from './pages/RadarProjets'
import { AmbientLayer } from './components/ambient/AmbientLayer'
import { Loader } from './components/ui/Loader'

export default function App() {
  const { authorized, loading } = useAuth()

  return (
    <>
      <AmbientLayer />
      <div className="relative z-10 min-h-screen">
        {loading ? (
          <Loader label="Chargement…" />
        ) : (
          <Routes>
            <Route
              path="/login"
              element={authorized ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
              path="/"
              element={authorized ? <Cockpit /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/radar"
              element={authorized ? <RadarProjets /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </>
  )
}
