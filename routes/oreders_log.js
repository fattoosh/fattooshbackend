// Module Imports
const express = require('express');
const _ = require('lodash');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateEmployee = require('../middleware/authenticateEmployee');
const authenticateUser = require('../middleware/authenticateUser');

// Vriables Definitions
const router = express.Router();

const location = 'Orders Log';

// Routes
router.get('/', authenticateEmployee('guest'), (req, res) => {
    const route = 'GET /';
    const query = `
        SELECT O.id, O.phone_number, O.state, O.order_date, O.location, O.longitude, O.latitude, O.total_price AS total, U.first_name, U.last_name, O.delivery_person_id
        FROM orders AS O JOIN users AS U on O.user_id=U.id
        WHERE O.state='delivered'
        ORDER BY O.order_date DESC
    `;
    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('orders_log', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('orders_log', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.get('/users/:language/:order_id', authenticateUser, (req, res) => {
    const language = req.params.language;
    let name_en_alias;
    let name_ar_alias;

    if (language === 'en') {
        name_en_alias = 'name';
        name_ar_alias = 'name_ar';
    } else if (language === 'ar') {
        name_en_alias = 'name_en';
        name_ar_alias = 'name';
    }

    const route = 'GET /users/:language/:order_id';
    const query = `
        SELECT P.id, P.name_en AS '${name_en_alias}', P.name_ar AS '${name_ar_alias}', P.image, P.price, O.quantity
        FROM orders_log AS O JOIN  products AS P ON O.product_id = P.id
        WHERE O.order_id=${req.params.order_id}
    `;
    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('orders_log', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('orders_log', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.get('/employees/:order_id', authenticateEmployee('guest'), (req, res) => {
    const route = 'GET /employees/:order_id';
    const queryProducts = `
        SELECT P.id, P.name_en AS name, P.name_ar AS name_ar, P.image, P.price, O.quantity, O.rejected
        FROM orders_log AS O JOIN  products AS P ON O.product_id = P.id
        WHERE O.order_id=${req.params.order_id}
    `;
    Query(res, location, route, queryProducts, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('orders_log', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('orders_log', `${location} => ${route}`));
        }
        let totalQuantity = 0;
        _.map(result, item => {
            totalQuantity += item.quantity;
        });
        return res.status(200).send({ totalQuantity, orders: result });
    });
});

router.post('/reject', authenticateEmployee('guest'), (req, res) => {
    const productID = req.body.product_id;
    const orderID = req.body.order_id;
    const quantity = req.body.quantity;
    const price = req.body.price;

    const route = 'POST /reject';
    const query = `
        UPDATE orders_log 
        SET rejected=${quantity}, quantity=quantity - ${quantity}
        WHERE order_id=${orderID} AND product_id=${productID}
    `;

    Query(res, location, route, query, () => {
        // eslint-disable-next-line no-shadow
        const query = `
            UPDATE orders
            SET total_price=total_price - ${quantity * price}
            WHERE id=${orderID}
        `;

        Query(res, location, route, query, () => {
            // eslint-disable-next-line no-shadow
            const query = ` 
                UPDATE products 
                SET instock=instock+${quantity}
                WHERE id=${productID}
            `;

            Query(res, location, route, query, () => {
                res.status(200).send();
            });
        });
    });
});
// Module Export
module.exports = router;
