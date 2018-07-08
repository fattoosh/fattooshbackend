// Module Imports
const express = require('express');
const _ = require('lodash');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateEmployee = require('../middleware/authenticateEmployee');
const authenticateUser = require('../middleware/authenticateUser');
const authenticateDeliveryPerson = require('../middleware/authenticateDeliveryPerson');

// Vriables Definitions
const router = express.Router();

const location = 'Orders';

// Routes
router.get('/', authenticateEmployee('guest'), (req, res) => {
    const route = 'GET /';
    const query = `
        SELECT O.id, O.phone_number, O.state, O.order_date, O.location, O.longitude, O.latitude, O.total_price AS total, U.first_name, U.last_name
        FROM orders AS O JOIN users AS U on O.user_id=U.id
        WHERE O.state!='delivered'
        ORDER BY O.id DESC
    `;
    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('orders', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('orders', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.get('/userOrders/:language', authenticateUser, (req, res) => {
    const language = req.params.language;
    let delivery_person_name_en_alias;
    let delivery_person_name_ar_alias;

    if (language === 'en') {
        delivery_person_name_en_alias = 'delivery_person_name';
        delivery_person_name_ar_alias = 'delivery_person_name_ar';
    } else if (language === 'ar') {
        delivery_person_name_en_alias = 'delivery_person_name_en';
        delivery_person_name_ar_alias = 'delivery_person_name';
    }

    const route = 'GET /userOrders';
    const query = `
        SELECT O.id, 
                     CONCAT(D.first_name_en, ' ', D.last_name_en) AS ${delivery_person_name_en_alias}, 
                     CONCAT(D.first_name_ar, ' ', D.last_name_ar) AS ${delivery_person_name_ar_alias}, 
                     D.phone_number,
                     O.order_date, 
                     O.total_price, 
                     O.state 
        FROM orders AS O JOIN delivery_persons AS D 
                    ON O.delivery_person_id = D.id
        WHERE user_id=${req.body.user_id}
        ORDER BY O.order_date DESC
    `;
    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('user orders', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('user orders', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.post('/checkout', authenticateUser, (req, res) => {
    const userID = req.body.user_id;
    const total = req.body.total;
    const cart = req.body.cart;
    const phoneNumer = req.body.phone_number;
    const longitude = req.body.longitude;
    const latitude = req.body.latitude;

    console.log(total, cart);
    const route = 'POST /checkout';
    const queryOrders = `
        INSERT INTO orders
        (user_id, total_price, phone_number, longitude, latitude, delivery_person_id)
        VALUES
        (${userID}, ${total}, '${phoneNumer}', ${longitude}, ${latitude}, 1);
    `;

    Query(res, location, route, queryOrders, result => {
        const orderID = result.insertId;
        let queryOrderProducts = `INSERT INTO order_products 
                        VALUES (${orderID}, ${cart[0].id}, ${cart[0].quantity})
        `;

        for (let i = 1; i < cart.length; i++) {
            queryOrderProducts =
                queryOrderProducts
                    .concat(', ', `(${orderID}, ${cart[i].id}, ${cart[i].quantity})`);
        }

        Query(res, location, route, queryOrderProducts, () => {
            const queryDeleteCart = `
                DELETE FROM cart where user_id=${userID};
            `;
            Query(res, location, route, queryDeleteCart, () => {
                const promises = [];
                _.map(cart, product => {
                    const query = `
                        UPDATE products 
                        SET instock=instock-${product.quantity}
                        WHERE id=${product.id}
                    `;
                    promises.push(new Promise(resolve => {
                        Query(res, location, route, query, () => {
                            const fetchProductQuery = `
                                SELECT instock, min FROM products WHERE id=${product.id}
                            `;

                            Query(res, location, route, fetchProductQuery, details => {
                                const { instock, min } = details[0];
                                if (instock < min) {
                                    const notificationQuery = ` 
                                        INSERT INTO notifications
                                        (product_id, current_stock)
                                        VALUES
                                        (${product.id}, ${product.instock - product.quantity});
                                    `;
    
                                    Query(res, location, route, notificationQuery, () => {
                                        resolve();
                                    });
                                } else {
                                resolve();
                                }
                            });
                        });
                    }));
                });

                Promise.all(promises).then(() => {
                    res.status(200).send({ order_id: orderID });
                });
            });
        });
    });
});

router.post('/state', authenticateEmployee('guest'), (req, res) => {
    const orderID = req.body.id;
    const state = req.body.state;

    const route = 'POST /state';
    if (state === 'packaging') {
        const query = `
            UPDATE orders 
            SET state="${state}"
            WHERE id=${orderID}
        `;
        Query(res, location, route, query, () => (
            res.status(200).send()
        ));
    } else if (state === 'onRoad') {
        const order_location = req.body.location;
        const delivery_person_id = req.body.delivery_person_id;
        const query = `
            UPDATE orders 
            SET state="${state}" , delivery_person_id=${delivery_person_id}, location='${order_location}'
            WHERE id=${orderID}
        `;
        Query(res, location, route, query, () => (
            res.status(200).send()
        ));
    } else if (state === 'delivered') {
        const query = `
            UPDATE orders 
            SET state="${state}"
            WHERE id=${orderID}
        `;

        Query(res, location, route, query, () => {
            const querySelect = `
            SELECT * FROM orders
            JOIN order_products ON order_id = id
            WHERE id=${orderID}`;

            Query(res, location, route, querySelect, result => {
                const {
                    delivery_person_id,
                    order_date,
                    product_id,
                    user_id,
                    quantity,
                    phone_number,
                    longitude,
                    latitude
                } = result[0];
                let date = _.replace(_.replace(order_date.toISOString(), 'T', ' '), '.000Z', '');

                const queryDelete = `
                DELETE FROM order_products
                WHERE order_id=${orderID};
            `;

                Query(res, location, route, queryDelete, () => {
                    let queryInsert = `
                    INSERT INTO orders_log
                    (user_id, order_id, product_id, order_date, delivery_person_id, quantity, phone_number, longitude, latitude)
                    VALUES 
                        (${user_id}, 
                        ${orderID}, 
                        ${product_id}, 
                        '${date}', 
                        ${delivery_person_id}, 
                        ${quantity},
                        '${phone_number}',
                        ${longitude},
                        ${latitude}
                    )`;
                    for (let i = 1; i < result.length; i++) {
                        date = _.replace(_.replace(result[i].order_date.toISOString(), 'T', ' '), '.000Z', '');
                        queryInsert = queryInsert.concat(', ', `(
                        ${result[i].user_id}, 
                        ${orderID}, 
                        ${result[i].product_id}, 
                        '${date}', 
                        ${result[i].delivery_person_id}, 
                        ${result[i].quantity},
                        '${result[i].phone_number}',
                        ${result[i].longitude},
                        ${result[i].latitude}
                    )`);
                    }
                    console.log(queryInsert);
                    Query(res, location, route, queryInsert, () => {
                        res.status(200).send();
                    });
                });
            });
        });
    }
});

router.post('/cancel', authenticateEmployee('guest'), (req, res) => {
    const id = req.body.id;

    const route = 'POST /cancelOrder';
    const query = `
        DELETE FROM orders WHERE id=${id};
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
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

    const route = 'GET /:order_id';
    const query = `
        SELECT P.id, P.name_en AS '${name_en_alias}', P.name_ar AS '${name_ar_alias}', P.image, P.price, O.quantity
        FROM order_products AS O JOIN  products AS P ON O.product_id = P.id
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

router.get('/deliveryPersonOrders', authenticateDeliveryPerson, (req, res) => {
    const delivery_person_id = req.body.delivery_person_id;
    console.log(req.header('x-auth'));
    const route = 'GET => /deliveryPersonOrders';
    const query = `
        SELECT O.id, O.total_price, O.location, O.order_date, O.longitude, O.latitude, O.phone_number, U.first_name
        FROM orders AS O JOIN users AS U on O.user_id=U.id
        WHERE O.delivery_person_id=${delivery_person_id} AND O.state!='delivered'
        ORDER BY O.order_date DESC
    `;

    Query(res, location, route, query, result => {
        res.status(200).send(result);
    });
});

router.get('/:order_id', authenticateDeliveryPerson, (req, res) => {
    const route = 'GET /:order_id';
    const query = `
        SELECT P.id, P.name_ar AS name, P.image, P.price, O.quantity
        FROM order_products AS O JOIN  products AS P ON O.product_id = P.id
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

router.post('/delivered', authenticateDeliveryPerson, (req, res) => {
    const orderID = req.body.id;
    console.log('id: ', orderID);
    const route = 'POST /delivered';
    const query = `
            UPDATE orders 
            SET state="delivered"
            WHERE id=${orderID}
        `;

    Query(res, location, route, query, () => {
        const querySelect = `
            SELECT * FROM orders
            JOIN order_products ON order_id = id
            WHERE id=${orderID}`;

        Query(res, location, route, querySelect, result => {
            const {
                delivery_person_id,
                order_date,
                product_id,
                user_id,
                quantity,
                phone_number,
                longitude,
                latitude
            } = result[0];
            let date = _.replace(_.replace(order_date.toISOString(), 'T', ' '), '.000Z', '');

            const queryDelete = `
                DELETE FROM order_products
                WHERE order_id=${orderID};
            `;

            Query(res, location, route, queryDelete, () => {
                let queryInsert = `
                    INSERT INTO orders_log
                    (user_id, order_id, product_id, order_date, delivery_person_id, quantity, phone_number, longitude, latitude)
                    VALUES 
                        (${user_id}, 
                        ${orderID}, 
                        ${product_id}, 
                        '${date}', 
                        ${delivery_person_id}, 
                        ${quantity},
                        '${phone_number}',
                        ${longitude},
                        ${latitude}
                    )`;
                for (let i = 1; i < result.length; i++) {
                    date = _.replace(_.replace(result[i].order_date.toISOString(), 'T', ' '), '.000Z', '');
                    queryInsert = queryInsert.concat(', ', `(
                        ${result[i].user_id}, 
                        ${orderID}, 
                        ${result[i].product_id}, 
                        '${date}', 
                        ${result[i].delivery_person_id}, 
                        ${result[i].quantity},
                        '${result[i].phone_number}',
                        ${result[i].longitude},
                        ${result[i].latitude}
                    )`);
                }
                console.log(queryInsert);
                Query(res, location, route, queryInsert, () => {
                    res.status(200).send();
                });
            });
        });
    });
});

router.get('/employees/:order_id', authenticateEmployee('guest'), (req, res) => {
    const route = 'GET /employees';
    const query = `
        SELECT P.id, P.name_en AS name, P.image, P.price, O.quantity
        FROM order_products AS O JOIN  products AS P ON O.product_id = P.id
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

// Module Export
module.exports = router;
