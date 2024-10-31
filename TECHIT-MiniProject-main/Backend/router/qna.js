const { connect_callback } = require('../db');

const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');


// API 요청 미들웨어 추가 : 라우터로 들어오는 모든 요청의 '방식, url, 바디' 확인
router.use((req, res, next) => {
    console.log('API Request:', req.method, req.originalUrl, req.body);
    next();
});

// 기본 폴더 생성 public, qna, question, answer
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

if (!fs.existsSync('public/qna')) {
    fs.mkdirSync('public/qna');
}

/*
if (!fs.existsSync('public/qna/question')) {
    fs.mkdirSync('public/qna/question');
}


if (!fs.existsSync('public/qna/answer')) {
    fs.mkdirSync('public/qna/answer');
}
*/

// 파일 업로드 전 공통 미들웨어
const setUpFolder = (req, res, next) => {
    const temp = uuid.v4();
    const folder = `public/qna/${temp}`;
    console.log('folder:', folder);
    req.folder = folder;
    next();
};

// 위에 setupFolder 미들웨어를 대체하여 multer에서 처리
const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, done) {

            if (!fs.existsSync(req.folder)) {
                fs.mkdirSync(req.folder);
            }

            const folder = `${req.folder}/${file.fieldname}`;
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }

            done(null, folder);
        },
        filename(req, file, done) {
            const ext = path.extname(file.originalname); // 확장자 추출
            // 이미지 필드이름일 경우에만 uuid 사용
            if (file.fieldname === 'imgs') {
                done(null, `${uuid.v4()}${ext}`);
            } else {
                file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
                done(null, file.originalname);
            }
        },
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
    })
});


// ### 수정 완료 ###
//// QnA 게시물 목록 출력 (제목, 작성날짜, 답변상태)
router.get('/', async (req, res) => {

    try {

        const db = await connect_callback();
        //console.log('DB Object : ', db );
        const sqlSelectQna = `SELECT title, created, status FROM question ORDER BY question.created DESC`;
        db.execute(sqlSelectQna, (err, result, fields) => {
            res.json({
                status: 'success',
                message: 'QnA 목록 조회 성공',
                data: result
            });
        })
    } catch (err) {
        console.log('QnA 목록 오류 : ', err);
        res.status(500).send({
            status: "fail",
            message: '서버 에러'
        })
    }

});


// ### 수정 완료 ###
//// QnA 작성
router.post('/save', setUpFolder, upload.fields([
    { name: 'imgs', maxCount: 5 },
    { name: 'files', maxCount: 5 }]
), async (req, res) => {
    const { title, content } = req.body;
    const user_id = req.session.user.userId; //////// 현석 수정 : 세션에서 user_id 가져오기

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }////// 여기까지
    try {
        console.log(title, content);

        const db = await connect_callback();       /////// 여기도 {} 생략

        // 1 : req.body.userId => question.user_id
        const values = [user_id, title, content, req.folder, req.folder, new Date()];
        console.log(values);
        const sqlQInsert = `INSERT INTO question (user_id, title, content, file, img, created, status) VALUES (?, ?, ?, ?, ?, ?, 0)`;
        db.query(sqlQInsert, values, (err, result) => { ////// 그리고 execute -> query로 수정 그리고 user_id 로 변경
            if (err) {
                console.log('QnA 작성 오류 : ', err);
                res.status(500).send({
                    status: "fail",
                    message: '서버 에러'
                })
            } else {
                res.json({
                    status: 'success',
                    message: 'QnA 작성 완료',
                    data: null
                })
            }
        });
    } catch (err) {
        console.log('QnA 작성 오류 : ', err);
        res.status(500).send({
            status: "fail",
            message: '서버 에러'
        })
    }
}
);



// ### 수정 완료 ###
// QnA > 상세보기
router.get('/content/:id', async (req, res) => {

    // (추가 작성 필요) 로그인 여부 확인 //

    try {
        const qid = req.params.id
        console.log(qid);

        const db = await connect_callback();

        //userId : 세션 활용?
        const sqlSelectQcontent = `SELECT * FROM question, user WHERE question.user_id = user.id AND question.id = ?`;
        db.execute(sqlSelectQcontent, [qid], (err, result) => {

            console.log(result);

            if (result.length == 0) {
                res.status(404).send({
                    status: 'fail',
                    message: '해당 게시글이 존재하지 않습니다.'
                });
                return;
            }

            const imgFolder = result[0].img;
            const imgFiles = fs.readdirSync(`${imgFolder}/imgs`);
            result[0].imgFiles = imgFiles.map((file) => `${fileFolder}/files/${file}`);

            const fileFolder = result[0].img;
            const files = fs.readdirSync(`${fileFolder}/files`);
            result[0].files = files.map((file) => `${fileFolder}/files/${file}`);

            res.json({
                status: 'success',
                message: 'QnA 상세 조회 성공',
                data: result[0]
            });
        })
    } catch (err) {
        console.log('QnA 상세 조회 오류 : ', err);
        res.status(500).send({
            status: "fail",
            message: '서버 에러'
        });
    }
});

//// ### 수정 완료 ###
//// QnA > question 글 수정
router.post('/update/:id', async (req, res) => {

    try {
        const qid = req.params.id;
        console.log(qid);
        const userId = req.body.userId;
        const { title, content, created, file, img } = req.body;

        const { db } = await connect_callback();

        // (1) 질문 글 존재 여부 확인
        const sqlQSelect = `SELECT id, user_id FROM question WHERE id = ?`
        db.execute(sqlQSelect, [id], (err, result) => {
            if (err) {
                console.log('DB 에러', err);
                res.status(500).send({
                    status: "fail",
                    message: "서버 오류"
                });
                return;
            }

            if (result[0].length == 0) {
                res.status(404).send({
                    stauts: 'fail',
                    message: '해당 질문이 존재하지 않습니다.'
                });
                return;
            }

            // (2) 수정자 == 작성자 동일 여부 확인
            if (uesrId == result.user_id) {
                // (3) 수정 내용 반영
                const sqlQupdate = `UPDATE question (title, content, created) SET (?, ?, ?) WHERE user_id =?`;
                db.query(sqlQupdate, [title, content, created, userId], (err, result) => {
                    if (err) {
                        console.log('DB 에러', err);
                        res.status(500).send({
                            status: "fail",
                            message: "서버 오류"
                        });
                    }
                    else {
                        res.json({
                            status: 'success',
                            message: '질문 수정 성공',
                            data: result[0]
                        });
                    }
                });
            } else {
                res.status(404).send({
                    status: 'fail',
                    message: '잘못된 접근입니다.'
                });
            }
        });
    } catch (err) {
        res.status(500).send({
            status: 'fail',
            message: '서버 오류'
        });
    }
});

//// QnA > 게시글 삭제
//// 본인 글만 삭제 가능
//// 질문 삭제 => 데이터베이스에서 
router.post('/delete', async (req, res) => {

    try {
        userId = req.body.userId;
        const { db } = await connect_callback();

        // 삭제자 = 작성자 확인
        const sqlQSelect = `SELECT id, user_id FROM question WHERE id = ?`
        db.execute(sqlQSelect, [userId], (err, result) => {
            if (userId == result.user_id) {
                const sqlDelete = `DELETE FROM question WHERE user_id = ?`
                db.execute(sqlDelete, [result.id], (err, result) => {
                    if (err) {
                        console.log('DB 에러', err);
                        res.status(500).send({
                            status: "fail",
                            message: "서버 오류"
                        });
                    } else {
                        res.json({
                            status: 'success',
                            message: '질문 삭제 성공',
                            data: null
                        });

                    }
                });
            } else {
                res.status(404).send({
                    status: 'fail',
                    message: '잘못된 접근입니다.'
                });
            }
        });
    } catch (err) {
        res.status(500).send({
            status: 'fail',
            message: '서버 오류'
        });
    }
});


// ***************** Answer *********************

//// 답변 작성
// 답변 작성 창은, 질문 상세보기 창에서 버튼을 눌러서 창이 뜬다.
// router.get("/qna/answer", async (req, res) => {
//     const {db} = await connect();

//     // ###### 관리자 권한 검증 코드 작성 필요 #######


// })

// router.post('/qna/enter', (req, res) => {
//     //jwt
//     if (req.body.userId) {
//         res.render('qna/enter.ejs');
//     } else {
//         console.log(err);
//         res.send('로그인 먼저 해주세요');
//         //res.render('/qna.ejs', {data : { alertMsg : '로그인 먼저 해주세요'}});
//     }
// });


module.exports = router;