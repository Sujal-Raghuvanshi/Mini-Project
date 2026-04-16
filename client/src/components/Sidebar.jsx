import './Sidebar.css'

function Sidebar({ currentView, setCurrentView, tenantId, userId, userRole, onLogout, onTenantSwitch }) {
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'projects', icon: '🛡️', label: 'Workspaces' },
        ...(userRole !== 'superadmin' ? [
            { id: 'team', icon: '👥', label: 'Team' },
            { id: 'billing', icon: '💳', label: 'Billing' },
        ] : []),
        { id: 'audit', icon: '📋', label: 'Audit Logs' },
        { id: 'monitoring', icon: '📈', label: 'Monitoring' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
        ...(userRole === 'superadmin' ? [{ id: 'admin', icon: '🔮', label: 'Superadmin' }] : []),
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">🏢</span>
                    <span className="logo-text">Multi-Tenant</span>
                </div>
                <div className="tenant-badge">
                    <span className="tenant-label">{tenantId.toUpperCase()}</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentView(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div
                    className="user-profile"
                    onClick={() => setCurrentView('settings')}
                    role="button"
                    tabIndex={0}
                    title="Go to Settings"
                >
                    <div className="user-avatar">{userId ? userId[0].toUpperCase() : 'U'}</div>
                    <div className="user-info">
                        <div className="user-name">{userId || 'User'}</div>
                        <div className="user-role">ADMINISTRATOR</div>
                    </div>
                </div>
                <div className="tenant-selector">
                    <span className="tenant-label-small">TENANT</span>
                    <select
                        className="tenant-dropdown"
                        value={tenantId}
                        onChange={(e) => onTenantSwitch && onTenantSwitch(e.target.value)}
                    >
                        {['tenant-a', 'tenant-b', 'tenant-c'].includes(tenantId) ? (
                            <>
                                <option value="tenant-a">Tenant A (Demo)</option>
                                <option value="tenant-b">Tenant B (Demo)</option>
                                <option value="tenant-c">Tenant C (Demo)</option>
                            </>
                        ) : (
                            <option value={tenantId}>{tenantId.toUpperCase()}</option>
                        )}
                    </select>
                </div>
                <button className="logout-button" onClick={onLogout}>
                    <span className="logout-icon">🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
