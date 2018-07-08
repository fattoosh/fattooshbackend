const mysql = require('mysql');

//Pool config variables
const host = process.env.JAWSDB_URL;
const user = process.env.JAWSDB_USER;
const password = process.env.JAWSDB_PASSWORD;
const database = process.env.JAWSDB;

const pool = mysql.createPool({
host,
user,
password,
database,
connectionLimit: 10
});

module.exports = pool;
