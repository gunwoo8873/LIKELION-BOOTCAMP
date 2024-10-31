const mysql = require('mysql2');
let mysqldb;

const setup = async () => {
    if (mysqldb) {
        return { mysqldb };
    }

    try {
        mysqldb = mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            database: process.env.MYSQL_DATABASE,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
        });
        mysqldb.connect();
        // console.log("MySQL 접속 성공.");

        return { mysqldb };
    } catch (err) {
        console.error("DB 접속 실패.", err);
        throw err;
    }
};


module.exports = { setup };