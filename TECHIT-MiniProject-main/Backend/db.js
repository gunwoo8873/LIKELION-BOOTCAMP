require(`dotenv`).config();

const mysql_promise = require(`mysql2/promise`);
const mysql_callback = require(`mysql2`);

let db_promise;

const connect_promise = async () => {
    if (db_promise) return db_promise;

    try {
        db_promise = await mysql_promise.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'app',
        });

        console.log(`MySQL 연결 성공`);
        return db_promise;
    }
    catch (error) {
        console.error(`연결 오류`, error);
        throw error;
    }
};

let db_callback;
const connect_callback = () => {
    if (db_callback) return db_callback;

    db_callback = mysql_callback.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'app',
    });

    return db_callback;
};

module.exports = {
    connect_promise,
    connect_callback,
};