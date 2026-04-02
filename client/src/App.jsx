import { useState, useEffect } from 'react'
import './App.css'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Projects from './components/Projects'
import AuditLogs from './components/AuditLogs'
import Monitoring from './components/Monitoring'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import AdminDashboard from './components/AdminDashboard'
import api from './services/api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [tenantId, setTenantId] = useState('tenant-a')
  const [userId, setUserId] = useState('admin')
  const [userRole, setUserRole] = useState('admin')
  const [sessionStartTime, setSessionStartTime] = useState(null)

  useEffect(() => {
    // Check if user has existing token and session data
    const token = api.getAuthToken()
    if (token) {
      const savedTenantId = localStorage.getItem('tenantId')
      const savedUserId = localStorage.getItem('userId')
      const savedRole = localStorage.getItem('userRole')
      const savedStartTime = localStorage.getItem('sessionStartTime')

      if (savedTenantId) setTenantId(savedTenantId)
      if (savedUserId) setUserId(savedUserId)
      if (savedRole) setUserRole(savedRole)
      if (savedStartTime) setSessionStartTime(parseInt(savedStartTime))
      else setSessionStartTime(Date.now())

      setIsAuthenticated(true)
    }
  }, [])

  const handleAuthenticated = ({ tenantId, userId, role, token }) => {
    setTenantId(tenantId || 'tenant-a')
    setUserId(userId || 'admin')
    setUserRole(role || 'admin')
    const startTime = Date.now()
    setSessionStartTime(startTime)

    // Persist session details
    localStorage.setItem('tenantId', tenantId || 'tenant-a')
    localStorage.setItem('userId', userId || 'admin')
    localStorage.setItem('userRole', role || 'admin')
    localStorage.setItem('sessionStartTime', startTime.toString())

    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    api.setAuthToken(null)
    localStorage.removeItem('tenantId')
    localStorage.removeItem('userId')
    localStorage.removeItem('userRole')
    localStorage.removeItem('sessionStartTime')
    setIsAuthenticated(false)
    setSessionStartTime(null)
    setCurrentView('dashboard')
  }

  const handleTenantSwitch = async (newTenantId) => {
    try {
      // Get new token for the switched tenant
      const response = await api.auth.generateToken(newTenantId, userId)
      api.setAuthToken(response.token)
      setTenantId(newTenantId)
      // Force refresh of current view logic if needed, but state change usually triggers re-render
    } catch (error) {
      console.error('Failed to switch tenant:', error)
      alert('Failed to switch tenant. Please try logging in again.')
    }
  }

  if (!isAuthenticated) {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        tenantId={tenantId}
        userId={userId}
        userRole={userRole}
        onLogout={handleLogout}
        onTenantSwitch={handleTenantSwitch}
      />
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard
            tenantId={tenantId}
            userId={userId}
            setCurrentView={setCurrentView}
            onLogout={handleLogout}
            sessionStartTime={sessionStartTime}
          />
        )}
        {currentView === 'projects' && <Projects tenantId={tenantId} />}
        {currentView === 'audit' && <AuditLogs tenantId={tenantId} />}
        {currentView === 'monitoring' && <Monitoring tenantId={tenantId} />}
        {currentView === 'settings' && <Settings tenantId={tenantId} onLogout={handleLogout} />}
        {currentView === 'admin' && <AdminDashboard tenantId={tenantId} />}
      </main>
    </div>
  )
}

export default App
