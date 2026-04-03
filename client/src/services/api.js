// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Store JWT token
let authToken = null

// Set authentication token
export const setAuthToken = (token) => {
    authToken = token
    if (token) {
        localStorage.setItem('authToken', token)
    } else {
        localStorage.removeItem('authToken')
    }
}

// Get authentication token
export const getAuthToken = () => {
    if (!authToken) {
        authToken = localStorage.getItem('authToken')
    }
    return authToken
}

// API request helper
const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken()

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return { success: true }
        }

        const data = await response.json()

        if (!response.ok) {
            if (response.status === 401) {
                setAuthToken(null)
                window.location.reload()
                return // Stop execution
            }
            throw new Error(data.error || data.message || 'API request failed')
        }

        return data
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error)
        throw error
    }
}

// Auth API
export const authAPI = {
    // Generate JWT token for testing
    generateToken: async (tenantId, userId, password) => {
        return apiRequest('/auth/token', {
            method: 'POST',
            body: JSON.stringify({ tenantId, userId, password }),
        })
    },

    // Register (if implemented)
    register: async (userData) => {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        })
    },
}

// Health API
export const healthAPI = {
    // Get basic health
    getHealth: async () => {
        return apiRequest('/health')
    },

    // Get detailed health
    getDetailedHealth: async () => {
        return apiRequest('/health/detailed')
    },

    // Get metrics
    getMetrics: async () => {
        return apiRequest('/metrics/json')
    },
}

// Users API
export const usersAPI = {
    // Get all users (tenant-scoped)
    getAll: async () => {
        return apiRequest('/api/users')
    },

    // Create user
    create: async (userData) => {
        return apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        })
    },
}

// Projects API
export const projectsAPI = {
    // Get all projects (tenant-scoped)
    getAll: async () => {
        return apiRequest('/api/projects')
    },

    // Create project
    create: async (projectData) => {
        return apiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify(projectData),
        })
    },

    // Update project
    update: async (id, projectData) => {
        return apiRequest(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData),
        })
    },

    // Delete project
    delete: async (id) => {
        return apiRequest(`/api/projects/${id}`, {
            method: 'DELETE',
        })
    },
}

// Tasks API
export const tasksAPI = {
    // Get all tasks (optionally filtered by project)
    getAll: async (projectId = null) => {
        const query = projectId ? `?projectId=${projectId}` : ''
        return apiRequest(`/api/tasks${query}`)
    },

    // Create task
    create: async (taskData) => {
        return apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData),
        })
    },

    // Update task
    update: async (id, taskData) => {
        return apiRequest(`/api/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData),
        })
    },

    // Delete task
    delete: async (id) => {
        return apiRequest(`/api/tasks/${id}`, {
            method: 'DELETE',
        })
    },
}

// Audit Logs API
export const auditLogsAPI = {
    // Get audit logs
    getAll: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString()
        const endpoint = `/api/audit-logs${queryString ? `?${queryString}` : ''}`
        return apiRequest(endpoint)
    },

    // Get audit statistics
    getStats: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString()
        const endpoint = `/api/audit-logs/stats${queryString ? `?${queryString}` : ''}`
        return apiRequest(endpoint)
    },
}

// Rate Limit API
export const rateLimitAPI = {
    // Get rate limit status
    getStatus: async () => {
        return apiRequest('/api/rate-limit/status')
    },
}

// Tenant API
export const tenantAPI = {
    // Delete current tenant account
    deleteAccount: async () => {
        return apiRequest('/api/tenant', {
            method: 'DELETE',
        })
    },
}

export default {
    setAuthToken,
    getAuthToken,
    auth: authAPI,
    health: healthAPI,
    users: usersAPI,
    projects: projectsAPI,
    tasks: tasksAPI,
    auditLogs: auditLogsAPI,
    rateLimit: rateLimitAPI,
    tenants: tenantAPI,
}
