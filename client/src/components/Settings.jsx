import { useState } from 'react'
import './Settings.css'

import api from '../services/api'

function Settings({ tenantId, onLogout }) {
    const [notifications, setNotifications] = useState(true)
    const [apiKey, setApiKey] = useState('sk_live_51Mz...')
    const [showKey, setShowKey] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleGenerateKey = () => {
        const newKey = 'sk_live_' + Math.random().toString(36).substr(2, 24)
        setApiKey(newKey)
        alert('New API Key generated successfully')
    }

    const handleDeleteAccount = async () => {
        const isDemo = ['tenant-a', 'tenant-b', 'tenant-c'].includes(tenantId);
        if (isDemo) {
            alert('Demo accounts cannot be deleted.');
            return;
        }

        const confirm = window.confirm(
            `ARE YOU SURE? This will permanently delete the organization "${tenantId}" and ALL associated data (projects, tasks, users). This action CANNOT be undone.`
        );

        if (confirm) {
            setIsDeleting(true);
            try {
                await api.tenants.deleteAccount();
                alert('Account deleted successfully. You will now be logged out.');
                onLogout();
            } catch (error) {
                alert('Failed to delete account: ' + error.message);
            } finally {
                setIsDeleting(false);
            }
        }
    }

    return (
        <div className="settings-page fade-in">
            {/* ... header and profile sections ... */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your tenant configuration</p>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <span className="section-icon">🏢</span>
                    <h3 className="settings-title">Tenant Profile</h3>
                </div>
                <div className="form-group">
                    <label className="form-label">Tenant ID</label>
                    <div className="form-input-static">{tenantId}</div>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        This is your unique tenant identifier used for isolation.
                    </p>
                </div>
                <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input
                        type="text"
                        className="form-input"
                        defaultValue={tenantId.toUpperCase()}
                    />
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <span className="section-icon">🔔</span>
                    <h3 className="settings-title">Notifications</h3>
                </div>
                <div className="form-group">
                    <label className="toggle-switch" onClick={() => setNotifications(!notifications)}>
                        <div className={`switch-track ${notifications ? 'active' : ''}`}>
                            <div className="switch-thumb" />
                        </div>
                        <span className="toggle-label">Enable Email Notifications</span>
                    </label>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <span className="section-icon">🔑</span>
                    <h3 className="settings-title">API Configuration</h3>
                </div>
                <div className="form-group">
                    <label className="form-label">Secret API Key</label>
                    <div className="api-key-section">
                        <span className="api-key">
                            {showKey ? apiKey : '••••••••••••••••••••••••••••'}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary" onClick={() => setShowKey(!showKey)}>
                                {showKey ? 'Hide' : 'Show'}
                            </button>
                            <button className="btn-secondary" onClick={handleGenerateKey}>
                                Regenerate
                            </button>
                        </div>
                    </div>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f87171' }}>
                        ⚠️ Regenerating your key will invalidate the existing one immediately.
                    </p>
                </div>
            </div>

            {/* DANGER ZONE: Only for custom tenants */}
            {!['tenant-a', 'tenant-b', 'tenant-c'].includes(tenantId) && (
                <div className="settings-section danger-zone">
                    <div className="settings-header">
                        <span className="section-icon">⚠️</span>
                        <h3 className="settings-title" style={{ color: '#ef4444' }}>Danger Zone</h3>
                    </div>
                    <div className="danger-content">
                        <div className="danger-text">
                            <h4>Delete this organization</h4>
                            <p>Once you delete an organization, there is no going back. This will delete all data related to <strong>{tenantId}</strong>.</p>
                        </div>
                        <button
                            className="btn-danger"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Organization'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings
