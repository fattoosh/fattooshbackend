// Module Imports
const express = require('express');

// Library Imports
const router = express.Router();

// Routes
router.use(express.static(__dirname.replace('/routes', '/public')));

// Module Export
module.exports = router;
