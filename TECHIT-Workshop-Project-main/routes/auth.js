let router = require('express').Router();

////// Database
const { MongoClient } = require('mongodb');
const ObjId = require('mongodb').ObjectId;
const DB_URI = process.env.DB_URI;
let mydb;

MongoClient.connect(DB_URI).then(client => {
    mydb = client.db('myboard');
}).catch((err) => {
    console.log(err);
});
////////////////////

////// Passport
const passport = require('passport');
////////////////////

////// Other
const sha = require('sha256');

function generateRandomAccountNumber() {
    let accountNumber = '';
    for (let i = 0; i < 12; i++) {
        accountNumber += Math.floor(Math.random() * 10);
    }
    return accountNumber;
}

async function generateUniqueAccountNumber() {
    let accountNumber, result;
    while (true) {
        accountNumber = generateRandomAccountNumber();
        try {
            result = await mydb.collection('account').findOne({ account_number: accountNumber });
            if (!result) {
                return accountNumber;
            }
        } catch (err) {
            console.error(err);
        }
    }
}
///////////////////

////// Auth
router.get('/', function (req, res) {
    let user;
    if (req.session.passport) {
        user = req.session.passport;
    } else {
        user = req.user;
    }

    if (!user) {
        res.clearCookie('uid', { path: '/' });
    }

    res.render('index.ejs', { user });
});

router.get('/login', function (req, res) {
    if (!req.session.passport) {
        return res.render('login.ejs');
    }

    res.redirect('/');
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/fail', }),
function (req, res) {
    res.cookie('uid', req.session.passport.user, {
        expires: new Date(Date.now() + 60 * 60 * 1000),  // 1 hour
        path: '/',
    });

    res.redirect('/');
});

router.get('/fail', function (req, res) {
    res.render('fail.ejs');
});

router.get('/logout', function (req, res) {
    req.session.destroy();
    res.clearCookie('uid', { path: '/' });
    res.redirect('/');
});

router.get('/signup', function (req, res) {
    res.render('signup.ejs');
});

router.post('/signup', async function (req, res) {
    mydb.collection('account').findOne({ userid: req.body.userid }).then(async (result) => {
        if (result != null) {
            return res.status(500).send('중복되는 아이디입니다.');
        }
        
        if (req.body.userpw.length < 4 || req.body.userid.length < 4) {
            return res.status(500).send('아이디와 비밀번호는 4자리 이상으로 해주세요.');
        }
        
        try {
            const account_number = await generateUniqueAccountNumber();
            await mydb.collection('account').insertOne({
                userid: req.body.userid,
                userpw: sha(req.body.userpw),
                account_number: account_number,
                email: req.body.useremail,
                account_balance: 0,
                birthday: req.body.userbirthday,
            }).then((result) => {
                res.redirect('/');  // 회원가입 성공
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).send('회원가입 실패');
        }
    });
});
////////////////////

////// signup check id
router.post('/check-id', async (req, res) => {
    try {
        if (req.body.userid == undefined) {
            res.json({ isDuplicate: true });
            return;
        }
        
        const existingUser = await mydb.collection('account').findOne({ userid: req.body.userid });
        
        if (existingUser) {
            res.json({ isDuplicate: true });
        } else {
            res.json({ isDuplicate: false });
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
        res.status(500).json({ error: 'An error occurred while checking the user ID.' });
    }
});

router.post('/check-account', async (req, res) => {
    let userid = req.body.userid;
    let userpw = sha(req.body.userpw);

    mydb.collection('account').findOne({ userid }).then((sessionUser) => {
        if (!sessionUser) {
            return res.json({ success: false, message: 'id' });
        }

        if (sessionUser.userpw != userpw) {
            return res.json({ success: false, message: 'pw' });
        }

        return res.json({ success: true });
    });
});
////////////////////

module.exports = router;