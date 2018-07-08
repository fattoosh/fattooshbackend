// Module Imports
const SHA512 = require('crypto-js').SHA512;

const generateTokenHash = (token) => SHA512(token).toString();

// Module Export
module.exports = generateTokenHash;
