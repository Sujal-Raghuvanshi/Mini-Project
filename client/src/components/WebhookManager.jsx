import { useState, useEffect } from 'react'
import * as adminService from '../services/adminService'

const EVENT_TYPES = [
    'project.created', 'project.updated', 'project.deleted',
    'user.created', 'task.created', 'task.completed',
    'tier.upgraded', 'tier.downgraded'
]

function WebhookManager() {
    const [webhooks, setWebhooks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [newWebhook, setNewWebhook] = useState({ url: '', events: [], secret: '' })

    const fetchWebhooks = async () => {
        try {
            const response = await adminService.getWebhooks()
            setWebhooks(response.data || [])
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchWebhooks() }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            await adminService.createWebhook(newWebhook)
            setNewWebhook({ url: '', events: [], secret: '' })
            fetchWebhooks()
        } catch (err) { alert(err.message) }
    }

    const handleToggle = async (id) => {
        try {
            await adminService.toggleWebhook(id)
            fetchWebhooks()
        } catch (err) { alert(err.message) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return
        try {
            await adminService.deleteWebhook(id)
            fetchWebhooks()
        } catch (err) { alert(err.message) }
    }

    const toggleEvent = (event) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event]
        }))
    }

    return (
        <div className="webhook-manager fade-in" style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🔗</span> Webhook Integrations
            </h2>

            {/* Registration Form */}
            <form onSubmit={handleCreate} style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h4 style={{ marginBottom: '1rem', color: '#94a3b8' }}>Register New Endpoint</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        type="url"
                        placeholder="https://your-app.com/webhooks"
                        value={newWebhook.url}
                        onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                        required
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: 'white' }}
                    />
                    <input
                        type="text"
                        placeholder="HMAC Signing Secret (min 16 chars)"
                        value={newWebhook.secret}
                        onChange={e => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                        required
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: 'white' }}
                    />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#94a3b8' }}>Select Events:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                        {EVENT_TYPES.map(ev => (
                            <label key={ev} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={newWebhook.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                                {ev}
                            </label>
                        ))}
                    </div>
                </div>
                <button type="submit" style={{ padding: '0.75rem 2rem', borderRadius: '8px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    Create Webhook
                </button>
            </form>

            {/* List Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                        <th style={{ padding: '1rem' }}>URL</th>
                        <th style={{ padding: '1rem' }}>Events</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                        <th style={{ padding: '1rem' }}>Failures</th>
                        <th style={{ padding: '1rem' }}>Last Sent</th>
                        <th style={{ padding: '1rem' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {webhooks.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No webhooks configured yet.</td></tr>
                    ) : (
                        webhooks.map(h => (
                            <tr key={h._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td style={{ padding: '1rem', color: '#e2e8f0' }}>{h.url}</td>
                                <td style={{ padding: '1rem', color: '#94a3b8' }}>{h.events.length} events</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: h.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: h.isActive ? '#10b981' : '#f87171' }}>
                                        {h.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', color: h.failureCount >= 3 ? '#f87171' : 'white', fontWeight: h.failureCount >= 3 ? 700 : 400 }}>
                                    {h.failureCount}
                                </td>
                                <td style={{ padding: '1rem', color: '#64748b' }}>
                                    {h.lastTriggeredAt ? new Date(h.lastTriggeredAt).toLocaleString() : 'Never'}
                                </td>
                                <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleToggle(h._id)} style={{ padding: '4px 10px', borderRadius: '4px', background: h.isActive ? '#ef4444' : '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        {h.isActive ? 'Pause' : 'Resume'}
                                    </button>
                                    <button onClick={() => handleDelete(h._id)} style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}

export default WebhookManager
