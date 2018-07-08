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

const location = 'Contact Us';

//Routes
router.use('/photos', express.static(__dirname.replace('/routes', '/photos/contact us')));


router.get('/:language', (req, res) => {
    const language = req.params.language;

    let name_en_alias;
    let name_ar_alias;
    let address_1_en_alias;
    let address_1_ar_alias;
    let address_2_en_alias;
    let address_2_ar_alias;

    if (language === 'en') {
        name_en_alias = 'name';
        name_ar_alias = 'name_ar';
        address_1_en_alias = 'address_1';
        address_1_ar_alias = 'address_1_ar';
        address_2_en_alias = 'address_2';
        address_2_ar_alias = 'address_2_ar';
    } else if (language === 'ar') {
        name_en_alias = 'name_en';
        name_ar_alias = 'name';
        address_1_en_alias = 'address_1_en';
        address_1_ar_alias = 'address_1';
        address_2_en_alias = 'address_2_en';
        address_2_ar_alias = 'address_2';
    }

    const route = 'GET /';
    const query = `
        SELECT 
            name_en AS ${name_en_alias},
            name_ar AS ${name_ar_alias},
            image,
            address_1_en AS ${address_1_en_alias},
            address_1_ar AS ${address_1_ar_alias},
            address_2_en AS ${address_2_en_alias},
            address_2_ar AS ${address_2_ar_alias},
            address_1_longitude,
            address_1_latitude,
            address_2_longitude,
            address_2_latitude,
            phone_number_1,
            phone_number_2,
            in_state_delivery_fee_limit,
            in_state_delivery_fee,
            out_state_delivery_fee_limit,
            out_state_delivery_fee
        FROM info;
    `;

    Query(res, location, route, query, result => {
        res.status(200).send(result[0]);
    });
});

router.post('/edit', authenticateEmployee('admin'), (req, res) => {
    const productID = req.body.product_id;
    const file = req.file;

    if (file) {
        req.body.image = Date.now() + file.originalname;
    }
    delete req.body.employee_id;
    delete req.body.type;

    const route = 'POST /edit';
    let query = 'UPDATE info SET ';

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

            console.log(query);

            Query(res, location, route, query, () => {
                res.status(200).send();
            });
        });
    } else {
        query = _.trimEnd(query, ', ');

        console.log(query);

        Query(res, location, route, query, () => {
            res.status(200).send();
        });
    }
});

// Module Export
module.exports = router;
