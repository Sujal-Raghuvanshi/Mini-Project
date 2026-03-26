const Redis = require('ioredis');

let redisClient = null;

/**
 * Initialize Redis connection
 */
function createRedisClient() {
    if (redisClient) {
        return redisClient;
    }

    const redisConfig = process.env.REDIS_URL ? process.env.REDIS_URL : {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times) => {
            // Stop retrying after 3 attempts — Redis is optional
            if (times > 3) {
                console.warn('⚠ Redis unavailable after 3 attempts — running without Redis (rate limiting disabled).');
                return null; // Stop retrying
            }
            return Math.min(times * 500, 2000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false,
    };

    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
        console.log('✓ Redis connected');
    });

    redisClient.on('error', (err) => {
        console.error('Redis connection error:', err.message);
    });

    redisClient.on('close', () => {
        console.log('Redis connection closed');
    });

    return redisClient;
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
    if (!redisClient) {
        return createRedisClient();
    }
    return redisClient;
}

/**
 * Close Redis connection
 */
async function closeRedisClient() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis client closed');
    }
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
    try {
        const client = getRedisClient();
        // Use a race to timeout the ping if Redis is unresponsive
        const pingPromise = client.ping();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
        );

        await Promise.race([pingPromise, timeoutPromise]);
        return { status: 'healthy', message: 'Redis is responsive' };
    } catch (error) {
        return { status: 'unhealthy', message: error.message };
    }
}

module.exports = {
    createRedisClient,
    getRedisClient,
    closeRedisClient,
    checkRedisHealth,
};
