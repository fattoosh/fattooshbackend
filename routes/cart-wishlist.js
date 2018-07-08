// Module Imports
const express = require('express');
// const jwt = require('jsonwebtoken');
const _ = require('lodash');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateUser = require('../middleware/authenticateUser');

// Vriables Definitions
const router = express.Router();

const location = 'CartWishList';

// Routes

router.get('/:language', authenticateUser, (req, res) => {
    const language = req.params.language;
    console.log('header: ', req.header('x-auth'));

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

    const userID = req.body.user_id;

    const route = 'Get /';
    const queryCart = `
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
    const queryWishList = `
                SELECT p.id,
                            p.name_en AS ${name_en_alias}, 
                            p.name_ar AS ${name_ar_alias}, 
                            p.description_en AS ${description_en_alias},
                            p.description_ar AS ${description_ar_alias}, 
                            p.image, 
                            p.price, 
                            p.instock 
                FROM wishlist AS w JOIN products AS p ON p.id = w.product_id  
                WHERE w.user_id=${userID};
                `;
    Query(res, location, route, queryCart, resultCart => {
        if (resultCart.length === 0) {
            console.log(errors.not_found_err('cart products', `${location} => ${route}`));
        }

        Query(res, location, route, queryWishList, resultWishList => {
            if (resultWishList.length === 0) {
                console.log(errors.not_found_err('wish list products', `${location} => ${route}`));
            }
            res.status(200).send({
                cart: resultCart,
                wishlist: resultWishList
            });
        });
    });
});

router.post('/', authenticateUser, (req, res) => {
    const userID = req.body.user_id;
    const cart = req.body.cart;
    const wishlist = req.body.wishlist;
    console.log('cart: ', cart);
    console.log('wishlist: ', wishlist);
    const route = 'POST /';

    const promises = [];
    if (cart.length > 0) {
        promises.push(new Promise((resolve) => {
            _.forEach(cart, product => {
                const cartQuery = `
            INSERT INTO cart 
            VALUES
            (${userID}, ${product.id}, ${product.quantity})
        `;

                Query(res, location, route, cartQuery, () => {
                    resolve();
                });
            });
        }));
    }
    if (wishlist.length > 0) {
        promises.push(new Promise((resolve) => {
            _.forEach(wishlist, product => {
                const wishlistQuery = `
            INSERT INTO wishlist 
            VALUES
            (${userID}, ${product.id})
        `;

                Query(res, location, route, wishlistQuery, () => {
                    resolve();
                });
            });
        }));
    }
    Promise.all(promises).then(() => {
        res.status(200).send();
    });
});

// Module Export
module.exports = router;
