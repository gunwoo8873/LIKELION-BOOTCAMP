const express = require('express');
const router = express.Router();

const { connect_promise } = require('../db');
const crypto = require('crypto');

// 계좌 번호와 비밀번호 암호화 함수
function generateAccountNumber() {
    return Math.floor(Math.random() * 9000000000) + 1000000000; // 10자리 난수
}

function hashPassword(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// 사용자 이름 조회
router.get('/user', async (req, res) => {
    let user_id;
    if (req.session.user) {
        user_id = req.session.user.userId;
    }
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const mysqldb = await connect_promise();
        const [results] = await mysqldb.execute(`SELECT name FROM user WHERE id = ?`, [user_id]);
        if (results.length > 0) {
            res.json({ name: results[0].name });
        } else {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

    } catch (err) {
        console.error('DB 접속 실패:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 계좌 목록 조회
router.get('/', async (req, res) => {
    let user_id;
    if (req.session.user) {
        user_id = req.session.user.userId;
    }
    if (!user_id) {
        console.error('User ID가 제공되지 않았습니다.');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const mysqldb = await connect_promise();
        const [results] = await mysqldb.execute(`SELECT * FROM account WHERE user_id = ?`, [user_id]);
        res.json({ accounts: results });
    } catch (err) {
        console.error('DB 접속 실패:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 계좌 생성
router.post('/create', async (req, res) => {
    const { account_type, account_password } = req.body;


    if (!req.session.user) {
        console.log('Unauthorized')
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user_id = req.session.user.userId;

    console.log('Received request to create account with:', req.body);
    const account_number = generateAccountNumber();
    const account_balance = 0;
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(account_password, salt);

    try {
        const mysqldb = await connect_promise();
        const [results] = await mysqldb.execute(`INSERT INTO account (account_type, account_number, account_balance, user_id, account_password) VALUES (?, ?, ?, ?, ?)`, [account_type, account_number, account_balance, user_id, hashedPassword]);

        const accountId = results.insertId;
        await mysqldb.execute(`INSERT INTO account_salt (account_id, salt) VALUES (?, ?)`, [accountId, salt]);

        console.log('계좌 생성 완료:', accountId)
        res.json({ success: true });
    } catch (err) {
        console.error('계좌 생성 오류:', err);
        res.status(500).json({ error: '계좌 생성에 실패했습니다.' });
    }
});

// 계좌 삭제
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = req.session.user.userId;
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const mysqldb = await connect_promise();

        await mysqldb.execute(`DELETE FROM account_salt WHERE account_id = ?`, [id]);
        await mysqldb.execute(`DELETE FROM account WHERE id = ? AND user_id = ?`, [id, user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('계좌 삭제 오류:', err);
        res.status(500).json({ error: '계좌 삭제에 실패했습니다.' });
    }
});

// 입금
router.post('/deposit', async (req, res) => {
    const { account_id, amount } = req.body;
    let user_id;
    if (req.session.user) {
        user_id = req.session.user.userId;
    }
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const mysqldb = await connect_promise();
        await mysqldb.execute(`UPDATE account SET account_balance = account_balance + ? WHERE id = ? AND user_id = ?`, [amount, account_id, user_id]);


        res.json({ success: true });
    } catch (err) {
        console.error('입금 오류:', err);
        res.status(500).json({ error: '입금에 실패했습니다.' });
    }
});

router.post('/withdraw', async (req, res) => {
    const { account_id, amount } = req.body;
    console.log('Withdraw request:', req.body);
    let user_id;
    if (req.session.user) {
        user_id = req.session.user.userId;
    }

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const mysqldb = await connect_promise();
        // 현재 계좌 잔액을 확인
        const [rows] = await mysqldb.execute("SELECT account_balance FROM account WHERE id = ? AND user_id = ?", [account_id, user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' });
        }

        const current_balance = rows[0].account_balance;

        if (current_balance < amount) {
            return res.status(400).json({ error: '잔액이 부족합니다.' });
        }

        // 잔액이 충분할 경우 출금 처리
        await mysqldb.execute("UPDATE account SET account_balance = account_balance - ? WHERE id = ? AND user_id = ?", [amount, account_id, user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('출금 오류:', err);
        res.status(500).json({ error: '출금에 실패했습니다.' });
    }
});

// 송금
router.post('/transfer', async (req, res) => {
    const { sender_account_id, recipient_account, amount } = req.body;
    console.log('Transfer request:', req.body);
    let user_id;
    if (req.session.user) {
        user_id = req.session.user.userId;
    }

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let mysqldb;

    try {
        mysqldb = await connect_promise();
        await mysqldb.beginTransaction();

        const [senderRows] = await mysqldb.execute(`SELECT account_balance FROM account WHERE id = ? AND user_id = ?`, [sender_account_id, user_id]);

        if (senderRows.length === 0) {
            await mysqldb.rollback();
            return res.status(404).json({ error: '송신자 계좌를 찾을 수 없습니다.' });
        }

        const senderBalance = senderRows[0].account_balance;
        if (senderBalance < amount) {
            await mysqldb.rollback();
            return res.status(400).json({ error: '잔액이 부족합니다.' });
        }

        await mysqldb.execute(`UPDATE account SET account_balance = account_balance - ? WHERE id = ? AND user_id = ?`, [amount, sender_account_id, user_id]);
        await mysqldb.execute(`UPDATE account SET account_balance = account_balance + ? WHERE account_number = ?`, [amount, recipient_account]);

        await mysqldb.commit();
        res.json({ success: true });
    } catch (err) {
        console.error('송금 오류:', err);
        if (mysqldb) await mysqldb.rollback();
        res.status(500).json({ error: '송금에 실패했습니다.' });
    }
});

module.exports = router;
