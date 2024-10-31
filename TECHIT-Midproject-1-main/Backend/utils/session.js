const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const dotenv = require('dotenv');
dotenv.config();

let redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

let attemptCount = 0;
let redis_connected = false; // 연결 상태를 추적하는 변수
console.log('Connecting to Redis...');

const connectWithRetry = () => {
    redisClient.connect().then(() => {
        console.log('Connected to Redis.');
        redis_connected = true; // 연결 성공 시 true로 설정
        attemptCount = 0; // 시도 횟수 초기화
    }).catch(err => {
        attemptCount++; // 시도 횟수 증가
        if (attemptCount % 5 === 0) {
            console.error('Could not connect to Redis after', attemptCount, 'attempts:', err);
        }
        redis_connected = false; // 연결 실패 시 false로 설정
    }).finally(() => {
        if (!redis_connected) {
            redisClient.disconnect();
            setTimeout(connectWithRetry, 5000); // 5초 후에 다시 시도
        }
    });
};

connectWithRetry();

const sessionConfig = session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.REDIS_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 3600
    }
});

module.exports = { sessionConfig };