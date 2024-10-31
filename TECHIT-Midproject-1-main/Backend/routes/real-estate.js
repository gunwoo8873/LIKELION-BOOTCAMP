let router = require('express').Router();
const moment = require('moment-timezone');

// BackendServer real-estate
// DB Setup
const { setup } = require('../utils/setup_db');

router.get('/', async (req, res) => {
    const { mysqldb } = await setup();
    const sessionuser = req.headers['sessionuser'];

    if (!sessionuser) {
        return res.status(401).json({ alertMsg: '인증되지 않은 사용자' });
    }

    const page = parseInt(req.query.page) || 1; // 현재 페이지 번호, 기본값은 1
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10; // 페이지당 항목 수, 기본값은 10
    const offset = (page - 1) * itemsPerPage;

    const [real_estate] = await mysqldb.promise().query(`SELECT * FROM real_estate ORDER BY id DESC LIMIT ?, ?`, [offset, itemsPerPage]);
    const [totalCount] = await mysqldb.promise().query('SELECT COUNT(*) as count FROM real_estate');
    const totalPages = Math.ceil(totalCount[0].count / itemsPerPage);

    res.json({
        real_estate,
        totalPages,
        currentPage: page
    });
})

router.get('/search', async (req, res) => {
    const { mysqldb } = await setup();
    const sessionuser = req.headers['sessionuser'];
    if (!sessionuser) {
        return res.status(401).json({ alertMsg: '인증되지 않은 사용자' });
    }

    const req_selectv = req.headers['req_selectv'];
    const req_sword = decodeURIComponent(req.headers['req_sword']);

    const page = parseInt(req.query.page) || 1; // 현재 페이지 번호, 기본값은 1
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10; // 페이지당 항목 수, 기본값은 10
    const offset = (page - 1) * itemsPerPage;

    let sql = `SELECT * FROM real_estate WHERE ${req_selectv} LIKE ? ORDER BY id DESC LIMIT ?, ?`;
    const [real_estate] = await mysqldb.promise().query(sql, [`%${req_sword}%`, offset, itemsPerPage]);
    const [totalCount] = await mysqldb.promise().query(`SELECT COUNT(*) as count FROM real_estate WHERE ${req_selectv} LIKE ?`, [`%${req_sword}%`]);
    const totalPages = Math.ceil(totalCount[0].count / itemsPerPage);

    res.json({
        real_estate,
        totalPages,
        currentPage: page
    });
});


// 부동산 매물 등록 Submit
router.post('/save', async (req, res) => {
    const { mysqldb } = await setup();
    const sessionuser = req.body.sessionuser.userid;

    const [userRows] = await mysqldb.promise().query('select id From users where userid = ?', [sessionuser]);
    if (userRows.length == 0) {
        return res.status(400).send({ message: 'userID가없음' });
    }
    const userId = userRows[0].id;

    try {
        // 현재 시간을 한국 시간대로 변환
        const currentTime = moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');

        let sql = 'INSERT INTO real_estate (user_id, address, apartment, city, area, imagepath, selling_price, jeonse_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await mysqldb.promise().query(sql, [userId, req.body.address, req.body.apartment, req.body.city, req.body.area, req.body.imagepath, req.body.selling_price, req.body.jeonse_price, req.body.status, currentTime]);
        // 매물 등록 완료
        return res.status(200).json({ alertMsg: '매물 등록이 완료되었습니다.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ alertMsg: '등록에 실패하였습니다.' });
    }
});

// 부동산 매물 삭제 Submit
router.post('/delete', async function (req, res) {
    const { mysqldb } = await setup(); // MySQL 연결을 설정하는 함수 또는 객체
    const { id } = req.body; // 요청의 body에서 id 추출

    try {
        // MySQL 쿼리를 사용하여 데이터 삭제
        const [result] = await mysqldb.promise().query('DELETE FROM real_estate WHERE id = ?', [id]);

        // 삭제 성공 시
        if (result.affectedRows > 0) {
            return res.status(200).send({ confirmMsg: '삭제 성공' });
        } else {
            return res.status(404).send({ confirmMsg: '해당 ID를 찾을 수 없음' });
        }
    } catch (err) {
        return res.status(500).send({ confirmMsg: '서버 오류' });
    }
});

// 부동산 매물 수정 Submit
router.post('/edit', async function (req, res) {
    const { mysqldb } = await setup(); // MySQL 연결을 설정하는 함수 또는 객체
    const sessionuser = req.body.sessionuser.userid;

    const [userRows] = await mysqldb.promise().query('select id From users where userid = ?', [sessionuser]);
    if (userRows.length == 0) {
        return res.status(400).send({ message: 'userID가없음' });
    }
    const userId = userRows[0].id;

    const sellingPrice = req.body.selling_price.replace(/,/g, '');
    const jeonsePrice = req.body.jeonse_price.replace(/,/g, '');

    try {
        // MySQL 쿼리를 사용하여 데이터 수정
        let sql = `
            update real_estate 
            set apartment = ?, address = ?, city = ?, area = ?, 
                imagepath = ?, selling_price = ?, jeonse_price = ?
            where id = ?`; // WHERE 절에 ID를 추가하여 해당 레코드만 수정하도록 함
        const [result] = await mysqldb.promise().query(sql, [
            req.body.apartment,
            req.body.address,
            req.body.city,
            req.body.area,
            req.body.imagepath,
            sellingPrice,
            jeonsePrice,
            req.body.id // 클라이언트에서 전송한 ID 필드를 추가하여 해당 레코드만 수정하도록 함
        ]);

        // 수정 성공 시
        const [real_estate] = await mysqldb.promise().query('select * from real_estate order by id desc');
        if (result.affectedRows > 0) {
            return res.status(200).send({ alertMsg: '수정되었습니다.', real_estate });
        } else {
            return res.status(404).send({ alertMsg: '수정 실패', real_estate });
        }
    } catch (err) {
        console.error('real-estate.error:', err);
        return res.status(500).send({ alertMsg: '서버 오류' });
    }
});

// 부동산 매물 매매가 구매 Submit
router.post('/selling', async function (req, res) {
    const { mysqldb } = await setup(); // MySQL 연결을 설정하는 함수 또는 객체

    try {
        // MySQL 쿼리를 사용하여 데이터 수정
        let sql = `
            update real_estate 
            set status = ?
            where id = ?`; // WHERE 절에 ID를 추가하여 해당 레코드만 수정하도록 함
        const [result] = await mysqldb.promise().query(sql, ['판매 완료',
            req.body.id // 클라이언트에서 전송한 ID 필드를 추가하여 해당 레코드만 수정하도록 함
        ]);
        return res.status(200).send();
    } catch (err) {
        console.error('게시물 수정 실패:', err);
        return res.status(500).send({ alertMsg: '서버 오류' });
    }
});

// 부동산 매물 전세가 구매 Submit
router.post('/jeonse', async function (req, res) {
    //
});

// 자기글만 수정하기
router.post('/edit_test', async (req, res) => {
    const { mysqldb } = await setup(); // MySQL 연결을 설정하는 함수 또는 객체
    const sessionuser = req.body.sessionuser.userid;

    const [userRows] = await mysqldb.promise().query('select id From users where userid = ?', [sessionuser]);
    if (userRows.length == 0) {
        return res.status(400).send({ message: 'userID가없음' });
    }
    const userId = userRows[0].id;

    try {
        let edit_test = `select id from users where userid = ?`;
        const [etest] = await mysqldb.promise().query(edit_test, [userId]);
        let sql = `select userid from users where id = (select user_id from real_estate where id = ?);`; //해당 글에 real-estate 테이블의 id값
        const [result] = await mysqldb.promise().query(sql, [userId]);
    } catch (err) {
        console.error('게시물 수정 실패:', err);
        return res.status(500).send({ alertMsg: '서버 오류' });
    }
})

module.exports = router;