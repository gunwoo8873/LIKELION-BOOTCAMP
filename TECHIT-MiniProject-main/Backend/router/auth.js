const router = require('express').Router();
const path = require('path');
const crypto = require('crypto');
const { connect_callback } = require('../db');

const sha256 = require('sha256');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

///// Register 이슈 없음
router.post('/register/save', async (req, res) => {
    const { email, name, password, role, phone_num, address } = req.body;
    const salt = crypto.randomBytes(20).toString(`hex`);
    const crypto_password = sha256(password + salt);
    const role_default = `user`;

    try {
        const db = await connect_callback();
        const query = `INSERT INTO user (email, name, password, role, phone_number, address) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [email, name, crypto_password, role_default, phone_num, address];

        db.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Server error' });
            }
            else {
                res.status(201).json({ message: 'Register successful' });
            }
        });
    }
    catch (err) {
        console.error('DB Connect fail', err);
        res.status(500).json({ error: 'Server error' });
    }
});

///// Login 오류 이슈
router.post('/login/submit', async (req, res) => {
    const { email, password } = req.body;
    const salt = crypto.randomBytes(20).toString(`hex`);
    const crypto_password = sha256(password + salt);

    try {
        const db = await connect_callback();
        const query = 'SELECT * FROM user WHERE email = ? AND password = ?';
        const values = [email, crypto_password];

        db.query(query, values, (err, rows) => {
            if (err) {
                console.error('로그인 오류:', err);
                return res.status(500).json({ success: false, message: '서버 오류' });
            }
            if (rows.length > 0) {
                res.status(200).json({ success: true });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        });
    }
    catch (err) {
        console.error('DB Connect fail', err);
        res.status(500).json({ error: 'Server error' });
    }
});

///// Login 결과는 출력되나 세션 문제가 발생
router.post('/login', async (req, res) => {
    // const { email, password } = req.body;

    // try {
    //     const db = await connect();
    //     const query = `SELECT email, password FROM user WHERE email = ? AND password = ?`;
    //     const values = [email, password];

    //     db.query(query, values, (err, results) => {
    //         if (err) {
    //             console.error('로그인 오류:', err);
    //             return res.status(500).json({ success: false, message: '서버 오류' });
    //         }

    //         if (results.length > 0) {
    //             const user = results[0];
    //             req.session.user = user; // 세션에 사용자 정보 저장
    //             console.log(user);
    //             res.json({ success: true, user });
    //         } else {
    //             console.log(err);
    //             res.json({ success: false, message: '잘못된 아이디 또는 비밀번호' });
    //         }
    //     });
    // }
    // catch (err) {
    //     console.error('DB 접속 실패:', err);
    //     res.status(500).json({ success: false, message: '서버 오류' });
    // }

    const { email, password } = req.body;
    const salt = crypto.randomBytes(20).toString(`hex`); // 실제로 사용하는 salt 값으로 변경해야 함
    const crypto_password = sha256(password + salt);

    try {
        const db = await connect_callback();
        const query = `SELECT * FROM user WHERE email = ?`;
        const values = [email];

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('로그인 오류:', err);
                return res.status(500).json({ success: false, message: '서버 오류' });
            }

            if (results.length > 0) {
                const user = results[0];
                if (user.password = sha256(password + salt) === crypto_password) {
                    console.log(req.session);
                    req.session.user = {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    };
                    req.session.save((err) => {
                        if (err) {
                            console.error('세션 저장 오류:', err);
                            return res.status(500).json({ success: false, message: '서버 오류' });
                        }
                        console.log('세션 저장 후:', req.session.user);
                        res.status(200).json({
                            success: true,
                            user: req.session.user,
                        });
                    });
                } else {
                    res.status(401).json({ success: false, message: '잘못된 아이디 또는 비밀번호' });
                }
            } else {
                res.status(401).json({ success: false, message: '잘못된 아이디 또는 비밀번호' });
            }
        });
    } catch (err) {
        console.error('DB Connect fail', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    if (req.session.user) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Failed to destroy session:', err);
                res.status(500).json({ error: 'Server error' });
            } else {
                res.clearCookie('connect.sid');
                res.status(200).json({ success: true });
            }
        });
    } else {
        res.status(400).json({ error: 'No active session to log out from' });
    }
});

module.exports = router;
