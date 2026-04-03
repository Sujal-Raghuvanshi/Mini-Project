import { useState, useEffect } from 'react'
import './Dashboard.css'
import api from '../services/api'
import TierBadge from './TierBadge'

function Dashboard({ tenantId, userId, setCurrentView, onLogout, sessionStartTime }) {
    const [systemStatus, setSystemStatus] = useState('UNKNOWN')
    const [mongoStatus, setMongoStatus] = useState('UNKNOWN')
    const [redisStatus, setRedisStatus] = useState('UNKNOWN')
    const [rateLimit, setRateLimit] = useState({ current: 0, max: 0 })
    const [uptime, setUptime] = useState('0m')
    const [sessionDuration, setSessionDuration] = useState('0m')
    const [tierInfo, setTierInfo] = useState({ tier: 'free', currentProjects: 0, maxProjects: 3, currentUsers: 0, maxUsers: 5 })

    useEffect(() => {
        fetchSystemStatus()
        fetchRateLimit()
        fetchTierInfo()
        updateSessionDuration()

        const interval = setInterval(() => {
            fetchSystemStatus()
            fetchRateLimit()
            updateSessionDuration()
        }, 5000)
        return () => clearInterval(interval)
    }, [sessionStartTime])

    const fetchTierInfo = async () => {
        try {
            const [projectsRes, usersRes, rateLimitRes] = await Promise.all([
                api.projects.getAll(),
                api.users.getAll(),
                api.rateLimit.getStatus(),
            ])
            setTierInfo({
                tier: rateLimitRes?.tier || 'free',
                currentProjects: projectsRes?.count ?? 0,
                maxProjects: rateLimitRes?.tier === 'enterprise' ? -1 : rateLimitRes?.tier === 'premium' ? 20 : 3,
                currentUsers: usersRes?.count ?? 0,
                maxUsers: rateLimitRes?.tier === 'enterprise' ? -1 : rateLimitRes?.tier === 'premium' ? 25 : 5,
            })
        } catch (err) {
            console.log('Tier info fetch failed:', err.message)
        }
    }

    const fetchSystemStatus = async () => {
        try {
            const data = await api.health.getDetailedHealth()
            setSystemStatus(data.status?.toUpperCase() || 'HEALTHY')
            setMongoStatus(data.dependencies?.mongodb?.status?.toUpperCase() || 'UNKNOWN')
            setRedisStatus(data.dependencies?.redis?.status?.toUpperCase() || 'UNKNOWN')
            setUptime(calculateUptime(data.uptime))
        } catch (error) {
            console.error('Error fetching health:', error)
            setSystemStatus('UNKNOWN')
            setMongoStatus('UNKNOWN')
            setRedisStatus('UNKNOWN')
        }
    }

    const fetchRateLimit = async () => {
        try {
            const data = await api.rateLimit.getStatus()
            setRateLimit({
                current: data.current || 0,
                max: data.limit || 100
            })
        } catch (error) {
            // Rate limit endpoint requires auth, so it might fail
            console.log('Rate limit fetch failed (expected without auth)')
        }
    }

    const updateSessionDuration = () => {
        if (!sessionStartTime) return
        const diffSeconds = Math.floor((Date.now() - sessionStartTime) / 1000)
        setSessionDuration(calculateUptime(diffSeconds))
    }

    const calculateUptime = (seconds) => {
        if (seconds === undefined || seconds === null) return '0m'
        if (seconds < 60) return '< 1m'
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days}d ${hours % 24}h`
        if (hours > 0) return `${hours}h ${minutes % 60}m`
        return `${minutes}m`
    }

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Welcome back, {userId}!</h1>
                    <p className="dashboard-subtitle">Manage your multi-tenant environment</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <TierBadge
                        tier={tierInfo.tier}
                        currentProjects={tierInfo.currentProjects}
                        maxProjects={tierInfo.maxProjects}
                        currentUsers={tierInfo.currentUsers}
                        maxUsers={tierInfo.maxUsers}
                    />
                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </div>

            <div className="dashboard-section">
                <div className="section-header">
                    <span className="section-icon">📊</span>
                    <h2 className="section-title">Dashboard Overview</h2>
                </div>
                <p className="section-subtitle">Real-time system status and metrics</p>

                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                            <span style={{ fontSize: '1.5rem' }}>✓</span>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">SYSTEM STATUS</div>
                            <div className={`metric-value status-${systemStatus.toLowerCase()}`}>
                                {systemStatus}
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'rgba(79, 70, 229, 0.2)' }}>
                            <span style={{ fontSize: '1.5rem' }}>⚡</span>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">RATE LIMIT</div>
                            <div className="metric-value">{rateLimit.current}/{rateLimit.max}</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                            <span style={{ fontSize: '1.5rem' }}>🏢</span>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">TENANT ID</div>
                            <div className="metric-value tenant-id">{tenantId}</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'rgba(124, 58, 237, 0.2)' }}>
                            <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">SESSION TIME</div>
                            <div className="metric-value">{sessionDuration}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="status-grid">
                <div className="status-section">
                    <div className="status-header">
                        <span className="status-icon">🖥️</span>
                        <h3 className="status-title">System Runtime</h3>
                    </div>
                    <div className="status-item">
                        <span className="status-name">Server Uptime</span>
                        <span className="status-badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                            {uptime}
                        </span>
                    </div>
                </div>

                <div className="status-section">
                    <div className="status-header">
                        <span className="status-icon">💾</span>
                        <h3 className="status-title">Database Status</h3>
                    </div>
                    <div className="status-item">
                        <span className="status-name">MongoDB</span>
                        <span className={`status-badge status-${mongoStatus.toLowerCase()}`}>
                            {mongoStatus}
                        </span>
                    </div>
                </div>

                <div className="status-section">
                    <div className="status-header">
                        <span className="status-icon">⚡</span>
                        <h3 className="status-title">Cache Status</h3>
                    </div>
                    <div className="status-item">
                        <span className="status-name">Redis</span>
                        <span className={`status-badge status-${redisStatus.toLowerCase()}`}>
                            {redisStatus}
                        </span>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <div className="section-header">
                    <span className="section-icon">🚀</span>
                    <h3 className="section-title">Quick Actions</h3>
                </div>
                <div className="actions-grid">
                    <button className="action-btn" onClick={() => setCurrentView('projects')}>
                        <span className="action-icon">🛡️</span>
                        <span>Active Workspaces</span>
                    </button>
                    <button className="action-btn" onClick={() => setCurrentView('audit')}>
                        <span className="action-icon">📋</span>
                        <span>Audit Logs</span>
                    </button>
                    <button className="action-btn" onClick={() => setCurrentView('monitoring')}>
                        <span className="action-icon">📈</span>
                        <span>System Health</span>
                    </button>
                    <button className="action-btn" onClick={() => setCurrentView('settings')}>
                        <span className="action-icon">⚙️</span>
                        <span>Settings</span>
                    </button>
                </div>
            </div>
        </div >
    )
}

export default Dashboard
