"use strict";
// const AWS = require('aws-sdk')
// const mysql = require('mysql')

Object.defineProperty(exports, "__esModule", { value: true });
exports.dbCon = void 0;
require('dotenv').config({ path: './.env' });
const mysqlconn = require('mysql2');
exports.dbCon = mysqlconn.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 100
});
exports.default = {
    dbCon: exports.dbCon
};
