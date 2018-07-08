const errors = require('../dictionary/errors');
const pool = require('../config/db');

function TestQuery(location, query, callback) { 
    pool.getConnection((poolErr, conn) => {
        if (poolErr) {
            console.log(errors.conn_err(`${location}`), poolErr);
        }
        conn.query(query, (connErr, result) => {
            if (connErr) {
                console.log(errors.query_err(`${location}`), connErr);
            }
            conn.release();
            if (callback) {
                callback(result);
            }
        });
    });
}

module.exports = TestQuery;
