import { useState, useEffect } from 'react'
import './Projects.css'
import api from '../services/api'
import ProjectBoard from './ProjectBoard'

function Projects({ tenantId }) {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)
    const [activeProject, setActiveProject] = useState(null) // For Kanban view
    const [isEditing, setIsEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState(null)
    const [tierError, setTierError] = useState(null)  // Tier limit errors
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        purpose: '',
        environment: 'development',
        isolationTier: 'basic',
        region: 'us-east-1',
        status: 'provisioning',
        tags: ''
    })

    const fetchProjects = async () => {
        try {
            setLoading(true)
            const response = await api.projects.getAll()
            setProjects(response.data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching projects:', err)
            setError('Failed to load projects. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProjects()
        setActiveProject(null) // Reset view on tenant switch
    }, [tenantId])

    const handleOpenProjectBoard = (project) => {
        setActiveProject(project)
        setShowDetailsModal(false)
    }

    if (activeProject) {
        return <ProjectBoard project={activeProject} onBack={() => setActiveProject(null)} />
    }

    // ... existing code ...

    const handleSaveProject = async (e) => {
        e.preventDefault()

        // Validate form
        if (!newProject.name.trim()) {
            alert('Please enter a project name')
            return
        }

        try {
            const projectData = {
                name: newProject.name,
                description: newProject.description,
                purpose: newProject.purpose,
                environment: newProject.environment,
                isolationTier: newProject.isolationTier,
                region: newProject.region,
                status: newProject.status,
                tags: typeof newProject.tags === 'string'
                    ? newProject.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : newProject.tags
            }

            if (isEditing && selectedProject) {
                // Update existing project
                await api.projects.update(selectedProject._id, projectData)
                alert(`Project "${newProject.name}" updated successfully!`)
            } else {
                // Create new project
                await api.projects.create(projectData)
                alert(`Project "${newProject.name}" created successfully!`)
            }

            // Refresh projects list
            await fetchProjects()

            // Reset form and close modal
            setNewProject({ name: '', description: '', status: 'development' })
            setIsEditing(false)
            setSelectedProject(null)
            setShowModal(false)

        } catch (error) {
            console.error('Error saving project:', error)
            // Check if this is a tier limit error (403 from tierGuard)
            if (error.message && error.message.includes('Tier limit reached')) {
                try {
                    const parsed = JSON.parse(error.message);
                    setTierError(parsed.upgradeMessage || 'Tier limit reached. Please upgrade your plan.');
                } catch {
                    setTierError('Tier limit reached. Please upgrade your plan.');
                }
                setShowModal(false);
            } else if (error.upgradeMessage) {
                setTierError(error.upgradeMessage)
                setShowModal(false)
            } else {
                alert(`Failed to save project: ${error.message}`)
            }
        }
    }

    const handleEditProject = (project) => {
        setSelectedProject(project)
        setNewProject({
            name: project.name,
            description: project.description || '',
            purpose: project.purpose || '',
            environment: project.environment || 'development',
            isolationTier: project.isolationTier || 'basic',
            region: project.region || 'us-east-1',
            status: project.status,
            tags: project.tags ? project.tags.join(', ') : ''
        })
        setIsEditing(true)
        setShowDetailsModal(false)
        setShowModal(true)
    }

    const handleDeleteProject = async (project) => {
        try {
            await api.projects.delete(project._id)
            setConfirmDelete(false)
            setShowDetailsModal(false)
            setSelectedProject(null)
            fetchProjects()
        } catch (error) {
            console.error('Error deleting project:', error)
            setConfirmDelete(false)
            alert(`Failed to delete project: ${error.message}`)
        }
    }

    const handleOpenCreateModal = () => {
        setNewProject({
            name: '',
            description: '',
            purpose: '',
            environment: 'development',
            isolationTier: 'basic',
            region: 'us-east-1',
            status: 'provisioning',
            tags: ''
        })
        setIsEditing(false)
        setSelectedProject(null)
        setShowModal(true)
    }

    const handleViewDetails = (project) => {
        setSelectedProject(project)
        setShowDetailsModal(true)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setNewProject(prev => ({ ...prev, [name]: value }))
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'status-active'
            case 'provisioning': return 'status-development'
            case 'degraded': return 'status-maintenance'
            case 'suspended': return 'status-inactive'
            default: return 'status-inactive'
        }
    }

    return (
        <div className="projects-page fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workspaces</h1>
                    <p className="page-subtitle">Manage your isolated system environments</p>
                </div>
                <button className="create-btn" onClick={handleOpenCreateModal}>
                    <span className="btn-icon">⚡</span>
                    Provision Workspace
                </button>
            </div>

            {/* Tier Limit Error Banner */}
            {tierError && (
                <div style={{
                    backgroundColor: 'rgba(251, 146, 60, 0.1)',
                    border: '1px solid #fb923c',
                    color: '#fb923c',
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔒</span>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>Tier Limit Reached</div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{tierError}</div>
                    </div>
                    <button
                        onClick={() => setTierError(null)}
                        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fb923c', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Error Message Display */}
            {error && (
                <div className="error-banner" style={{
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    border: '1px solid var(--error-color)',
                    color: 'var(--error-color)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>⚠️</span>
                    {error}
                    <button onClick={fetchProjects} style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: '1px solid var(--error-color)',
                        color: 'var(--error-color)',
                        padding: '0.25rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: '4px'
                    }}>Retry</button>
                </div>
            )}

            {/* ... stats ... */}

            {loading ? (
                <div className="loading">
                    <div className="spinner" style={{ marginBottom: '1rem', fontSize: '2rem' }}>🌀</div>
                    Loading projects...
                </div>
            ) : projects.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🛡️</div>
                    <h3 className="empty-title">No Workspaces Provisioned</h3>
                    <p className="empty-subtitle">Initialize your first secure workspace to deploy services</p>
                    <button className="create-btn" onClick={handleOpenCreateModal}>
                        <span className="btn-icon">⚡</span>
                        Provision Now
                    </button>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map((project) => (
                        // ... existing card ...
                        <div key={project._id} className="project-card">
                            <div className="project-header">
                                <h3 className="project-name">{project.name}</h3>
                                <span className={`project-status ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            <p className="project-description">{project.description || 'No description'}</p>
                            <div className="project-footer">
                                <div className="project-meta">
                                    <span className="meta-item">
                                        <span className="meta-icon">📅</span>
                                        {new Date(project.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="view-btn" onClick={() => handleOpenProjectBoard(project)} title="Resource Insights">
                                        📊
                                    </button>
                                    <button className="view-btn" onClick={() => handleViewDetails(project)}>
                                        Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{isEditing ? 'Configure Workspace' : 'Provision New Workspace'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveProject} className="project-form">
                            {/* ... existing form inputs ... */}
                            <div className="form-group">
                                <label htmlFor="name" className="form-label">
                                    Workspace Identifier <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={newProject.name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="e.g. core-api-service"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="purpose" className="form-label">
                                    Operational Purpose
                                </label>
                                <input
                                    type="text"
                                    id="purpose"
                                    name="purpose"
                                    value={newProject.purpose}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="e.g. Transaction Processing, User Auth"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description" className="form-label">
                                    System Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={newProject.description}
                                    onChange={handleInputChange}
                                    className="form-textarea"
                                    placeholder="Detailed technical overview..."
                                    rows="3"
                                />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="environment" className="form-label">Target Environment</label>
                                    <select
                                        id="environment"
                                        name="environment"
                                        value={newProject.environment}
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="development">Development</option>
                                        <option value="staging">Staging</option>
                                        <option value="production">Production</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="isolationTier" className="form-label">Isolation Tier</label>
                                    <select
                                        id="isolationTier"
                                        name="isolationTier"
                                        value={newProject.isolationTier}
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="basic">Basic (Shared)</option>
                                        <option value="professional">Professional (Dedicated)</option>
                                        <option value="enterprise">Enterprise (Air-gapped)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="region" className="form-label">Deployment Region</label>
                                    <select
                                        id="region"
                                        name="region"
                                        value={newProject.region}
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="us-east-1">US East (N. Virginia)</option>
                                        <option value="us-west-2">US West (Oregon)</option>
                                        <option value="eu-central-1">Europe (Frankfurt)</option>
                                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="status" className="form-label">Operational Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={newProject.status}
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="provisioning">Provisioning</option>
                                        <option value="active">Active</option>
                                        <option value="degraded">Degraded</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>



                            <div className="form-group">
                                <label htmlFor="tags" className="form-label">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    id="tags"
                                    name="tags"
                                    value={Array.isArray(newProject.tags) ? newProject.tags.join(', ') : newProject.tags}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="frontend, backend, urgency"
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    <span className="btn-icon">{isEditing ? '💾' : '⚡'}</span>
                                    {isEditing ? 'Update Configuration' : 'Confirm Provisioning'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Project Details Modal */}
            {showDetailsModal && selectedProject && (
                <div className="modal-overlay" onClick={() => { setShowDetailsModal(false); setConfirmDelete(false) }}>
                    <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
                        {/* ... existing details modal content ... */}
                        <div className="modal-header">
                            <h2 className="modal-title">Workspace Configuration</h2>
                            <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="details-content">
                            <div className="detail-section">
                                <div className="detail-header">
                                    <h3 className="detail-project-name">{selectedProject.name}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <span className={`project-status ${selectedProject.environment === 'production' ? 'status-active' : 'status-development'}`}>
                                            {selectedProject.environment}
                                        </span>
                                        <span className={`project-status ${getStatusColor(selectedProject.status)}`}>
                                            {selectedProject.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4 className="detail-label">Operational Purpose</h4>
                                <p className="detail-value">{selectedProject.purpose || 'General purpose workspace'}</p>
                            </div>

                            <div className="detail-section">
                                <h4 className="detail-label">System Overview</h4>
                                <p className="detail-value">{selectedProject.description || 'No detailed overview provided'}</p>
                            </div>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Resource ID</span>
                                    <span className="detail-value detail-code">{selectedProject._id}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Isolation Tier</span>
                                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedProject.isolationTier || 'Basic'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Region</span>
                                    <span className="detail-value">{selectedProject.region || 'us-east-1'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Provisioned At</span>
                                    <span className="detail-value">{new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Tags</span>
                                    <div className="tags-container" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {selectedProject.tags && selectedProject.tags.length > 0 ? (
                                            selectedProject.tags.map((tag, i) => (
                                                <span key={i} style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85em'
                                                }}>
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="detail-value">No tags</span>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Created At</span>
                                    <span className="detail-value">{new Date(selectedProject.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Last Updated</span>
                                    <span className="detail-value">{new Date(selectedProject.updatedAt || selectedProject.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {confirmDelete ? (
                                <div style={{
                                    background: 'rgba(255, 59, 48, 0.12)',
                                    border: '1px solid rgba(255, 59, 48, 0.5)',
                                    borderRadius: '10px',
                                    padding: '1rem 1.25rem',
                                    marginTop: '1rem'
                                }}>
                                    <p style={{ margin: '0 0 0.75rem', color: '#ff6b6b', fontWeight: 500 }}>
                                        ⚠️ Are you sure? This will permanently delete <strong>"{selectedProject.name}"</strong> and all its tasks.
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            className="btn-cancel"
                                            onClick={() => setConfirmDelete(false)}
                                            style={{ flex: 1 }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDeleteProject(selectedProject)}
                                            style={{ flex: 1, background: 'rgba(255,59,48,0.8)' }}
                                        >
                                            <span className="btn-icon">🗑️</span>
                                            Yes, Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="detail-actions">
                                    <button className="create-btn" onClick={() => handleOpenProjectBoard(selectedProject)} style={{ flex: 2, justifyContent: 'center' }}>
                                        <span className="btn-icon">📊</span>
                                        Open Resource Console
                                    </button>
                                    <button className="btn-edit" onClick={() => handleEditProject(selectedProject)}>
                                        <span className="btn-icon">✏️</span>
                                        Edit
                                    </button>
                                    <button className="btn-delete" onClick={() => setConfirmDelete(true)}>
                                        <span className="btn-icon">🗑️</span>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Projects
