// Module Imports
const bcrypt = require('bcrypt');

const verifyPasswordHash = async (hash, password) => await bcrypt
    .compare(password, hash).then((result) => result);

// Module Export
module.exports = verifyPasswordHash;
