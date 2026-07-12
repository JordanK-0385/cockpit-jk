import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Accueil } from './pages/Accueil'
import { Projets } from './pages/Projets'
import { Apprendre } from './pages/Apprendre'
import { MonitoringN8n } from './pages/MonitoringN8n'
import { AssistantProvider } from './components/assistant/AssistantProvider'
import { AmbientLayer } from './components/ambient/AmbientLayer'
import { Loader } from './components/ui/Loader'

// NB: l'ancienne page Cockpit (3 colonnes) reste dans le repo (src/pages/Cockpit.tsx)
// mais est débranchée des routes le temps de valider la nouvelle home.

export default function App() {
  const { authorized, loading } = useAuth()

  return (
    <>
      <AmbientLayer />
      <div className="relative z-10 min-h-screen">
        {loading ? (
          <Loader label="Chargement…" />
        ) : (
          <AssistantProvider>
            <Routes>
              <Route
                path="/login"
                element={authorized ? <Navigate to="/" replace /> : <Login />}
              />
              <Route
                path="/"
                element={authorized ? <Accueil /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/projets"
                element={authorized ? <Projets /> : <Navigate to="/login" replace />}
              />
              {/* Ancienne route Radar → Projets (renommage) */}
              <Route path="/radar" element={<Navigate to="/projets" replace />} />
              <Route
                path="/apprendre"
                element={authorized ? <Apprendre /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/monitoring"
                element={authorized ? <MonitoringN8n /> : <Navigate to="/login" replace />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AssistantProvider>
        )}
      </div>
    </>
  )
}
