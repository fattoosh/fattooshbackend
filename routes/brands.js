// Module Imports 
const express = require('express');

// Library Imports
const errors = require('../dictionary/errors');
const Query = require('../middleware/query'); 

// Vriables Definitions
const router = express.Router();

const location = 'Brands';

// Routes
router.use('/photos', express.static(__dirname.replace('/routes', '/photos/brands')));

router.get('/', (req, res) => {
    const route = 'Get /';
    const query = 'SELECT * FROM brands';
    Query(res, location, route, query, result => {
        if (result.length === 0) {
            console.log(errors.not_found_err('brands', `${location} => ${route}`));
            return res
                .status(404)
                .send(errors.not_found_err('brands', `${location} => ${route}`));
        }

        return res.status(200).send(result);
    });
});

// Module Export
module.exports = router;
