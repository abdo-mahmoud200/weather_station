import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import ErrorBoundary from './components/common/ErrorBoundary'
import { AuthProvider } from './components/auth/AuthProvider'
import { PublicOnlyRoute, RequireAuth } from './components/auth/RequireAuth'
import Dashboard from './pages/Dashboard'
import StationDetail from './pages/StationDetail'
import ControlPanel from './pages/ControlPanel'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import Preferences from './pages/Preferences'
import Login from './pages/Login'
import Profile from './pages/Profile'
import StationManagement from './pages/StationManagement'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stations/:id" element={<StationDetail />} />
              <Route path="/stations/:id/control" element={<ControlPanel />} />
              <Route path="/stations/manage" element={<StationManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/preferences" element={<Preferences />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  )
}
