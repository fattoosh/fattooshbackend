// Module Imports
const express = require('express');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateEmployee = require('../middleware/authenticateEmployee');

// Variable Definitions
const router = express.Router();
const location = 'Notifications';


// Routes
router.get('/', authenticateEmployee('guest'), (req, res) => {
    const route = 'Get /';
    const query = `
                SELECT P.name_en AS product_name, N.id, N.username, N.current_stock, N.dismissed
                FROM notifications AS N JOIN products AS P on N.product_id=P.id
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('notifications', `${location} => ${route}`));
            return res.status(404)
                            .send(errors.not_found_err('notifications', `${location} => ${route}`));
        }

        res.status(200).send(result);
    });
});

router.post('/dismiss', authenticateEmployee('guest'), (req, res) => {
    const notificationID = req.body.id;
    const username = req.body.username;

    const route = 'POST /dismiss';
    const query = `
            UPDATE notifications 
            SET dismissed=1, username='${username}' 
            WHERE id=${notificationID}
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});
// Module Export
module.exports = router;
