const crypto = require('crypto');
const Webhook = require('../models/Webhook');

/**
 * Trigger webhooks for a specific event within a tenant context.
 * Fire and forget — should not be awaited in route handlers.
 * 
 * @param {string} tenantId 
 * @param {string} eventName 
 * @param {object} data 
 */
const trigger = (tenantId, eventName, data) => {
    // Fire and forget (async IIFE)
    (async () => {
        try {
            const webhooks = await Webhook.find({
                tenant_id: tenantId,
                isActive: true,
                events: eventName
            });

            if (webhooks.length === 0) return;

            const payload = {
                event: eventName,
                tenantId: tenantId,
                timestamp: new Date().toISOString(),
                data: data
            };

            const bodyStr = JSON.stringify(payload);

            const results = await Promise.all(webhooks.map(async (hook) => {
                try {
                    // Create signature: HMAC-SHA256 of payload body using hook.secret
                    const hmac = crypto.createHmac('sha256', hook.secret)
                                       .update(bodyStr)
                                       .digest('hex');

                    const response = await fetch(hook.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-SkyGate-Event': eventName,
                            'X-SkyGate-Signature': `sha256=${hmac}`
                        },
                        body: bodyStr,
                        signal: AbortSignal.timeout(5000) // 5s timeout
                    });

                    if (response.ok) {
                        await Webhook.updateOne(
                            { _id: hook._id },
                            { $set: { lastTriggeredAt: new Date(), failureCount: 0 } }
                        );
                    } else {
                        throw new Error(`HTTP Error: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`[Webhook Service] Failure for hook ${hook._id}:`, error.message);
                    
                    const newFailCount = (hook.failureCount || 0) + 1;
                    const update = { $set: { failureCount: newFailCount } };
                    
                    if (newFailCount >= 5) {
                        update.$set.isActive = false;
                        console.warn(`[Webhook Service] Disabling hook ${hook._id} after 5 failures.`);
                    }

                    await Webhook.updateOne({ _id: hook._id }, update);
                }
            }));
        } catch (globalError) {
            console.error('[Webhook Service] Global Dispatch Failure:', globalError.message);
        }
    })().catch(err => console.error('[Webhook Service] Unhandled Promise Rejection:', err));
};

module.exports = { trigger };
