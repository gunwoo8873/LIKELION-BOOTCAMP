const express = require('express');
const APP = express();

const dotenv = require('dotenv').config();
const HOST = process.env.HOST;
const PORT = process.env.PORT;

const bodyParser = require('body-parser');
APP.use(bodyParser.urlencoded({ extended: true }));
APP.use(bodyParser.json());  // /check-id POST 요청 시 필요함

////// templates, public
const path = require('path');
APP.set('views', path.join(__dirname, 'templates'));
APP.set('view engine', 'ejs');
APP.use(express.static('public'));
////////////////////

////// Database
const { MongoClient } = require('mongodb');
const DB_URI = dotenv.parsed.DB_URI;
let mydb;

MongoClient.connect(DB_URI).then(client => {
    mydb = client.db('myboard');
    APP.listen(PORT, function () {
        console.log(`SERVER READY! http://${HOST}:${PORT}`);
    });
}).catch((err) => {
    console.log(err);
});
////////////////////

////// Session 및 Passport 설정
const session = require('express-session');
const routes_session = require('./routes/session');

APP.use(session(routes_session.session_config));
APP.use(routes_session.passport.initialize());
APP.use(routes_session.passport.session());
////////////////////

////// Routes
APP.use('/', require('./routes/amm'));
APP.use('/', require('./routes/budongsan'));
APP.use('/', require('./routes/auth'));
////////////////////
