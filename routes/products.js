// Module Imports
const express = require('express');
const _ = require('lodash');
const AWS = require('aws-sdk');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query');
const authenticateEmployee = require('../middleware/authenticateEmployee');
// Vriables Definitions
const router = express.Router();

const location = 'Products';

// Routes
router.use('/photos', express.static(__dirname.replace('/routes', '/photos/products')));

router.get('/:language', (req, res) => {
    const language = req.params.language;
    let results = {};
    let name_en_alias;
    let name_ar_alias;
    let description_en_alias;
    let description_ar_alias;
    let name;

    if (language === 'en') {
        name = 'name_en';
        name_en_alias = 'name';
        name_ar_alias = 'name_ar';
        description_en_alias = 'description';
        description_ar_alias = 'description_ar';
    } else if (language === 'ar') {
        name = 'name_ar';
        name_en_alias = 'name_en';
        name_ar_alias = 'name';
        description_en_alias = 'description_en';
        description_ar_alias = 'description';
    }

    Query(res, location, 'Categories', 'SELECT * FROM categories', rows => {
        const route = 'Get /';
        _.map(rows, category => {
            results = { ...results, [category[name]]: [] };
        });

        const query = `
                                        SELECT 
                                            id, 
                                            name_en AS ${name_en_alias}, 
                                            name_ar AS ${name_ar_alias},
                                            description_en AS ${description_en_alias},
                                            description_ar AS ${description_ar_alias},
                                            image,
                                            price,
                                            instock,
                                            min,
                                            category_id
                                        FROM products 
                                        WHERE instock > 0
                    `;
        //  WHERE category_id = ${rows[i].id} AND instock > 0
        Query(res, location, route, query, result => {
            if (result.length === 0) {
                console.log(errors.not_found_err(`products in ${rows[i].name}`,
                    `${location} => ${route}`));
            }

            _.map(result, product => {
                const category = _.filter(rows, item => item.id === product.category_id)[0];
                results[category[name]].push(product);
            });
            res.status(200).send(results);
        });
    });
});

router.get('/', authenticateEmployee('guest'), (req, res) => {
    let results = {};
    let name_en_alias;
    let name_ar_alias;
    let description_en_alias;
    let description_ar_alias;
    const name = 'name_en';

    Query(res, location, 'Categories', 'SELECT * FROM categories', rows => {
        const route = 'Get /';
        _.map(rows, category => {
            results = { ...results, [category[name]]: [] };
        });

        const query = `
                                        SELECT 
                                            id, 
                                            name_en AS name, 
                                            name_ar,
                                            description_en AS description,
                                            description_ar AS description_ar,
                                            image,
                                            price,
                                            instock,
                                            min,
                                            category_id
                                        FROM products 
                    `;
        //  WHERE category_id = ${rows[i].id} AND instock > 0
        Query(res, location, route, query, result => {
            if (result.length === 0) {
                console.log(errors.not_found_err(`products in ${rows[i].name}`,
                    `${location} => ${route}`));
            }

            _.map(result, product => {
                const category = _.filter(rows, item => item.id === product.category_id)[0];
                results[category[name]].push(product);
            });
            res.status(200).send(results);
        });
    });
});

router.post('/', authenticateEmployee('admin'), (req, res) => {
    const file = req.file;
    const name_en = req.body.name_en;
    const name_ar = req.body.name_ar;
    const description_en = req.body.description_en;
    const description_ar = req.body.description_ar;
    const image = Date.now() + file.originalname;
    const price = req.body.price;
    const instock = req.body.instock;
    const min = req.body.min;
    const category_id = req.body.category_id;


    const s3bucket = new AWS.S3({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    });

    const params = {
        Bucket: 'drhilo',
        Key: image,
        Body: file.buffer
    };
    s3bucket.upload(params, (err, data) => {
        if (err) {
            console.log('error: ', err);
            return res.status(500).send();
        }
        
        const route = 'POST /';
        const query = `
            INSERT INTO products
            (name_en, name_ar, description_en, description_ar, image, price, instock, min, category_id)
            VALUES 
            (
                '${name_en}',
                '${name_ar}',
                '${description_en}',
                '${description_ar}',
                '${data.Location}',
                ${price},
                ${instock},
                ${min},
                ${category_id}
            )
    `;

        Query(res, location, route, query, result => {
            res.status(200).send({
                id: result.insertId,
                name_en,
                name_ar,
                description_en,
                description_ar,
                image,
                price,
                instock,
                min,
                category_id
            });
        });
    });
});

router.post('/edit', authenticateEmployee('admin'), (req, res) => {
    const productID = req.body.product_id;
    const file = req.file;

    if (file) {
        req.body.image = Date.now() + file.originalname;
    }
    delete req.body.employee_id;
    delete req.body.product_id;
    delete req.body.type;

    const route = 'POST /edit';
    let query = 'UPDATE products SET ';

    console.log('req.body, ', req.body);
    let promise;
    _.mapKeys(req.body, (data, key) => {
        console.log('key: ', key);
        if (key === 'image') {
            console.log('BBBBBOOOOOOMMMM')
            const image = req.body.image;

            const s3bucket = new AWS.S3({
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY
            });

            const params = {
                Bucket: 'drhilo',
                Key: image,
                Body: file.buffer
            };
            promise = new Promise(resolve => {
                s3bucket.upload(params, (err, res) => {
                    if (err) {
                        console.log('error: ', err);
                        return res.status(500).send('batta');
                    }

                    query += `${key}='${res.Location}', `
                    resolve();
                });
            });
        } else {
            if (typeof data === 'number') {
                query += `${key}=${data}, `;
            } else {
                query += `${key}='${data}', `;
            }
        }
    });
    if (promise) {
        promise.then(() => {
            query = _.trimEnd(query, ', ');
            query += ` WHERE id=${productID}`;

            console.log(query);

            Query(res, location, route, query, () => {
                res.status(200).send();
            });
        })
    } else {
        query = _.trimEnd(query, ', ');
        query += ` WHERE id=${productID}`;

        console.log(query);

        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    }
});

// Module Export
module.exports = router;
