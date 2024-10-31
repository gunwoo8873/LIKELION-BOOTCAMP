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

////// Other
const format = require('../utils/format.js')
////////////////////

////// 자산관리 AMM
router.get('/amm', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    mydb.collection('account').findOne({ userid: req.session.passport.user }).then((sessionUser) => {
        sessionUser.account_balance = format.formatNumber(sessionUser.account_balance);
        res.render('amm.ejs', { user: sessionUser });
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.post('/amm/credit', function (req, res) {
    req.body.userid = new ObjId(req.body.userid);
    mydb.collection('account').findOne({ _id: req.body.userid }).then((sessionUser) => {
        sessionUser.account_balance = format.formatNumber(sessionUser.account_balance);
        res.render('amm_credit.ejs', { user: sessionUser });
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.post('/amm/credit/submit', function (req, res) {
    let otherAccountNumber = req.body.other_account_number;
    let received = Number(req.body.other_account_balance);
    req.body.userid = new ObjId(req.body.userid);

    mydb.collection('account').findOne({ _id: req.body.userid }).then((sessionUser) => {
        if (sessionUser == null) {
            res.send('고객님의 계정은 존재하지 않습니다.');
            return;
        }

        mydb.collection('account').findOne({ account_number: otherAccountNumber }).then((otherUser) => {
            if (otherUser == null) {
                res.send(`(${otherAccountNumber}) 존재하지 않는 계좌번호 입니다.`);
                return;
            }

            // update my account
            mydb.collection('account').updateOne({ _id: sessionUser._id }, {
                $set: { account_balance: sessionUser.account_balance - received }
            }).then((result) => {
                // update other account
                mydb.collection('account').updateOne({ _id: otherUser._id }, {
                    $set: { account_balance: otherUser.account_balance + received }
                }).then((result) => {
                    res.redirect('/amm');
                }).catch(err => {
                    console.log(err);
                });
            }).catch(err => {
                console.log(err);
            });
        });

        // console.log(`result: ${result}`);
        // res.render('amm_credit.ejs', { user: result });
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.post('/amm/debit', function (req, res) {
    mydb.collection('account').findOne({ _id: new ObjId(req.body.userid) }).then((sessionUser) => {
        sessionUser.account_balance = format.formatNumber(sessionUser.account_balance);
        res.render('amm_debit.ejs', { user: sessionUser });
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.post('/amm/debit/submit', function (req, res) {
    mydb.collection('account').findOne({ _id: new ObjId(req.body.userid) }).then((sessionUser) => {
        if (sessionUser == null) {
            res.send('고객님의 계정은 존재하지 않습니다.');
            return;
        }

        mydb.collection('account').updateOne({ _id: sessionUser._id }, {
            $set: { account_balance: sessionUser.account_balance - req.body.withdraw }
        }).then((result) => {
            res.redirect('/amm');
        }).catch(err => {
            console.log(err);
        });
    });
});
////////////////////

module.exports = router;