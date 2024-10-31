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
const budongsan_generator = require('../utils/budongsan-generator.js');
////////////////////

////// Generator
router.get('/budongsan/generator/:size', async function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    if (req.session.passport.user != 'admin') {
        res.send('당신은 권한이 없습니다.');
        return;
    }

    length = Number(req.params.size);
    if (length == NaN || length < 1) {
        res.send('제대로 입력해주세요.');
        return;
    }

    budongsans = budongsan_generator.generateApartmentsData(length);
    result = await mydb.collection('budongsan').insertMany(budongsans);
    res.send(result);
});
////////////////////

////// 부동산
router.get('/budongsan', function (req, res) {
    let currentPage = Number(req.query.page);
    if (!currentPage) {
        currentPage = 1;
    }

    const itemsPerPage = 50;  // 한번에 얼만큼의 게시물을 뿌려줄 것인가.
    const paginationWindowSize = 15;  // 맨 아래에 있는 2번째 페이지 크기 설정
    const skipCount = (currentPage - 1) * itemsPerPage;
    mydb.collection('budongsan').find().sort({ updated_at: -1 }).skip(skipCount).limit(itemsPerPage).toArray().then((budongsans) => {
        mydb.collection('budongsan').countDocuments({}).then((budongsanCount) => {
            let pageSize = Math.ceil(budongsanCount / itemsPerPage);  // 최대 페이지 크기
            let startNumber = (Math.floor((currentPage - 1) / paginationWindowSize) * paginationWindowSize) + 1;  // 페이지의 첫 숫자
            res.render('budongsan.ejs', { 
                data: budongsans,
                number: { currentPage, pageSize, startNumber, paginationWindowSize },
            });
        });
    });
});

router.get('/budongsan/enter', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    res.render('budongsan_enter.ejs');
});

router.post('/budongsan/save', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    mydb.collection('account').findOne({ userid: req.session.passport.user }).then((sellerUser) => {
        mydb.collection('budongsan').insertOne({
            title: req.body.title,
            address: req.body.address,
            city: req.body.city,
            seller: sellerUser._id.toString(),
            selling_price: Number(req.body.selling_price),
            jeonse_price: Number(req.body.jeonse_price),
            updated_at: format.getCurrentDateString(),
        }).then((result) => {
            res.redirect('/budongsan');
        }).catch((err) => {
            console.log(err);
            res.status(500).send();
        });
    });
});

router.get('/budongsan/:_id', function (req, res) {
    if (req.params._id.length !== 24) {
        return res.status(400).send('Invalid ObjectId format');
    }

    let seller = false;
    mydb.collection('budongsan').findOne({ _id: new ObjId(req.params._id) }).then(async (budongsan) => {
        try {
            if (req.session.passport) {
                await mydb.collection('account').findOne({ userid: req.session.passport.user }).then((sessionUser) => {
                    if (sessionUser._id.toString() == budongsan.seller || sessionUser.userid == 'admin') {
                        seller = true;
                    }
                });
            }

            budongsan.selling_price = format.formatNumber(budongsan.selling_price);
            budongsan.jeonse_price = format.formatNumber(budongsan.jeonse_price);
            res.render('budongsan_content.ejs', { data: budongsan, seller: seller });
        } catch (err) {
            console.log(err);
        }
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.get('/budongsan/edit/:_id', function (req, res) {
    if (!req.session.passport) {
        return res.redirect('/login');
    }

    mydb.collection('budongsan').findOne({ _id: new ObjId(req.params._id) }).then((budongsan) => {
        let userid = req.session.passport.user;
        mydb.collection('account').findOne({ userid }).then((sessionUser) => {
            if (sessionUser._id.toString() != budongsan.seller && userid != 'admin') {
                return res.send('당신은 권한이 없습니다.');
            }

            res.render('budongsan_edit.ejs', { data: budongsan });
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send();
    });
});

router.post('/budongsan/edit', function (req, res) {
    mydb.collection('budongsan').updateOne({ _id: new ObjId(req.body._id) }, {
        $set: {
            title: req.body.title,
            address: req.body.address,
            city: req.body.city,
            selling_price: Number(req.body.selling_price),
            jeonse_price: Number(req.body.jeonse_price),
            updated_at: format.getCurrentDateString(),
        }
    }).then((result) => {
        res.redirect('/budongsan');
    }).catch(err => {
        console.log(err);
    });
});

router.post('/budongsan/delete', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    let userid = req.session.passport.user;
    mydb.collection('account').findOne({ userid }).then((sessionUser) => {
        if (sessionUser._id.toString() != req.body.seller && userid != 'admin') {
            return res.send('당신은 권한이 없습니다.');
        }
        
        req.body._id = new ObjId(req.body._id);
        mydb.collection('budongsan').deleteOne(req.body).then((deleteResult) => {
            res.redirect('/budongsan');  // 삭제 완료
        });
    });
});

router.post('/budongsan/selling', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    mydb.collection('budongsan').findOne({ _id: new ObjId(req.body._id) }).then((budongsan) => {
        if (budongsan == null) {
            res.send('존재하지 않습니다.');
            return;
        }

        mydb.collection('account').findOne({ userid: req.session.passport.user }).then((sessionUser) => {
            if (sessionUser == null) {
                res.send('존재하지 않습니다.');
                return;
            }

            if (budongsan.selling_price > sessionUser.account_balance) {
                res.send(`${budongsan.selling_price - sessionUser.account_balance}원이 부족합니다.`);
                return;
            }

            // budongsan delete
            mydb.collection('budongsan').deleteOne(budongsan).then(deleteResult => { });

            // session_user account_balance update
            mydb.collection('account').updateOne({ _id: sessionUser._id }, {
                $set: { account_balance: sessionUser.account_balance - budongsan.selling_price }
            }).then((updateResult) => { });

            // seller account_balance update
            const _id = new ObjId(budongsan.seller);
            mydb.collection('account').findOne({ _id }).then((sellerUser) => {
                mydb.collection('account').updateOne({ _id }, {
                    $set: { account_balance: sellerUser.account_balance + budongsan.selling_price }
                }).then((result) => {
                    res.redirect('/budongsan');
                });
            });
        });
    });
});

router.post('/budongsan/jeonse/', function (req, res) {
    if (!req.session.passport) {
        res.redirect('/login');
        return;
    }

    mydb.collection('budongsan').findOne({ _id: new ObjId(req.body._id) }).then((budongsan) => {
        if (budongsan == null) {
            res.send('게시물이 존재하지 않습니다.');
            return;
        }

        mydb.collection('account').findOne({ userid: req.session.passport.user }).then((sessionUser) => {
            if (sessionUser == null) {
                res.redirect('/');  // 세션 유저의 계정이 존재하지 않음
                return;
            }

            if (budongsan.jeonse_price > sessionUser.account_balance) {
                res.send(`${budongsan.jeonse_price - sessionUser.account_balance}원이 부족합니다.`);
                return;
            }

            // budongsan delete
            mydb.collection('budongsan').deleteOne(budongsan).then(deleteResult => { });

            // account_balance update
            mydb.collection('account').updateOne({ _id: sessionUser._id }, {
                $set: { account_balance: sessionUser.account_balance - budongsan.jeonse_price }
            }).then((updateResult) => { });

            // seller account_balance update
            const _id = new ObjId(budongsan.seller);
            mydb.collection('account').findOne({ _id }).then((seller) => {
                mydb.collection('account').updateOne({ _id }, {
                    $set: { account_balance: seller.account_balance + budongsan.jeonse_price }
                }).then((result) => {
                    res.redirect('/budongsan');
                });
            });
        });
    });
});
////////////////////

module.exports = router;