// Module Imports
const express = require('express');
const _ = require('lodash');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const generateAndAssignToken = require('../middleware/generateAndAssignToken');
const generateTokenHash = require('../middleware/generateTokenHash');
const generatePasswordHash = require('../middleware/generatePasswordHash');
const verifyPasswordHash = require('../middleware/verifyPasswordHash');
const authenticateUser = require('../middleware/authenticateUser');
const authenticateEmployee = require('../middleware/authenticateEmployee');

// Vriables Definitions
const router = express.Router();
const location = 'Users';

// Routes
router.use('/photos', express.static(__dirname.replace('/routes', `/photos/${location}`)));

router.post('/', (req, res) => {
    generatePasswordHash(req.body.password).then(password => {
        const phone_number = req.body.phone_number;
        const first_name = req.body.first_name;
        const last_name = req.body.last_name;
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;

        const route = 'POST /';
        const query = `INSERT INTO users 
                        (phone_number, first_name, last_name, latitude, longitude, password) 
                        values (
                            '${phone_number}', 
                            '${first_name}', 
                            '${last_name}', 
                            ${latitude}, 
                            ${longitude},
                            '${password}'
    )`;

        Query(res, location, route, query, result => {
            new Promise((resolve) => {
                generateAndAssignToken(result.insertId, res, 'users', (token) => {
                    resolve(token);
                });
            }).then((token) => (res.header('x-auth', token).status(200).send({
                id: result.insertId,
                phone_number,
                first_name,
                last_name,
                longitude,
                latitude
            })));
        });
    });
});

router.post('/login', (req, res) => {
    const phone_number = req.body.phone_number;
    const password = req.body.password;

    const route = 'POST /login';
    const query = `SELECT id, password 
                           FROM users 
                           WHERE phone_number='${phone_number}'
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('user', `${location} => ${route}`));
            return res.status(602)
                .send(errors.not_found_err('user', `${location} => ${route}`));
        }

        verifyPasswordHash(result[0].password, password).then(isPasswordCorrect => {
            if (isPasswordCorrect) {
                generateAndAssignToken(result[0].id, res, 'users', (token) => {
                    getUser(res, result[0].id, (user) => res
                        .header('x-auth', token).status(200).send(user)
                    );
                });
            } else {
                console.log(errors.wrong_password_err(`${location} => ${route}`));
                return res.status(601)
                    .send({ error: errors.wrong_password_err(`${location} => ${route}`) });
            }
        });
    });
});

router.patch('/logout', (req, res) => {
    const token = req.header('x-auth');
    const hashedToken = generateTokenHash(token);

    const route = 'PATCH /logout';
    const query = `
            UPDATE users SET token='' WHERE token='${hashedToken}'
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

router.get('/', authenticateEmployee('admin'), (req, res) => {
    const route = 'GET /';
    const query = 'SELECT * FROM users;';

    Query(res, location, route, query, result => {
            if (result.length === 0) {
                console.log(errors.not_found_err('users', `${location} => ${route}`));
                return res
                    .status(404)
                    .send(errors.not_found_err('users', `${location} => ${route}`));
            }
            
            return res.status(200).send(result);
    });
});

router.post('/edit', authenticateEmployee('admin'), async (req, res) => {
    console.log('yie');
    console.log(req.body)
    const userID = req.body.user_id;

    delete req.body.employee_id;
    delete req.body.user_id;

    const route = 'POST /edit';
    let query = 'UPDATE users SET ';

    const promises = [];

    await _.mapKeys(req.body, (data, key) => {
        console.log(key, data);
        promises.push(new Promise(async resolve => {
            if (typeof data === 'number') {
                query += `${key}=${data}, `;
                resolve();
            } else {
                let value = data;
                if (key === 'password') {
                    value = await generatePasswordHash(data);
                    console.log(value);
                }
                query += `${key}='${value}', `;
                resolve();
            }
        }));
    });
    
    Promise.all(promises).then(() => {
        query = _.trimEnd(query, ', ');
        query += ` WHERE id=${userID}`;
    
        console.log(query);
        
        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    });
});

router.get('/:user_id', authenticateEmployee('admin'), (req, res) => {
    const userID = req.params.user_id;

    getUser(res, userID, user => {
        res.status(200).send(user);
    });
});

router.post('/settings', authenticateUser, async (req, res) => {
    const field = req.body.field;
    let value = req.body.value;
    const userID = req.body.user_id;

    const route = 'POST /settings';
    let query;

    if (field === 'password') {
        value = await generatePasswordHash(value);
    }

    if (typeof value === 'string') {
        query = `UPDATE users SET ${field}='${value}' WHERE id=${userID}`;
        console.log('string');
    } else {
        query = `UPDATE users SET ${field}=${value} WHERE id=${userID}`;
        console.log('number');
    }

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

// Helper Functions
const getUser = (res, id, callback) => {
    const route = 'getUser()';
    const query = `SELECT 
                                id, 
                                phone_number, 
                                first_name, 
                                last_name, 
                                latitude, 
                                longitude
                           FROM users 
                           WHERE id=${id}`;

    Query(res, location, route, query, result => {
        callback(result[0]);
    });
};

// Module Export
module.exports = router;
