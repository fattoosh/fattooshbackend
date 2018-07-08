// Module Imports
const jwt = require('jsonwebtoken');
const SHA512 = require('crypto-js').SHA512;

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');

// Variables Definitions
const location = 'Authenticate Delivery Person';

// Authentication Method
const authenticateDeliveryPerson = (req, res, next) => {
    const token = req.header('x-auth');
    const hashedToken = SHA512(token).toString();

    const route = '';
    const query = `SELECT * FROM delivery_persons WHERE token='${hashedToken}'`;

    Query(res, location, route, query, rows => {
        if (rows.length === 0) {
            console.log(errors.not_found_err('delivery person token', `${location} => GET /`));
            return res.status(602).send(errors.not_found_err('delivery person token', `${location}`));
        }

        jwt.verify(token, process.env.JWT_SECRET, (verifyErr, result) => {
            if (verifyErr) {
                if (verifyErr.message === 'jwt expired') {
                    console.log(errors.token_expired_err(location));
                    return res.status(600).send(errors.token_expired_err(location));
                }
                console.log(errors.token_verification_err(location, verifyErr.message));
                return res.status(400)
                    .send(errors.token_verification_err(location, verifyErr.message));
            }

            req.body.delivery_person_id = result.id; // eslint-disable-line no-param-reassign
            next();
        });
    });
};

// Module Export
module.exports = authenticateDeliveryPerson;
