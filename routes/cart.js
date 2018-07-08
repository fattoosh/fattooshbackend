// Module Imports
const express = require('express');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateUser = require('../middleware/authenticateUser');

// Variable Definitions
const router = express.Router();
const location = 'Cart';

router.get('/:language', authenticateUser, (req, res) => {
    const userID = req.body.user_id;

    const language = req.params.language;

    let name_en_alias;
    let name_ar_alias;
    let description_en_alias;
    let description_ar_alias;

    if (language === 'en') {
        // name = 'name_en';
        name_en_alias = 'name';
        name_ar_alias = 'name_ar';
        description_en_alias = 'description';
        description_ar_alias = 'description_ar';
    } else if (language === 'ar') {
        // name = 'name_ar';
        name_en_alias = 'name_en';
        name_ar_alias = 'name';
        description_en_alias = 'description';
        description_ar_alias = 'description_ar';
    }

    const route = 'GET /';
    const query = `
    SELECT p.id,
                p.name_en AS ${name_en_alias}, 
                p.name_ar AS ${name_ar_alias}, 
                p.description_en AS ${description_en_alias},
                p.description_ar AS ${description_ar_alias}, 
                p.image, 
                p.price, 
                p.instock,
                c.quantity 
    FROM cart AS c JOIN products AS p ON p.id = c.product_id  
    WHERE c.user_id=${userID};
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('cart products', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('cart products', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.post('/', authenticateUser, (req, res) => {
    const productID = req.body.id;
    const quantity = req.body.quantity;

    const userID = req.body.user_id;

    const route = 'POST /';
    const query = `
        INSERT INTO cart
        (user_id, product_id, quantity)
        values
        (${userID}, ${productID}, ${quantity});
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

router.delete('/', authenticateUser, (req, res) => {
    const productID = req.body.product_id;
    const userID = req.body.user_id;

    const route = 'DELETE /';
    const query = `
        DELETE FROM cart 
        WHERE user_id=${userID} AND product_id=${productID};
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

router.patch('/change_product_quantity/', authenticateUser, (req, res) => {
    const userID = req.body.user_id;
    const productID = req.body.id;
    const quantity = req.body.quantity;

    const route = 'PATCH /change_product_quantity';
    const query = `
        UPDATE cart 
        SET quantity=${quantity} 
        WHERE user_id=${userID} AND product_id=${productID};
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

// Module Export
module.exports = router;
