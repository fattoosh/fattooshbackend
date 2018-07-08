// Module Imports
const jwt = require('jsonwebtoken');

// Library Imports
const Query = require('../middleware/query');
const generateTokenHash = require('../middleware/generateTokenHash');

// Variable Definitions 
const location = 'Token Generation';

// Method Definition
const generateAndAssignToken = (id, res, userType, cb) => {
    // Generating Token
    const token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
        id
    }, process.env.JWT_SECRET);
    const hashedToken = generateTokenHash(token);


    const route = '';
    const query = `UPDATE ${userType} 
                           SET token='${hashedToken}' 
                           where id=${id}
    `;

    // Updating User Record with Generated Hashed Token
    Query(res, location, route, query, () => {
        cb(token);
    });
};


module.exports = generateAndAssignToken;
