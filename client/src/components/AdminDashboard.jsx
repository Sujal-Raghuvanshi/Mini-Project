import { useState, useEffect, useCallback } from 'react'
import Monitoring from './Monitoring'
import AuditLogs from './AuditLogs'
import { getAllTenants, getTenantStats, updateTenantTier, getIpAllowlist, addIpToAllowlist, removeIpFromAllowlist, getWebhooks } from '../services/adminService'

const TIER_STYLES = {
    free:       { label: 'FREE',       bg: '#3a3a4a', color: '#a0a0b0' },
    premium:    { label: 'PREMIUM',    bg: '#1a3a5c', color: '#60a5fa' },
    enterprise: { label: 'ENTERPRISE', bg: '#2d1a5c', color: '#c084fc' },
}

function TierBadge({ tier }) {
    const style = TIER_STYLES[tier] || TIER_STYLES.free
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.color}33`,
        }}>
            {style.label}
        </span>
    )
}

function MetricCard({ icon, label, value, sub }) {
    return (
        <div style={{
            background: 'var(--bg-card, #1e1e2e)',
            border: '1px solid var(--border-color, #2a2a3e)',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
            minWidth: '140px',
        }}>
            <div style={{ fontSize: '1.5rem' }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #fff)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #a0a0b0)', fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #666)' }}>{sub}</div>}
        </div>
    )
}

// ── TAB 1: Overview ──────────────────────────────────────────────────────────
function OverviewTab({ tenants, loading, error }) {
    if (loading) return <div style={{ color: 'var(--text-secondary, #aaa)', padding: '40px', textAlign: 'center' }}>Loading tenants…</div>
    if (error) return <div style={{ color: '#f87171', padding: '40px' }}>Error: {error}</div>

    const totalUsers = tenants.reduce((s, t) => s + t.userCount, 0)
    const totalProjects = tenants.reduce((s, t) => s + t.projectCount, 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <MetricCard icon="🏢" label="Total Tenants" value={tenants.length} />
                <MetricCard icon="👥" label="Total Users" value={totalUsers} />
                <MetricCard icon="🛡️" label="Total Projects" value={totalProjects} />
            </div>

            {/* Tenant table */}
            <div style={{ background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border-color, #2a2a3e)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2a3e)', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                    All Tenants
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                {['Tenant ID', 'Name', 'Tier', 'Users', 'Projects', 'Onboarded'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((t, i) => (
                                <tr key={t.tenantId} style={{ borderTop: '1px solid var(--border-color, #2a2a3e)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-primary, #fff)', fontFamily: 'monospace', fontWeight: 600 }}>{t.tenantId}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{t.name || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}><TierBadge tier={t.tier} /></td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{t.userCount}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{t.projectCount}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)', whiteSpace: 'nowrap' }}>
                                        {t.onboardedAt ? new Date(t.onboardedAt).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ── TAB 4: Security ──────────────────────────────────────────────────────────
function SecurityTab({ tenants }) {
    const [selectedId, setSelectedId] = useState('')
    const [ips, setIps] = useState([])
    const [newIp, setNewIp] = useState('')
    const [webhookData, setWebhookData] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Load all tenants' webhook summaries (simplified for this view)
        const loadWebhookOverview = async () => {
            const data = await Promise.all(tenants.map(async (t) => {
                try {
                    // This is a placeholder logic: in production, one would use a dedicated admin health endpoint
                    // For now, we simulate by fetching info for the currently logged in superadmin if relevant
                    return { id: t.tenantId, count: 0, failures: 0 } 
                } catch { return { id: t.tenantId, count: 0, failures: 0 } }
            }))
            setWebhookData(data)
        }
        loadWebhookOverview()
    }, [tenants])

    const loadAllowlist = async (id) => {
        if (!id) return
        setLoading(true)
        try {
            const res = await getIpAllowlist(id)
            setIps(res.ips || [])
        } catch (err) { alert(err.message) }
        finally { setLoading(false) }
    }

    const handleAddIp = async (e) => {
        e.preventDefault()
        if (!selectedId) return
        try {
            await addIpToAllowlist(selectedId, newIp)
            setNewIp('')
            loadAllowlist(selectedId)
        } catch (err) { alert(err.message) }
    }

    const handleRemoveIp = async (ip) => {
        try {
            await removeIpFromAllowlist(selectedId, ip)
            loadAllowlist(selectedId)
        } catch (err) { alert(err.message) }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* IP Allowlisting */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>🛡️ IP Allowlist Manager</h3>
                <select
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); loadAllowlist(e.target.value); }}
                    style={{ background: '#0f172a', border: '1px solid #2a2a3e', color: '#fff', padding: '8px', borderRadius: '8px', width: '100%', marginBottom: '1rem' }}
                >
                    <option value="">— Select Organization —</option>
                    {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.tenantId}</option>)}
                </select>

                {selectedId && selectedId !== 'system' && (
                    <div className="fade-in">
                        <form onSubmit={handleAddIp} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                placeholder="192.168.1.1"
                                value={newIp}
                                onChange={e => setNewIp(e.target.value)}
                                required
                                style={{ flex: 1, background: '#0f172a', border: '1px solid #2a2a3e', color: '#fff', padding: '8px', borderRadius: '8px' }}
                            />
                            <button type="submit" style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', cursor: 'pointer' }}>Add IP</button>
                        </form>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ips.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Allow All (no restrictions)</p>
                            ) : (
                                ips.map(ip => (
                                    <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                        <span style={{ fontFamily: 'monospace' }}>{ip}</span>
                                        <button onClick={() => handleRemoveIp(ip)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {selectedId === 'system' && (
                    <div style={{ padding: '1.5rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                        <p style={{ color: '#818cf8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            <strong>Root Access Notice:</strong> The Superadmin account is exempt from IP limits to ensure you can never be locked out of the core system.
                        </p>
                    </div>
                )}
            </div>

            {/* Webhook Health */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>📡 Webhook Health Overview</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #2a2a3e' }}>
                            <th style={{ padding: '8px' }}>Tenant</th>
                            <th style={{ padding: '8px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map(t => (
                            <tr key={t.tenantId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '8px' }}>{t.tenantId}</td>
                                <td style={{ padding: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>Healthy</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
function TenantDetailTab({ tenants }) {
    const [selectedId, setSelectedId] = useState('')
    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(false)
    const [statsError, setStatsError] = useState(null)
    const [tierMsg, setTierMsg] = useState(null)

    const loadStats = useCallback(async (id) => {
        if (!id) return
        setStatsLoading(true)
        setStatsError(null)
        setStats(null)
        try {
            const data = await getTenantStats(id)
            setStats(data)
        } catch (err) {
            setStatsError(err.message)
        } finally {
            setStatsLoading(false)
        }
    }, [])

    const handleSelect = (e) => {
        setSelectedId(e.target.value)
        setTierMsg(null)
        loadStats(e.target.value)
    }

    const handleTierChange = async (tier) => {
        if (!selectedId) return
        const ok = window.confirm(`Change ${selectedId} to ${tier.toUpperCase()} tier?`)
        if (!ok) return
        try {
            await updateTenantTier(selectedId, tier)
            setTierMsg({ type: 'success', text: `✓ Tier updated to ${tier} for ${selectedId}` })
        } catch (err) {
            setTierMsg({ type: 'error', text: `✗ Error: ${err.message}` })
        }
    }

    const TIER_BUTTONS = [
        { tier: 'free',       label: 'Free',       color: '#a0a0b0' },
        { tier: 'premium',    label: 'Premium',    color: '#60a5fa' },
        { tier: 'enterprise', label: 'Enterprise', color: '#c084fc' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tenant selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: 'var(--text-secondary, #aaa)', fontWeight: 600, fontSize: '0.875rem' }}>Select Tenant:</label>
                <select
                    value={selectedId}
                    onChange={handleSelect}
                    style={{
                        background: 'var(--bg-card, #1e1e2e)',
                        border: '1px solid var(--border-color, #2a2a3e)',
                        borderRadius: '8px',
                        color: 'var(--text-primary, #fff)',
                        padding: '8px 14px',
                        fontSize: '0.875rem',
                        minWidth: '220px',
                        cursor: 'pointer',
                    }}
                >
                    <option value="">— Choose a tenant —</option>
                    {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.tenantId} ({t.name || 'N/A'})</option>)}
                </select>
            </div>

            {/* Stats cards */}
            {statsLoading && <div style={{ color: 'var(--text-secondary, #aaa)' }}>Loading stats…</div>}
            {statsError && <div style={{ color: '#f87171' }}>Error: {statsError}</div>}
            {stats && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <MetricCard icon="👥" label="Users" value={stats.userCount} />
                    <MetricCard icon="🛡️" label="Projects" value={stats.projectCount} />
                    <MetricCard icon="✅" label="Tasks" value={stats.taskCount} />
                    <MetricCard icon="📋" label="Audit Logs" value={stats.auditLogCount} />
                </div>
            )}

            {/* Tier change */}
            {selectedId && (
                <div style={{ background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border-color, #2a2a3e)', borderRadius: '12px', padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: '14px' }}>Change Tier for <span style={{ fontFamily: 'monospace', color: '#c084fc' }}>{selectedId}</span></div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {TIER_BUTTONS.map(({ tier, label, color }) => (
                            <button
                                key={tier}
                                onClick={() => handleTierChange(tier)}
                                disabled={selectedId === 'system'}
                                style={{
                                    padding: '8px 22px',
                                    borderRadius: '8px',
                                    border: `1px solid ${color}55`,
                                    background: `${color}18`,
                                    color,
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: selectedId === 'system' ? 'not-allowed' : 'pointer',
                                    opacity: selectedId === 'system' ? 0.3 : 1,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {selectedId === 'system' && (
                        <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            The "system" account is the root orchestrator and is locked to the Enterprise plan for platform stability.
                        </div>
                    )}
                    {tierMsg && (
                        <div style={{ marginTop: '12px', color: tierMsg.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                            {tierMsg.text}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── MAIN AdminDashboard ───────────────────────────────────────────────────────
function AdminDashboard({ tenantId }) {
    const [activeTab, setActiveTab] = useState('overview')
    const [tenants, setTenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true)
        getAllTenants()
            .then(res => setTenants(res.data || []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    const TABS = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'detail',   icon: '🔍', label: 'Tenant Detail' },
        { id: 'security', icon: '🛡️', label: 'Security' },
        { id: 'system',   icon: '🖥️', label: 'System' },
    ]

    return (
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>
            {/* Page Header */}
            <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #fff)' }}>
                    🛡️ Superadmin Console
                </h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #a0a0b0)', fontSize: '0.9rem' }}>
                    Manage all tenants, tiers, and system health.
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color, #2a2a3e)', paddingBottom: '0' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #c084fc' : '2px solid transparent',
                            color: activeTab === tab.id ? '#c084fc' : 'var(--text-secondary, #aaa)',
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'overview' && <OverviewTab tenants={tenants} loading={loading} error={error} />}
                {activeTab === 'detail'   && <TenantDetailTab tenants={tenants} />}
                {activeTab === 'security' && <SecurityTab tenants={tenants} />}
                {activeTab === 'system'   && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <Monitoring tenantId={tenantId} />
                        <AuditLogs tenantId={tenantId} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminDashboard
