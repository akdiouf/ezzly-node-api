require('dotenv').config({ path: './.env' });
const mysqlconn: any = require('mysql2');
export const dbCon = mysqlconn.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 100,
    multipleStatements: true
});

export default {
    dbCon
}