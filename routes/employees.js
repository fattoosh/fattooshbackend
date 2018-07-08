// Module Imports
const express = require('express');
const _ = require('lodash');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const generateAndAssignToken = require('../middleware/generateAndAssignToken');
const generatePasswordHash = require('../middleware/generatePasswordHash');
const verifyPasswordHash = require('../middleware/verifyPasswordHash');
const authenticateEmployee = require('../middleware/authenticateEmployee');
const generateTokenHash = require('../middleware/generateTokenHash');

// Vriables Definitions
const router = express.Router();
const location = 'Employees';

// Routes
router.use('/photos', express.static(__dirname.replace('/routes', `/photos/${location}`)));

router.post('/', authenticateEmployee('admin'), (req, res) => {
        generatePasswordHash(req.body.password).then(password => {
            const name = req.body.name;
            const privilege = req.body.privilege;

            const route = 'POST /';
            const query = `INSERT INTO employees 
                            (name, privilege, password) 
                            values (
                                '${name}', 
                                '${privilege}',
                                '${password}'
                            )`;

            Query(res, location, route, query, result => {
                new Promise((resolve) => {
                    generateAndAssignToken(result.insertId, res, 'employees', (token) => {
                        resolve(token);
                    });
                }).then((token) => (res.header('x-auth', token).status(200).send({
                    name,
                    privilege
                })));
            });
        });
});

router.post('/login', (req, res) => {
    const name = req.body.name;
    const password = req.body.password;

    const route = 'POST /login';
    const query = `SELECT id, password, disabled 
                           FROM employees 
                           WHERE name='${name}'
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('employee', `${location} => ${route}`));
            return res.status(404)
                .send(errors.not_found_err('employee', `${location} => ${route}`));
        }

        if (result[0].disabled) {
            return res.status(603)
            .send(errors.employee_disabled_err(`${location} => ${route}`));
        }

        verifyPasswordHash(result[0].password, password).then(isPasswordCorrect => {
            if (isPasswordCorrect) {
                generateAndAssignToken(result[0].id, res, 'employees', (token) => {
                    getEmployees(res, result[0].id, (employee) => res
                        .header('x-auth', token).status(200).send({ ...employee, token })
                    );
                });
            } else {
                console.log(errors.wrong_password_err(`${location} => ${route}`));
                return res.status(601)
                    .send(errors.wrong_password_err(`${location} => ${route}`));
            }
        });
    });
});


router.post('/logout', (req, res) => {
    const token = req.header('x-auth');
    const hashedToken = generateTokenHash(token);

    const route = 'POST /logout';
    const query = `
            UPDATE employees SET token='' WHERE token='${hashedToken}'
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

router.get('/', authenticateEmployee('admin'), (req, res) => {
    const route = 'GET /';
    const query = 'SELECT * FROM employees WHERE name!="Admin" && name!="Administrator";';

    Query(res, location, route, query, result => {
            if (result.length === 0) {
                console.log(errors.not_found_err('employees', `${location} => ${route}`));
                return res
                    .status(404)
                    .send(errors.not_found_err('employees', `${location} => ${route}`));
            }
            
            return res.status(200).send(result);
    });
});

router.post('/edit', authenticateEmployee('admin'), async (req, res) => {
    const employeeID = req.body.id;

    delete req.body.id;
    delete req.body.employee_id;

    const route = 'POST /edit';
    let query = 'UPDATE employees SET ';

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
        query += ` WHERE id=${employeeID}`;
    
        console.log(query);
        
        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    });
});

router.get('/:employee_id', authenticateEmployee('admin'), (req, res) => {
    const employeeID = req.params.employee_id;

    getEmployees(res, employeeID, employee => {
        res.status(200).send(employee);
    });
});

// Helper Functions
const getEmployees = (res, id, callback) => {
    const route = 'getEmployees()';
    const query = `SELECT 
                                id, 
                                name, 
                                privilege,
                                disabled
                           FROM employees 
                           WHERE id=${id}`;

    Query(res, location, route, query, result => {
        callback(result[0]);
    });
};
 
// Module Export
module.exports = router;
