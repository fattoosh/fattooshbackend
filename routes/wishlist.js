// Module Imports
const express = require('express');
const jwt = require('jsonwebtoken');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateUser = require('../middleware/authenticateUser');

// Variable Definitions
const router = express.Router();
const location = 'Wishlist';

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
                description_en AS ${description_en_alias},
                description_ar AS ${description_ar_alias}, 
                p.image, 
                p.price, 
                p.instock 
    FROM wishlist AS w JOIN products AS p ON p.id = w.product_id  
    WHERE w.user_id=${userID};
    `;

    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('wishlist products', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('wishlist products', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

router.post('/', authenticateUser, (req, res) => {
    const productID = req.body.id;
    
    const userID = req.body.user_id;

    const route = 'POST /';
    const query = `
        INSERT INTO wishlist
        (user_id, product_id)
        values
        (${userID}, ${productID});
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
        DELETE FROM wishlist 
        WHERE user_id=${userID} AND product_id=${productID};
    `;

    Query(res, location, route, query, () => {
        res.status(200).send();
    });
});

// Module Export
module.exports = router;
