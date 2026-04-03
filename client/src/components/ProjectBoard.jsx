import { useState, useEffect } from 'react'
import './ProjectBoard.css'
import api from '../services/api'

function ProjectBoard({ project, onBack }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [showTaskModal, setShowTaskModal] = useState(false)
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        tags: ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [selectedTask, setSelectedTask] = useState(null)

    const columns = [
        { id: 'todo', title: 'To Do', icon: '📝' },
        { id: 'in_progress', title: 'In Progress', icon: '⚡' },
        { id: 'review', title: 'Review', icon: '👀' },
        { id: 'done', title: 'Done', icon: '✅' }
    ]

    useEffect(() => {
        fetchTasks()
    }, [project._id])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const response = await api.tasks.getAll(project._id)
            setTasks(response.data || [])
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveTask = async (e) => {
        e.preventDefault()
        try {
            const taskData = {
                ...newTask,
                project_id: project._id,
                tags: typeof newTask.tags === 'string'
                    ? newTask.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : newTask.tags
            }

            if (isEditing && selectedTask) {
                await api.tasks.update(selectedTask._id, taskData)
            } else {
                await api.tasks.create(taskData)
            }

            fetchTasks()
            setShowTaskModal(false)
            resetForm()
        } catch (error) {
            console.error('Failed to save task:', error)
            alert('Failed to save task')
        }
    }

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return
        try {
            await api.tasks.delete(taskId)
            fetchTasks()
        } catch (error) {
            console.error('Failed to delete task:', error)
        }
    }

    const handleEditTask = (task) => {
        setSelectedTask(task)
        setNewTask({
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            tags: task.tags ? task.tags.join(', ') : ''
        })
        setIsEditing(true)
        setShowTaskModal(true)
    }

    const resetForm = () => {
        setNewTask({
            title: '',
            description: '',
            status: 'todo',
            priority: 'medium',
            dueDate: '',
            tags: ''
        })
        setIsEditing(false)
        setSelectedTask(null)
    }

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId)
    }

    const handleDrop = async (e, status) => {
        const taskId = e.dataTransfer.getData('taskId')
        const task = tasks.find(t => t._id === taskId)

        if (task && task.status !== status) {
            // Optimistic update
            const updatedTasks = tasks.map(t =>
                t._id === taskId ? { ...t, status } : t
            )
            setTasks(updatedTasks)

            try {
                await api.tasks.update(taskId, { status })
            } catch (error) {
                console.error('Failed to update task status:', error)
                fetchTasks() // Revert on error
            }
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    return (
        <div className="project-board fade-in">
            <div className="board-header">
                <div className="board-title">
                    <h2>{project.name}</h2>
                    <div className="board-meta">
                        <span>🏷️ {project.status}</span>
                        <span>📅 {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'No start date'}</span>
                        <span>💰 ${project.budget?.toLocaleString()}</span>
                    </div>
                </div>
                <div className="board-actions">
                    <button className="create-btn" onClick={() => { resetForm(); setShowTaskModal(true) }}>
                        <span>➕ New Task</span>
                    </button>
                    <button className="btn-back" onClick={onBack}>
                        ⬅ Back to Projects
                    </button>
                </div>
            </div>

            <div className="kanban-board">
                {columns.map(col => (
                    <div
                        key={col.id}
                        className="kanban-column"
                        onDrop={(e) => handleDrop(e, col.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="column-header">
                            <span className="column-title">
                                {col.icon} {col.title}
                            </span>
                            <span className="task-count">
                                {tasks.filter(t => t.status === col.id).length}
                            </span>
                        </div>
                        <div className="task-list">
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div
                                    key={task._id}
                                    className="task-card"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                    onClick={() => handleEditTask(task)}
                                >
                                    <div className={`task-priority priority-${task.priority}`} title={`Priority: ${task.priority}`} />
                                    <div className="task-title">{task.title}</div>
                                    {task.description && <div className="task-desc">{task.description}</div>}

                                    <div className="task-footer">
                                        <div className="task-tags">
                                            {task.tags?.map((tag, i) => (
                                                <span key={i} className="task-tag">{tag}</span>
                                            ))}
                                        </div>
                                        <div className="task-actions">
                                            <button
                                                className="btn-task-action"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id) }}
                                                title="Delete task"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {showTaskModal && (
                <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{isEditing ? 'Edit Task' : 'New Task'}</h2>
                            <button className="modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSaveTask} className="project-form">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    className="form-input"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={newTask.description}
                                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                    rows="3"
                                />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={newTask.status}
                                        onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                                    >
                                        {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select
                                        className="form-select"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowTaskModal(false)}>Cancel</button>
                                <button type="submit" className="btn-submit">{isEditing ? 'Save Changes' : 'Create Task'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProjectBoard
