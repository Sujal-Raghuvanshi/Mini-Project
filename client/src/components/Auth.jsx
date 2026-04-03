import { useState } from 'react'
import './Auth.css'
import api from '../services/api'

function Auth({ onAuthenticated }) {
    const [isLogin, setIsLogin] = useState(true)
    const [tenantId, setTenantId] = useState('tenant-a')
    const [userId, setUserId] = useState('admin')
    const [password, setPassword] = useState('admin123')
    const [isCustomLogin, setIsCustomLogin] = useState(false)
    const [customTenantId, setCustomTenantId] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    // Registration state
    const [newTenant, setNewTenant] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            let finalTenantId
            if (isLogin) {
                finalTenantId = isCustomLogin ? customTenantId.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') : tenantId
            } else {
                finalTenantId = newTenant.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
            }
            const finalUserId = isLogin ? userId : newUsername
            const finalPassword = isLogin ? password : newPassword

            if (!finalTenantId || !finalUserId || !finalPassword) {
                throw new Error('Please fill in all fields')
            }

            if (!isLogin) {
                // If it's a new signup, we need to register the tenant/user first
                await api.auth.register({
                    organizationName: newTenant,
                    tenantId: finalTenantId,
                    userId: finalUserId,
                    password: finalPassword
                });

                // Optional: Short delay for effect
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Now log in (for both fresh signups and returning users)
            const response = await api.auth.generateToken(finalTenantId, finalUserId, finalPassword)
            api.setAuthToken(response.token)
            onAuthenticated({
                tenantId: finalTenantId,
                userId: finalUserId,
                role: response.user?.role || 'admin',
                token: response.token
            })
        } catch (err) {
            setError(err.message || 'Authentication failed')
            // If user already exists, let's be helpful and switch them to the login tab
            if (err.message && err.message.toLowerCase().includes('already exists')) {
                setTimeout(() => {
                    setIsLogin(true)
                    // If we can pre-populate the login fields, do it
                    if (newUsername) setUserId(newUsername)
                    if (newTenant) {
                        setCustomTenantId(newTenant.toLowerCase().replace(/\s+/g, '-'))
                        setIsCustomLogin(true)
                    }
                }, 2000)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-wrapper">
            <div className="auth-visual-side">
                <div className="visual-content">
                    <div className="visual-logo">
                        <span className="logo-icon">🚀</span>
                        <span className="logo-text">SkyGate</span>
                    </div>
                    <h2 className="visual-title">The Next Generation of Multi-Tenancy</h2>
                    <p className="visual-description">
                        Manage thousands of isolated environments with a single, powerful administrative dashboard.
                        Security, isolation, and performance, built from the ground up.
                    </p>

                    <div className="feature-cards">
                        <div className="feature-mini-card">
                            <span className="mini-card-icon">🔒</span>
                            <div>
                                <h4>Strict Isolation</h4>
                                <p>Data never leaks across tenants.</p>
                            </div>
                        </div>
                        <div className="feature-mini-card">
                            <span className="mini-card-icon">⚡</span>
                            <div>
                                <h4>Real-time Metrics</h4>
                                <p>Monitor system health instantly.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="visual-blobs">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                </div>
            </div>

            <div className="auth-form-side">
                <div className="auth-card-premium">
                    <div className="auth-header-new">
                        <h1 className="auth-title-new">
                            {isLogin ? 'Sign In' : 'Get Started'}
                        </h1>
                        <p className="auth-subtitle-new">
                            {isLogin
                                ? 'Welcome back! Please enter your credentials.'
                                : 'Join our network and build your workspace.'}
                        </p>
                    </div>

                    <div className="auth-tabs-premium">
                        <button
                            className={`tab-btn-premium ${isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Log In
                        </button>
                        <button
                            className={`tab-btn-premium ${!isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form-new">
                        {error && (
                            <div className="auth-error-new">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        {isLogin ? (
                            <>
                                <div className="form-group-new">
                                    <div className="label-flex">
                                        <label className="form-label-new">Organization ID</label>
                                        <button
                                            type="button"
                                            className="toggle-link"
                                            onClick={() => {
                                                const nextCustom = !isCustomLogin;
                                                setIsCustomLogin(nextCustom);
                                                // If switching back to demo, check if we should auto-fill
                                                if (!nextCustom) {
                                                    if (tenantId === 'tenant-a' || tenantId === 'tenant-b') {
                                                        setUserId('admin');
                                                        setPassword('admin123');
                                                    }
                                                } else {
                                                    // Switching to custom, clear fields
                                                    setUserId('');
                                                    setPassword('');
                                                }
                                            }}
                                        >
                                            {isCustomLogin ? 'Use Dropdown' : 'Use Custom ID'}
                                        </button>
                                    </div>

                                    {isCustomLogin ? (
                                        <div className="input-with-icon">
                                            <span className="input-icon">🏢</span>
                                            <input
                                                type="text"
                                                value={customTenantId}
                                                onChange={(e) => {
                                                    setCustomTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                                                    setPassword('') // Clear password for custom tenants
                                                }}
                                                className="form-input-new"
                                                placeholder="e.g. acme-inc"
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div className="input-with-icon">
                                            <span className="input-icon">🌐</span>
                                            <select
                                                value={tenantId}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setTenantId(val)
                                                    // Auto-fill only for demo accounts
                                                    if (val === 'tenant-a' || val === 'tenant-b') {
                                                        setPassword('admin123')
                                                        setUserId('admin')
                                                    } else {
                                                        setPassword('')
                                                        setUserId('')
                                                    }
                                                }}
                                                className="form-input-new select-input"
                                                disabled={loading}
                                            >
                                                <option value="tenant-a">Tenant A (Demo)</option>
                                                <option value="tenant-b">Tenant B (Demo)</option>
                                                <option value="tenant-c">Tenant C (Demo)</option>
                                                <option value="system">🔮 System (Superadmin)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group-new">
                                    <label className="form-label-new">Username</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">👤</span>
                                        <input
                                            type="text"
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            className="form-input-new"
                                            placeholder="admin"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group-new">
                                    <label className="form-label-new">Password</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">🔑</span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-input-new"
                                            placeholder="••••••••"
                                            disabled={loading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group-new">
                                    <label className="form-label-new">Organization Name</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">🏛️</span>
                                        <input
                                            type="text"
                                            value={newTenant}
                                            onChange={(e) => setNewTenant(e.target.value)}
                                            className="form-input-new"
                                            placeholder="Your Company Name"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <p className="field-hint-new">Tenant ID: <span>{newTenant ? newTenant.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') : '...'}</span></p>
                                </div>
                                <div className="form-group-new">
                                    <label className="form-label-new">Admin Username</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">👑</span>
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            className="form-input-new"
                                            placeholder="Choose a username"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group-new">
                                    <label className="form-label-new">Password</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon">🔒</span>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-input-new"
                                            placeholder="Create a strong password"
                                            disabled={loading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <button type="submit" className="auth-submit-premium" disabled={loading}>
                            {loading ? (
                                <div className="loading-spinner-small"></div>
                            ) : (
                                <span>{isLogin ? 'Sign In to Dashboard' : 'Initialize Workspace'}</span>
                            )}
                        </button>
                    </form>

                    <p className="auth-footer-text">
                        By continuing, you agree to our Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Auth
