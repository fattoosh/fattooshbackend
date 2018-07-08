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
const authenticateEmployee = require('../middleware/authenticateEmployee');

// Vriables Definitions
const router = express.Router();
const location = 'Delivery Persons';

// Routes

router.get('/', authenticateEmployee('guest'), (req, res) => {
    const route = 'GET => /';
    const query = `
        SELECT id, first_name_en, last_name_en, first_name_ar, last_name_ar
        FROM delivery_persons WHERE disabled=0
    `;

    Query(res, location, route, query, result => {
        res.status(200).send(result);
    });
});

router.get('/all', authenticateEmployee('admin'), (req, res) => {
    const route = 'GET => /';
    const query = `
        SELECT id, first_name_en, last_name_en, first_name_ar, last_name_ar, phone_number, disabled
        FROM delivery_persons
        WHERE id != 1
    `;

    Query(res, location, route, query, result => {
        res.status(200).send(result);
    });
});

router.get('/:delivery_person_id', authenticateEmployee('guest'), (req, res) => {
    getDeliveryPerson(res, req.params.delivery_person_id, deliveryPerson => {
        res.status(200).send(deliveryPerson);
    });
});

router.post('/edit', authenticateEmployee('admin'), async (req, res) => {
    const deliveryPersonID = req.body.delivery_person_id;

    delete req.body.employee_id;
    delete req.body.delivery_person_id;

    const route = 'POST /edit';
    let query = 'UPDATE delivery_persons SET ';

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
        query += ` WHERE id=${deliveryPersonID}`;
    
        console.log(query);
        
        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    });
});

router.post('/', authenticateEmployee('admin'), (req, res) => {
    generatePasswordHash(req.body.password).then(password => {
        const phone_number = req.body.phone_number;
        const first_name_en = req.body.first_name_en;
        const last_name_en = req.body.last_name_en;
        const first_name_ar = req.body.first_name_ar;
        const last_name_ar = req.body.last_name_ar;

        const route = 'POST /';
        const query = `INSERT INTO delivery_persons 
                        (   
                            phone_number, 
                            first_name_en, 
                            last_name_en,
                            first_name_ar, 
                            last_name_ar,
                            password
                        ) 
                        values (
                            '${phone_number}', 
                            '${first_name_en}', 
                            '${last_name_en}',
                            '${first_name_ar}', 
                            '${last_name_ar}',
                            '${password}'
    )`;

        Query(res, location, route, query, result => {
            new Promise((resolve) => {
                generateAndAssignToken(result.insertId, res, 'delivery_persons', (token) => {
                    resolve(token);
                });
            }).then((token) => (res.header('x-auth', token).status(200).send({
                id: result.insertId,
                phone_number,
                first_name_en,
                last_name_en,
                first_name_ar,
                last_name_ar
            })));
        });
    });
});

router.post('/login', (req, res) => {
    const phone_number = req.body.phone_number;
    const password = req.body.password;

    const route = 'POST /login';
    const query = `SELECT id, password 
                           FROM delivery_persons 
                           WHERE phone_number='${phone_number}'
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('delivery person', `${location} => ${route}`));
            return res.status(602)
                .send(errors.not_found_err('delivery person', `${location} => ${route}`));
        }

        verifyPasswordHash(result[0].password, password).then(isPasswordCorrect => {
            if (isPasswordCorrect) {
                generateAndAssignToken(result[0].id, res, 'delivery_persons', (token) => {
                    getDeliveryPerson(res, result[0].id, (deliveryPerson) => res
                        .header('x-auth', token).status(200).send(deliveryPerson)
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
            UPDATE delivery_persons SET token='' WHERE token='${hashedToken}'
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

// Helper Functions
const getDeliveryPerson = (res, id, callback) => {
    const route = 'getDeliveryPerson()';
    const query = `SELECT 
                                id, 
                                phone_number, 
                                first_name_en, 
                                last_name_en,
                                first_name_ar, 
                                last_name_ar,
                                disabled 
                           FROM delivery_persons 
                           WHERE id=${id}`;

    Query(res, location, route, query, result => {
        callback(result[0]);
    });
};

// Module Export 
module.exports = router;
