const router = require('express').Router();
const DB_connect = require('../db');
const sha = require('sha256');

router.get('/register', async (req, res) => {
    res.render('register');
})

router.post('/register', async (req, res) => {
    const MySQLDB = await DB_connect();
    const {
        user_name,
        user_email,
        user_password,
        user_password2,
        user_phone,
        user_address,
        user_role
    } = req.body;
    try {
        // 필요한 로직 추가
    }
    catch (error) {
        console.error('Registration error:', error);
    }
});

router.get('/login', async (req, res) => {
    res.render('login');
})

router.post('/login', async (req, res) => {
    // 필요한 로직 추가
})

module.exports = router;
