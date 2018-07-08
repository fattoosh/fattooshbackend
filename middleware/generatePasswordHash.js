// Module Imports
const bcrypt = require('bcrypt');

const generatePasswordHash = async (password) => await bcrypt.hash(password, 8)
    .then(result => result);

// Module Export
module.exports = generatePasswordHash;
