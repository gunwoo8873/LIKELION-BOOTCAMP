let router = require('express').Router();

// amm
// 자산관리 메인 페이지
router.get('/', async function (req, res) {
    if (!req.session.user) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const csrfToken = req.csrfToken();
    res.render('amm/management.ejs', { csrfToken });
});

// 자산관리 사용자 계좌 정보 불러오기
router.get('/accounts', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/accounts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            }
        });
        const data = await response.json();
        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 자산관리 거래 내역 불러오기
// 캐시가 존재하면 DB에 접근하지 않고 저장된 캐시를 사용해 응답
router.get('/transactions', async function (req, res) {
    const userId = req.session.user.userid;
    const accountNumber = req.query.account;
    const transactionType = req.query.filter || 'all';
    const page = parseInt(req.query.page) || 1;
    const rowsPerPage = 10;

    let transactions = req.transactionCache.get(userId);

    if (!transactions) {
        try {
            const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/transactions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Id': userId,
                }
            });
            const data = await response.json();
            if (response.ok) {
                req.transactionCache.set(userId, data);
                transactions = data;
            } else {
                return res.status(response.status).json(data);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    }

    // 필터링
    let filteredTransactions = transactions;
    if (accountNumber && accountNumber !== '') {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.account_number === accountNumber);
    }
    if (transactionType !== 'all') {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.transaction_type === transactionType);
    }

    // 페이징
    const totalTransactions = filteredTransactions.length;
    const pageCount = Math.ceil(totalTransactions / rowsPerPage);
    const paginatedTransactions = filteredTransactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    res.json({
        transactions: paginatedTransactions,
        page,
        pageCount,
        totalTransactions
    });
});

// 자산관리 특정 계좌의 잔액 불러오기
router.get('/account-balance/:accountNumber', async function (req, res) {
    const userId = req.session.user.userid;
    const accountNumber = req.params.accountNumber;
    const transactions = req.transactionCache.get(userId);

    if (transactions) {
        const accountTransactions = transactions.filter(transaction => transaction.account_number === accountNumber);
        if (accountTransactions.length > 0) {
            const latestTransaction = accountTransactions.reduce((latest, transaction) => {
                return new Date(transaction.transaction_date) > new Date(latest.transaction_date) ? transaction : latest;
            });
            return res.json({ balance: latestTransaction.balance });
        }
    }

    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/account-balance/${accountNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': userId,
            }
        });
        const data = await response.json();
        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 자산관리 계좌 개설
router.post('/create', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            },
            body: JSON.stringify({ ...req.body })
        });

        const data = await response.json();
        if (response.ok) {
            req.transactionCache.del(req.session.user.userid); // 캐시 초기화
            res.status(201).send(data);
        } else {
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error(error);
    }
});

// 자산관리 입금 폼
// router.get('/deposit', async function (req, res) {
//     res.send('/amm/deposit 폼 입니다.');
// });

// 자산관리 입금 처리
router.post('/deposit', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            },
            body: JSON.stringify({ ...req.body })

        });
        const data = await response.json();
        if (response.ok) {
            req.transactionCache.del(req.session.user.userid);  // 캐시 초기화
            res.status(201).send(data);
        } else {
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error(error);
    }
});

// 자산관리 출금 처리
router.post('/withdraw', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            },
            body: JSON.stringify({ ...req.body })

        });
        const data = await response.json();
        if (response.ok) {
            req.transactionCache.del(req.session.user.userid); // 캐시 초기화
            res.status(201).send(data);
        } else {
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error(error);
    }
});


// 자산관리 송금 폼
// router.get('/transfer', async function (req, res) {
//     res.send('/amm/transfer 폼 입니다.');
// });

// 자산관리 송금 처리
router.post('/transfer', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            },
            body: JSON.stringify({ ...req.body })

        });
        const data = await response.json();
        if (response.ok) {
            req.transactionCache.del(req.session.user.userid); // 캐시 초기화
            res.status(201).send(data);
        } else {
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error(error);
    }
});

// 자산관리 환전 처리
router.post('/exchange', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/amm/exchange`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': req.session.user.userid
            },
            body: JSON.stringify({ ...req.body })

        });
        const data = await response.json();
        if (response.ok) {
            req.transactionCache.del(req.session.user.userid); // 캐시 초기화
            res.status(201).send(data);
        } else {
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;