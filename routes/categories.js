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

const location = 'Categories';

// Routes
router.use('/photos', express.static(__dirname.replace('/routes', '/photos/categories')));

router.get('/:language', (req, res) => {
    const language = req.params.language;
    let results = {};
    let name_en_alias;
    let name_ar_alias;

    if (language === 'en') {
        name = 'name_en';
        name_en_alias = 'name';
        name_ar_alias = 'name_ar';
    } else if (language === 'ar') {
        name = 'name_ar';
        name_en_alias = 'name_en';
        name_ar_alias = 'name';
    }

    Query(res, location, 'Brands', 'SELECT * FROM brands', rows => {
        const route = 'Get /';
        _.map(rows, brand => {
            results = { ...results, [brand.name]: [] };
        });

        const query = `
                        SELECT 
                        id, 
                        name_en AS ${name_en_alias}, 
                        name_ar AS ${name_ar_alias}, 
                        image,
                        brand_id 
                    FROM categories 
         `;

        Query(res, location, route, query, result => {
            if (result.length === 0) {
                console.log(errors.not_found_err(`categories in ${rows[0].name}`,
                    `${location} => ${route}`));
            }

            _.map(result, category => {
                const brand = _.filter(rows, item => item.id === category.brand_id)[0];
                results[brand.name].push(category);
            });
            res.status(200).send(results);
        });
    });
});

router.post('/', authenticateEmployee('admin'), (req, res) => {
    console.log('post');
    const file = req.file;
    const name_en = req.body.name_en;
    const name_ar = req.body.name_ar;
    const image = Date.now() + file.originalname;
    const brand_id = req.body.brand_id;

    console.log('%$#@!id: ', process.env.ACCESS_KEY_ID);
    console.log('%$#@!key: ', process.env.SECRET_ACCESS_KEY);

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
        const query = ` INSERT INTO categories
                                (name_en, name_ar, image, brand_id)
                                values
                                ('${name_en}', '${name_ar}',  '${data.Location}', ${brand_id})
        `;

        Query(res, location, route, query, result => {
            res.status(200).send({
                id: result.insertId,
                name_en,
                name_ar,
                image,
                brand_id
            });
        });
    });
});

router.post('/edit', authenticateEmployee('admin'), (req, res) => {
    const categoryID = req.body.category_id;
    const file = req.file;

    if (file) {
        req.body.image = Date.now() + file.originalname;
    }
    delete req.body.employee_id;
    delete req.body.category_id;
    delete req.body.type;

    const route = 'POST /edit';
    let query = 'UPDATE categories SET ';

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
            query += ` WHERE id=${categoryID}`;

            console.log(query);

            Query(res, location, route, query, () => {
                res.status(200).send();
            });
        })
    } else {
        query = _.trimEnd(query, ', ');
        query += ` WHERE id=${categoryID}`;

        console.log(query);

        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    }
});

// Module Export
module.exports = router;
