// Project Configurations
require('./config/config');

// Module Imports
const express = require('express');
const bodyParser = require('body-parser');

// Library Imports 
const upload = require('./config/file_upload');
const messages = require('./dictionary/messages');

// Route Imports
const home = require('./routes/home');
const brands = require('./routes/brands');
const categories = require('./routes/categories');
const products = require('./routes/products');
const users = require('./routes/users');
const cartWishList = require('./routes/cart-wishlist');
const cart = require('./routes/cart');
const wishlist = require('./routes/wishlist');
const employees = require('./routes/employees');
const orders = require('./routes/orders');
const orders_log = require('./routes/oreders_log');
const contact_us = require('./routes/contact_us');
const delivery_persons = require('./routes/delivery_persons');
const notifications = require('./routes/notifications');

// Vriables Definitions
const app = express();

// General MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(upload.single('image'));

app.use((req, res, next) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, x-auth');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Router MiddleWare
app.use('/', home);
app.use('/brands', brands);
app.use('/categories', categories);
app.use('/products', products);
app.use('/users', users);
app.use('/cartWishList', cartWishList);
app.use('/cart', cart);
app.use('/wishlist', wishlist);
app.use('/employees', employees);
app.use('/orders', orders);
app.use('/orders_log', orders_log);
app.use('/contactUs', contact_us);
app.use('/deliveryPersons', delivery_persons);
app.use('/notifications', notifications);

// Port Listening
const port = process.env.PORT;

app.listen(port, () => {
    console.log(messages.listen_success(port));
});

module.exports = app;
