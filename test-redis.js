const Redis = require('ioredis');
const redis = new Redis({
    host: 'localhost',
    port: 6379,
    retryStrategy: null,
    connectTimeout: 2000
});

redis.on('error', (err) => {
    console.log('Redis Error:', err.message);
    process.exit(1);
});

redis.ping().then((res) => {
    console.log('Redis Ping Result:', res);
    process.exit(0);
}).catch((err) => {
    console.log('Redis Catch Error:', err.message);
    process.exit(1);
});
