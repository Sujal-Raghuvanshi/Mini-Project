import { useState, useEffect } from 'react';
import './Settings.css'; // Reuse settings styles, or we can make a specific Billing.css
import api from '../services/api';

function Billing({ tenantId }) {
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState('free');
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [pendingRequest, setPendingRequest] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, [tenantId]);

    const fetchPlans = async () => {
        try {
            const [plansData, requestData] = await Promise.all([
                api.billing.getPlans(),
                api.billing.getRequests ? api.billing.getRequests() : fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/billing/requests`, {
                    headers: { 'Authorization': `Bearer ${api.getAuthToken()}` }
                }).then(res => res.json())
            ]);
            setPlans(plansData.plans);
            setCurrentPlan(plansData.currentPlan);
            if (requestData && requestData.data) {
                setPendingRequest(requestData.data);
            } else {
                setPendingRequest(null);
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId) => {
        if (planId === currentPlan) return;
        
        setUpgrading(true);
        try {
            const res = await api.billing.upgrade({ plan: planId, billingCycle });
            if (res.request) {
                setPendingRequest(res.request);
                alert(`Upgrade request submitted successfully! Waiting for superadmin approval.`);
            } else {
                setCurrentPlan(planId);
                alert(`Successfully changed plan to ${planId.toUpperCase()}`);
                window.location.reload();
            }
        } catch (error) {
            alert(error.message || 'Failed to request upgrade');
        } finally {
            setUpgrading(false);
        }
    };

    if (loading) {
        return <div className="settings-page fade-in">Loading billing details...</div>;
    }

    return (
        <div className="settings-page fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Billing & Plans</h1>
                    <p className="page-subtitle">Manage your organization's subscription</p>
                </div>
            </div>

            <div className="settings-section" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', borderRadius: '99px', padding: '4px', marginBottom: '2rem' }}>
                    <button 
                        className={`btn-secondary ${billingCycle === 'monthly' ? 'active-toggle' : ''}`}
                        style={{ border: 'none', background: billingCycle === 'monthly' ? 'var(--primary-color)' : 'transparent', color: billingCycle === 'monthly' ? 'white' : 'var(--text-secondary)' }}
                        onClick={() => setBillingCycle('monthly')}
                    >
                        Monthly
                    </button>
                    <button 
                        className={`btn-secondary ${billingCycle === 'annual' ? 'active-toggle' : ''}`}
                        style={{ border: 'none', background: billingCycle === 'annual' ? 'var(--primary-color)' : 'transparent', color: billingCycle === 'annual' ? 'white' : 'var(--text-secondary)' }}
                        onClick={() => setBillingCycle('annual')}
                    >
                        Annually (Save 20%)
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
                    {plans.map(plan => (
                        <div key={plan.id} style={{
                            background: 'var(--card-bg)',
                            border: `2px solid ${plan.id === currentPlan ? plan.color : 'var(--border-color)'}`,
                            borderRadius: '16px',
                            padding: '2rem',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: plan.id === currentPlan ? `0 0 20px ${plan.color}33` : 'none'
                        }}>
                            {plan.popular && (
                                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    Most Popular
                                </div>
                            )}
                            <h3 style={{ margin: '0 0 1rem 0', color: plan.id === currentPlan ? plan.color : 'var(--text-primary)', fontSize: '1.5rem' }}>{plan.name}</h3>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    ${plan.price[billingCycle]}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>/mo</span>
                            </div>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flexGrow: 1 }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <span style={{ color: plan.color }}>✓</span> {feature}
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={upgrading || plan.id === currentPlan || pendingRequest != null}
                                className="btn-secondary"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    background: plan.id === currentPlan ? 'var(--bg-secondary)' : plan.color,
                                    color: plan.id === currentPlan ? 'var(--text-secondary)' : '#fff',
                                    border: 'none',
                                    opacity: (upgrading || pendingRequest) ? 0.7 : 1,
                                    fontWeight: 'bold'
                                }}
                            >
                                {plan.id === currentPlan ? 'Current Plan' : pendingRequest?.requestedPlan === plan.id ? 'Approval Pending' : pendingRequest ? 'Upgrade Pending...' : upgrading ? 'Requesting...' : `Request ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Billing;
