const errors = require('../dictionary/errors');
const pool = require('../config/db');

function Query(res, location, route, query, callback) { 
    pool.getConnection((poolErr, conn) => {
        if (poolErr) {
            console.log(poolErr);
            console.log(errors.conn_err(`${location} => ${route}`));
            res.status(400).send(errors.conn_err(`${location} => ${route}`));
        }
        conn.query(query, (connErr, result) => {
            if (connErr) {
                console.log(connErr);
                console.log(errors.query_err(`${location} => ${route}`));
                res.status(400).send(errors.query_err(`${location} => ${route}`), connErr);
            }
            conn.release();

            callback(result);
        });
    });
}

module.exports = Query;
