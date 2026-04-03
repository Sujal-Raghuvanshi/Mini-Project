const TIER_META = {
    free:       { label: 'FREE',       bg: '#2a2a3a', color: '#9ca3af', border: '#3a3a4a' },
    premium:    { label: 'PREMIUM',    bg: '#1a3050', color: '#60a5fa', border: '#2a5080' },
    enterprise: { label: 'ENTERPRISE', bg: '#2a1a50', color: '#c084fc', border: '#4a2a80' },
}

function UsageBar({ label, current, max }) {
    // Enterprise / unlimited
    if (max === -1) {
        return (
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', color: '#a0a0b0' }}>
                    <span>{label}</span>
                    <span style={{ color: '#c084fc', fontWeight: 700 }}>∞ Unlimited</span>
                </div>
                <div style={{ height: '4px', background: '#2a2a3e', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #c084fc, #818cf8)', borderRadius: '99px' }} />
                </div>
            </div>
        )
    }

    const pct = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0
    const isRed = pct >= 80
    const isFull = pct >= 100
    const barColor = isFull ? '#f87171' : isRed ? '#fb923c' : '#34d399'

    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', color: '#a0a0b0' }}>
                <span>{label}</span>
                <span style={{ color: isFull ? '#f87171' : isRed ? '#fb923c' : '#a0a0b0', fontWeight: isFull ? 700 : 400 }}>
                    {current}/{max} ({pct}%)
                </span>
            </div>
            <div style={{ height: '4px', background: '#2a2a3e', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '99px',
                    transition: 'width 0.4s ease',
                }} />
            </div>
            {isFull && (
                <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '4px', fontWeight: 600 }}>
                    ⚠ {label.replace(':', '').trim()} limit reached — contact admin to upgrade
                </div>
            )}
        </div>
    )
}

/**
 * TierBadge
 * Props: tier, currentProjects, maxProjects, currentUsers, maxUsers
 */
function TierBadge({ tier = 'free', currentProjects = 0, maxProjects = 3, currentUsers = 0, maxUsers = 5 }) {
    const meta = TIER_META[tier] || TIER_META.free

    return (
        <div style={{
            background: meta.bg,
            border: `1px solid ${meta.border}`,
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '240px',
        }}>
            {/* Badge Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    background: `${meta.color}22`,
                    border: `1px solid ${meta.color}55`,
                    color: meta.color,
                    borderRadius: '999px',
                    padding: '2px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                }}>
                    {meta.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>plan</span>
            </div>

            {/* Usage Bars */}
            <div style={{ minWidth: '180px' }}>
                <UsageBar label="Projects:" current={currentProjects} max={maxProjects} />
                <UsageBar label="Users:"    current={currentUsers}    max={maxUsers} />
            </div>
        </div>
    )
}

export default TierBadge
