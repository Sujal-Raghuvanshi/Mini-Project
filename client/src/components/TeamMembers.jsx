import { useState, useEffect } from 'react';
import './Settings.css'; // Reusing these styles
import api from '../services/api';

function TeamMembers({ tenantId }) {
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteForm, setInviteForm] = useState({ username: '', role: 'user' });
    const [inviting, setInviting] = useState(false);
    const [newInviteParams, setNewInviteParams] = useState(null);

    useEffect(() => {
        fetchData();
    }, [tenantId]);

    const fetchData = async () => {
        try {
            const [usersRes, invitesRes] = await Promise.all([
                api.users.getAll(),
                api.invitations.getAll()
            ]);
            setMembers(usersRes.data || []);
            setInvitations(invitesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviting(true);
        setNewInviteParams(null);
        try {
            const res = await api.invitations.invite(inviteForm);
            setInviteForm({ username: '', role: 'user' });
            setNewInviteParams(res.invitation);
            fetchData(); // Refresh lists
        } catch (error) {
            alert(error.message || 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    const handleRevoke = async (id, type) => {
        if (!window.confirm('Are you sure you want to revoke this user/invitation?')) return;
        
        try {
            if (type === 'invite') {
                await api.invitations.revoke(id);
            } else {
                // If we had a delete user route, it would go here. For now we just revoke invites
                alert("Only pending invitations can be revoked currently.");
            }
            fetchData();
        } catch (error) {
            alert(error.message || 'Failed to revoke');
        }
    };

    if (loading) {
        return <div className="settings-page fade-in">Loading team details...</div>;
    }

    return (
        <div className="settings-page fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team Management</h1>
                    <p className="page-subtitle">Manage workspace members and roles</p>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <span className="section-icon">✉️</span>
                    <h3 className="settings-title">Invite New Member</h3>
                </div>
                
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="username"
                            value={inviteForm.username}
                            onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0, width: '150px' }}>
                        <label className="form-label">Role</label>
                        <select
                            className="form-input"
                            value={inviteForm.role}
                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <button 
                        type="submit" 
                        disabled={inviting}
                        className="btn-secondary" 
                        style={{ height: '42px', background: 'var(--primary-color)', color: 'white', border: 'none' }}
                    >
                        {inviting ? 'Inviting...' : 'Send Invite'}
                    </button>
                </form>

                {newInviteParams && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Invitation Sent Successfully!</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Please share these temporary credentials with the user:
                        </p>
                        <div className="api-key-section" style={{ marginTop: '0.5rem', userSelect: 'all' }}>
                            <span className="api-key" style={{ fontSize: '0.85rem' }}>
                                Tenant: {tenantId} | Username: {newInviteParams.username} | Password: {newInviteParams.tempPassword}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <span className="section-icon">👥</span>
                    <h3 className="settings-title">Active Members ({members.length})</h3>
                </div>
                
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    {members.map(member => (
                        <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                                <span style={{ fontWeight: 'bold', marginRight: '1rem', color: 'var(--text-primary)' }}>{member.username}</span>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{member.role}</span>
                            </div>
                            {member.role !== 'admin' && (
                                <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {invitations.length > 0 && (
                <div className="settings-section">
                    <div className="settings-header">
                        <span className="section-icon">⏳</span>
                        <h3 className="settings-title">Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</h3>
                    </div>
                    
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                        {invitations.filter(i => i.status === 'pending').map(invite => (
                            <div key={invite._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <span style={{ fontWeight: 'bold', marginRight: '1rem', color: 'var(--text-primary)' }}>{invite.username}</span>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{invite.role}</span>
                                    <span style={{ fontSize: '0.75rem', marginLeft: '1rem', color: 'var(--text-secondary)' }}>
                                        Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <button 
                                    className="btn-secondary" 
                                    onClick={() => handleRevoke(invite._id, 'invite')}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamMembers;
