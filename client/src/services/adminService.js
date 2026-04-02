const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getToken = () => localStorage.getItem('authToken')

const adminRequest = async (endpoint, options = {}) => {
    const token = getToken()

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

    // Handle session expiry — clear storage and force logout via page reload
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('tenantId')
        localStorage.removeItem('userId')
        localStorage.removeItem('sessionStartTime')
        window.location.reload()
        return
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return { success: true }
    }

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Admin API request failed')
    }

    return data
}

/** GET /admin/tenants — returns all tenants with aggregate counts */
export const getAllTenants = () => adminRequest('/admin/tenants')

/** GET /admin/tenants/:tenantId/stats — returns user/project/task/auditLog counts */
export const getTenantStats = (tenantId) => adminRequest(`/admin/tenants/${tenantId}/stats`)

/** PATCH /admin/tenants/:tenantId/tier — updates the tenant billing tier */
export const updateTenantTier = (tenantId, tier) =>
    adminRequest(`/admin/tenants/${tenantId}/tier`, {
        method: 'PATCH',
        body: JSON.stringify({ tier }),
    })

// --- WEBHOOKS (Tenant Scoped) ---
/** GET /api/webhooks - List all for tenant */
export const getWebhooks = () => adminRequest('/api/webhooks')

/** POST /api/webhooks - Register new */
export const createWebhook = (data) =>
    adminRequest('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(data),
    })

/** DELETE /api/webhooks/:id - Remove */
export const deleteWebhook = (id) => adminRequest(`/api/webhooks/${id}`, { method: 'DELETE' })

/** PATCH /api/webhooks/:id/toggle - Enable/Disable */
export const toggleWebhook = (id) => adminRequest(`/api/webhooks/${id}/toggle`, { method: 'PATCH' })

// --- IP ALLOWLISTING (Admin Scoped) ---
/** GET /admin/tenants/:tenantId/ip-allowlist */
export const getIpAllowlist = (tenantId) => adminRequest(`/admin/tenants/${tenantId}/ip-allowlist`)

/** POST /admin/tenants/:tenantId/ip-allowlist */
export const addIpToAllowlist = (tenantId, ip) =>
    adminRequest(`/admin/tenants/${tenantId}/ip-allowlist`, {
        method: 'POST',
        body: JSON.stringify({ ip }),
    })

/** DELETE /admin/tenants/:tenantId/ip-allowlist/:ip */
export const removeIpFromAllowlist = (tenantId, ip) =>
    adminRequest(`/admin/tenants/${tenantId}/ip-allowlist/${ip}`, { method: 'DELETE' })
