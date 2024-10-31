let router = require('express').Router();
const sha = require('sha256');
const pool = require('../utils/pool')
// BackendServer amm
// DB Setup
const { setup } = require('../utils/setup_db');

// 자산관리 사용자 계좌 정보 불러오기
router.get('/accounts', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    const [accounts] = await mysqldb.promise().query('SELECT account_alias, account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);

    res.json(accounts);
});

// 자산관리 거래 내역 불러오기
router.get('/transactions', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    try {
        // 기본 쿼리
        let query = 'SELECT * FROM transactions WHERE account_number IN (SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?))';
        const queryParams = [sessionUser];

        query += ' ORDER BY transaction_date DESC';

        // 거래 내역 조회
        const [transactions] = await mysqldb.promise().query(query, queryParams);

        // console.log('전체 거래 내역 조회됨');
        return res.status(200).json(transactions);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류 발생' });
    }
});

// 자산관리 특정 계좌의 잔액 불러오기
router.get('/account-balance/:accountNumber', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];
    const accountNumber = req.params.accountNumber;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    try {
        // 선택한 계좌가 sessionUser의 계좌 목록에 있는지 확인
        const [userAccounts] = await mysqldb.promise().query('SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);
        const userAccountNumbers = userAccounts.map(account => account.account_number);

        if (!userAccountNumbers.includes(accountNumber)) {
            return res.status(403).json({ message: '선택한 계좌는 사용자의 계좌가 아닙니다' });
        }

        const [accounts] = await mysqldb.promise().query('SELECT account_balance FROM accounts WHERE account_number = ?', [accountNumber]);

        if (accounts.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        // console.log('잔액 가져옴');
        res.json(accounts[0]);
    } catch (error) {
        console.error('잔액 불러오기 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다' });
    }
});

// 자산관리 입금 처리
router.post('/deposit', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];
    const selectedAccount = req.body.selectedAccount;
    const amount = parseFloat(req.body.amount);
    const accountpw = req.body.depositPw;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // accountpw가 DB의 account_pw와 일치하는지 확인
        const [accountRows] = await connection.query('SELECT account_pw, salt FROM accounts WHERE account_number = ?', [selectedAccount]);
        if (accountRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const dbHashedPassword = accountRows[0].account_pw;
        const salt = accountRows[0].salt;
        const hashedPassword = sha(accountpw + salt);

        if (dbHashedPassword !== hashedPassword) {
            await connection.rollback();
            return res.status(403).json({ message: '비밀번호가 일치하지 않습니다' });
        }

        // 선택한 계좌가 sessionUser의 계좌 목록에 있는지 확인
        const [userAccounts] = await connection.query('SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);
        const userAccountNumbers = userAccounts.map(account => account.account_number);

        if (!userAccountNumbers.includes(selectedAccount)) {
            await connection.rollback();
            return res.status(403).json({ message: '선택한 계좌는 사용자의 계좌가 아닙니다' });
        }

        // 선택한 계좌의 현재 잔액 가져오기
        const [accounts] = await connection.query('SELECT account_balance FROM accounts WHERE account_number = ?', [selectedAccount]);

        if (accounts.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const currentBalance = parseFloat(accounts[0].account_balance);
        const updatedBalance = currentBalance + amount;

        // 계좌의 잔액 업데이트
        await connection.query('UPDATE accounts SET account_balance = ? WHERE account_number = ?', [updatedBalance, selectedAccount]);

        // 입금 내역 저장
        await connection.query('INSERT INTO transactions (account_number, transaction_type, amount, balance, transaction_date) VALUES (?, ?, ?, ?, NOW())', [selectedAccount, 'deposit', amount, updatedBalance]);

        await connection.commit();

        return res.status(200).json({ message: '입금이 완료되었습니다', updatedBalance: updatedBalance });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        return res.status(500).json({ message: '서버 오류 발생' });
    } finally {
        connection.release();
    }
});

// 자산관리 출금 처리
router.post('/withdraw', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];
    const selectedAccount = req.body.selectedAccount;
    const amount = parseFloat(req.body.amount);
    const accountpw = req.body.withdrawPw;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    const connection = await pool.getConnection();

    try {
        // 트랜잭션 시작
        await connection.beginTransaction();

        // accountpw가 DB의 account_pw와 일치하는지 확인
        const [accountRows] = await connection.query('SELECT account_pw, salt FROM accounts WHERE account_number = ?', [selectedAccount]);
        if (accountRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const dbHashedPassword = accountRows[0].account_pw;
        const salt = accountRows[0].salt;
        const hashedPassword = sha(accountpw + salt);

        if (dbHashedPassword !== hashedPassword) {
            await connection.rollback();
            return res.status(403).json({ message: '비밀번호가 일치하지 않습니다' });
        }

        // 선택한 계좌가 sessionUser의 계좌 목록에 있는지 확인
        const [userAccounts] = await connection.query('SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);
        const userAccountNumbers = userAccounts.map(account => account.account_number);

        if (!userAccountNumbers.includes(selectedAccount)) {
            await connection.rollback();
            return res.status(403).json({ message: '선택한 계좌는 사용자의 계좌가 아닙니다' });
        }

        // 해당 계좌의 현재 잔액 가져오기
        const [accounts] = await connection.query('SELECT account_balance FROM accounts WHERE account_number = ?', [selectedAccount]);

        if (accounts.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const currentBalance = parseFloat(accounts[0].account_balance);
        const updatedBalance = currentBalance - amount;

        if (updatedBalance < 0) {
            await connection.rollback();
            return res.status(200).json({ message: '잔액이 부족합니다' });
        }

        // 계좌의 잔액 업데이트
        await connection.query('UPDATE accounts SET account_balance = ? WHERE account_number = ?', [updatedBalance, selectedAccount]);

        // 출금 내역 저장
        await connection.query('INSERT INTO transactions (account_number, transaction_type, amount, balance, transaction_date) VALUES (?, ?, ?, ?, NOW())', [selectedAccount, 'withdraw', amount, updatedBalance]);

        // 트랜잭션 커밋
        await connection.commit();

        return res.status(200).json({ message: '출금이 완료되었습니다', updatedBalance: updatedBalance });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        return res.status(500).json({ message: '서버 오류 발생' });
    } finally {
        connection.release();
    }
});

// 자산관리 송금 처리
router.post('/transfer', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];
    const selectedAccount = req.body.selectedAccount;
    const recieverAccount = req.body.recieverAccount;
    const amount = parseFloat(req.body.amount);
    const accountpw = req.body.transferPw;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // accountpw가 DB의 account_pw와 일치하는지 확인
        const [accountRows] = await connection.query('SELECT account_pw, salt FROM accounts WHERE account_number = ?', [selectedAccount]);
        if (accountRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const dbHashedPassword = accountRows[0].account_pw;
        const salt = accountRows[0].salt;
        const hashedPassword = sha(accountpw + salt);

        if (dbHashedPassword !== hashedPassword) {
            await connection.rollback();
            return res.status(403).json({ message: '비밀번호가 일치하지 않습니다' });
        }

        // 선택한 계좌가 유효한지 확인, 현재 잔액 가져오기
        const [accounts] = await connection.query('SELECT account_balance FROM accounts WHERE account_number = ?', [selectedAccount]);

        if (accounts.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        // sessionUser의 계좌 목록 가져오기
        const [userAccounts] = await connection.query('SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);
        const userAccountNumbers = userAccounts.map(account => account.account_number);

        // 선택한 계좌가 sessionUser의 계좌 목록에 있는지 확인
        if (!userAccountNumbers.includes(selectedAccount)) {
            await connection.rollback();
            return res.status(403).json({ message: '선택한 계좌는 사용자의 계좌가 아닙니다' });
        }

        // 받을 사람의 계좌가 유효한지 확인, 현재 잔액 가져오기
        const [recievers] = await connection.query('SELECT account_balance FROM accounts WHERE account_number = ?', [recieverAccount]);

        if (recievers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const currentBalance = parseFloat(accounts[0].account_balance);
        const updatedBalance = currentBalance - amount;

        if (updatedBalance < 0) {
            await connection.rollback();
            return res.status(200).json({ message: '잔액이 부족합니다' });
        }

        const recieverCurrentBalance = parseFloat(recievers[0].account_balance);
        const recieverUpdatedBalance = recieverCurrentBalance + amount;

        // 계좌의 잔액 업데이트
        await connection.query('UPDATE accounts SET account_balance = ? WHERE account_number = ?', [updatedBalance, selectedAccount]);
        await connection.query('UPDATE accounts SET account_balance = ? WHERE account_number = ?', [recieverUpdatedBalance, recieverAccount]);

        // 현재 계좌의 userid 가져오기
        const [senderIdResult] = await connection.query('SELECT userid FROM users WHERE id = (SELECT user_id FROM accounts WHERE account_number = ?)', [selectedAccount]);
        const senderId = senderIdResult[0].userid;

        // 받을 사람의 userid 가져오기
        const [recieverIdResult] = await connection.query('SELECT userid FROM users WHERE id = (SELECT user_id FROM accounts WHERE account_number = ?)', [recieverAccount]);
        const recieverId = recieverIdResult[0].userid;

        // 송금 내역 저장 (송금 보낸 계좌)
        await connection.query('INSERT INTO transactions (account_number, transaction_type, counterparty_name, amount, balance, transaction_date) VALUES (?, ?, ?, ?, ?, NOW())', [selectedAccount, 'withdraw', recieverId, amount, updatedBalance]);

        // 송금 내역 저장 (송금 받은 계좌)
        await connection.query('INSERT INTO transactions (account_number, transaction_type, counterparty_name, amount, balance, transaction_date) VALUES (?, ?, ?, ?, ?, NOW())', [recieverAccount, 'deposit', senderId, amount, recieverUpdatedBalance]);

        await connection.commit();

        return res.status(200).json({ message: '송금이 완료되었습니다', updatedBalance: updatedBalance });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        return res.status(500).json({ message: '서버 오류 발생' });
    } finally {
        connection.release();
    }
});

// 자산관리 환전 처리
router.post('/exchange', async function (req, res) {
    const { mysqldb } = await setup();

    const sessionUser = req.headers['user-id'];
    const selectedAccount = req.body.selectedAccount;
    const krwAmount = parseFloat(req.body.krwAmount);
    const currency = req.body.currency;
    const accountpw = req.body.exchangePw;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    const connection = await pool.getConnection();

    try {
        // 트랜잭션 시작
        await connection.beginTransaction();

        // accountpw가 DB의 account_pw와 일치하는지 확인
        const [accountRows] = await connection.query('SELECT account_pw, salt FROM accounts WHERE account_number = ?', [selectedAccount]);
        if (accountRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const dbHashedPassword = accountRows[0].account_pw;
        const salt = accountRows[0].salt;
        const hashedPassword = sha(accountpw + salt);

        if (dbHashedPassword !== hashedPassword) {
            await connection.rollback();
            return res.status(403).json({ message: '비밀번호가 일치하지 않습니다' });
        }

        // 선택한 계좌가 sessionUser의 계좌 목록에 있는지 확인
        const [userAccounts] = await connection.query('SELECT account_number FROM accounts WHERE user_id = (SELECT id FROM users WHERE userid = ?)', [sessionUser]);
        const userAccountNumbers = userAccounts.map(account => account.account_number);

        if (!userAccountNumbers.includes(selectedAccount)) {
            await connection.rollback();
            return res.status(403).json({ message: '선택한 계좌는 사용자의 계좌가 아닙니다' });
        }

        // 해당 계좌의 현재 잔액 가져오기
        const [accounts] = await connection.query('SELECT account_balance FROM accounts WHERE account_number = ?', [selectedAccount]);

        if (accounts.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '존재하지 않는 계좌입니다' });
        }

        const currentBalance = parseFloat(accounts[0].account_balance);

        // 잔액이 부족한 경우
        if (currentBalance < krwAmount) {
            await connection.rollback();
            return res.status(200).json({ message: '잔액이 부족합니다' });
        }

        const updatedBalance = currentBalance - krwAmount;

        // 계좌의 잔액 업데이트
        await connection.query('UPDATE accounts SET account_balance = ? WHERE account_number = ?', [updatedBalance, selectedAccount]);

        // 환전 내역 저장
        await connection.query('INSERT INTO transactions (account_number, transaction_type, counterparty_name, amount, balance, transaction_date) VALUES (?, ?, ?, ?, ?, NOW())', [selectedAccount, 'exchange', `Minibank(${currency}환전)`, krwAmount, updatedBalance]);

        // 트랜잭션 커밋
        await connection.commit();

        return res.status(200).json({ message: '환전이 완료되었습니다', updatedBalance: updatedBalance });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        return res.status(500).json({ message: '서버 오류 발생' });
    } finally {
        connection.release();
    }
});

//랜덤한 12자리 계좌번호 생성
function generateAccount(length = 12) {
    let accountNumber = '';
    for (let i = 0; i < length; i++) {
        accountNumber += Math.floor(Math.random() * 10).toString();
    }
    return accountNumber;
}

// 자산관리 계좌 개설
router.post('/create', async function (req, res) {
    const { mysqldb } = await setup();
    const sessionUser = req.headers['user-id'];
    const regex = /^\d{4}$/;
    let accountpw = req.body.accountpw;
    const accountpwCheck = req.body.accountpwCheck;

    if (!sessionUser) {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다' });
    }

    if (!regex.test(accountpw) || !regex.test(accountpwCheck)) {
        return res.status(400).send({ message: '비밀번호를 4자리 숫자로만 입력해주세요' });
    }

    if (accountpw !== accountpwCheck) {
        return res.status(400).send({ message: '동일한 비밀번호를 입력해주세요' });
    }

    // 비밀번호 암호화
    const generateSalt = (length = 16) => {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString("hex");
    };

    const salt = generateSalt();

    accountpw = sha(accountpw + salt);

    const connection = await pool.getConnection();

    try {
        // 트랜잭션 시작 
        await connection.beginTransaction();

        // user_id가 users 테이블에 존재하는지 확인
        const [userRows] = await connection.query('SELECT id FROM users WHERE userid = ?', [sessionUser]);
        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(400).send({ message: '존재하지 않는 유저입니다' });
        }
        const userId = userRows[0].id;

        let accountNumber;
        let isUnique = false;

        // 중복되지 않은 계좌번호 생성
        while (!isUnique) {
            accountNumber = generateAccount(12);
            const [rows] = await connection.query('SELECT COUNT(*) as count FROM accounts WHERE account_number=?', [accountNumber]);
            if (rows[0].count === 0) {
                isUnique = true;
            }
        }

        // 중복되지 않은 계좌번호를 데이터베이스에 저장
        const sql = `INSERT INTO accounts (user_id, account_alias, account_number, account_balance, account_pw, salt) VALUES (?, ?, ?, ?, ?, ?)`;
        await connection.query(sql, [userId, req.body.accountAlias, accountNumber, req.body.initialDeposit, accountpw, salt]);

        // 초기 입금 내역 저장
        await connection.query('INSERT INTO transactions (account_number, transaction_type, amount, balance, transaction_date) VALUES (?, ?, ?, ?, NOW())', [accountNumber, 'deposit', req.body.initialDeposit, req.body.initialDeposit]);

        // 트랜잭션 커밋
        await connection.commit();

        res.status(201).send({ message: '계좌가 성공적으로 개설되었습니다' });
    } catch (error) {
        // 트랜잭션 롤백
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).send({ message: '서버 오류가 발생했습니다' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;