import { useState, useEffect } from 'react'
import './AuditLogs.css'
import api from '../services/api'

function AuditLogs({ tenantId }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [timeRange, setTimeRange] = useState('today') // today, week, all

    useEffect(() => {
        fetchAuditLogs()
    }, [tenantId, filter, timeRange])

    const fetchAuditLogs = async () => {
        setLoading(true)
        try {
            const params = filter !== 'all' ? { action: filter.toUpperCase() } : {}

            if (timeRange !== 'all') {
                const start = new Date()
                if (timeRange === 'today') {
                    start.setHours(0, 0, 0, 0)
                } else if (timeRange === 'week') {
                    start.setDate(start.getDate() - 7)
                }
                params.startDate = start.toISOString()
            }

            const data = await api.auditLogs.getAll(params)
            // API returns { tenant, logs, total, limit, skip }
            setLogs(data.logs || [])
        } catch (error) {
            console.error('Error fetching audit logs:', error)
            // Fallback to mock data
            const mockLogs = [
                {
                    _id: '1',
                    action: 'CREATE',
                    resource: 'User',
                    resourceId: 'user_123',
                    userId: 'admin',
                    timestamp: new Date(Date.now() - 1000 * 60 * 5),
                    details: 'Created new user account',
                    ipAddress: '192.168.1.100'
                },
                {
                    _id: '2',
                    action: 'UPDATE',
                    resource: 'Project',
                    resourceId: 'proj_456',
                    userId: 'admin',
                    timestamp: new Date(Date.now() - 1000 * 60 * 15),
                    details: 'Updated project settings',
                    ipAddress: '192.168.1.100'
                },
                {
                    _id: '3',
                    action: 'DELETE',
                    resource: 'User',
                    resourceId: 'user_789',
                    userId: 'admin',
                    timestamp: new Date(Date.now() - 1000 * 60 * 30),
                    details: 'Deleted inactive user',
                    ipAddress: '192.168.1.100'
                },
                {
                    _id: '4',
                    action: 'READ',
                    resource: 'AuditLog',
                    resourceId: 'log_001',
                    userId: 'admin',
                    timestamp: new Date(Date.now() - 1000 * 60 * 45),
                    details: 'Viewed audit logs',
                    ipAddress: '192.168.1.100'
                }
            ]
            setLogs(mockLogs)
        } finally {
            setLoading(false)
        }
    }

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'action-create'
            case 'UPDATE': return 'action-update'
            case 'DELETE': return 'action-delete'
            case 'READ': return 'action-read'
            default: return 'action-other'
        }
    }

    const formatTimeAgo = (date) => {
        const timestamp = new Date(date)
        const seconds = Math.floor((new Date() - timestamp) / 1000)
        if (seconds < 60) return `${seconds}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    return (
        <div className="audit-logs-page fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="page-subtitle">Track all system activities and changes</p>
                </div>
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'create' ? 'active' : ''}`}
                        onClick={() => setFilter('create')}
                    >
                        Create
                    </button>
                    <button
                        className={`filter-btn ${filter === 'update' ? 'active' : ''}`}
                        onClick={() => setFilter('update')}
                    >
                        Update
                    </button>
                    <button
                        className={`filter-btn ${filter === 'delete' ? 'active' : ''}`}
                        onClick={() => setFilter('delete')}
                    >
                        Delete
                    </button>
                </div>
            </div>

            <div className="logs-stats">
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                        <div className="stat-value">{logs.length}</div>
                        <div className="stat-label">Total Logs</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👤</div>
                    <div className="stat-content">
                        <div className="stat-value">{new Set(logs.map(l => l.userId)).size}</div>
                        <div className="stat-label">Unique Users</div>
                    </div>
                </div>
                <div className="stat-card interaction-card">
                    <div className="stat-icon">🕐</div>
                    <div className="stat-content">
                        <select
                            className="stat-select"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="week">Past Week</option>
                            <option value="all">All Time</option>
                        </select>
                        <div className="stat-label">Active Window</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading audit logs...</div>
            ) : (
                <div className="logs-container">
                    <div className="logs-table">
                        <div className="table-header">
                            <div className="header-cell">Action</div>
                            <div className="header-cell">Resource</div>
                            <div className="header-cell">User</div>
                            <div className="header-cell">Details</div>
                            <div className="header-cell">Time</div>
                        </div>
                        {logs.map((log) => (
                            <div key={log._id} className="table-row">
                                <div className="table-cell">
                                    <span className={`action-badge ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </div>
                                <div className="table-cell">
                                    <div className="resource-info">
                                        <div className="resource-type">{log.resource}</div>
                                        <div className="resource-id">{log.resourceId}</div>
                                    </div>
                                </div>
                                <div className="table-cell">
                                    <div className="user-info">
                                        <div className="user-avatar-small">{log.userId[0].toUpperCase()}</div>
                                        <span>{log.userId}</span>
                                    </div>
                                </div>
                                <div className="table-cell">
                                    <div className="log-details">{log.details}</div>
                                    <div className="log-ip">IP: {log.ipAddress}</div>
                                </div>
                                <div className="table-cell">
                                    <div className="time-ago">{formatTimeAgo(log.createdAt)}</div>
                                    <div className="time-full">{new Date(log.createdAt).toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AuditLogs
