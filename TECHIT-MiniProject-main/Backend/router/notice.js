const MySQL = require('mysql2/promise');
require(`dotenv`).config();

const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const uuid = require('uuid');

let db;
const connectToDatabase = async () => {
    if (db) return db;
    db = await MySQL.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    console.log(`MySQL connect success`);
    return db
};

const router = express.Router();

// API 요청 미들웨어 추가
router.use((req, res, next) => {
    console.log('API Request:', req.method, req.originalUrl, req.body);
    next();
});

// 기본 폴더 생성 public이랑 notice 모두
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

if (!fs.existsSync('public/notice')) {
    fs.mkdirSync('public/notice');
}

// 파일 업로드 전 공통 미들웨어
const setUpFolder = (req, res, next) => {
    const temp = uuid.v4();
    const folder = `public/notice/${temp}`;
    console.log('folder:', folder);
    req.folder = folder;
    next();
};

// 위에 setupFolder 미들웨어를 대체하여 multer에서 처리

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, done) {
            console.log('req.folder:', req.folder)
            if (!fs.existsSync(req.folder)) {
                fs.mkdirSync(req.folder);
            }

            const folder = `${req.folder}/${file.fieldname}`;
            console.log('folder:', folder)
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



// 공지사항 작성
router.post('/', setUpFolder, upload.fields([
    { name: 'imgs', maxCount: 5 },
    { name: 'files', maxCount: 5 }]
), async (req, res) => {
    const { title, content } = req.body;

    console.log(title, content);
    try {

        const db = await connectToDatabase();

        const params = [1, title, content, req.folder, req.folder, new Date()];
        console.log(params);
        await db.execute('INSERT INTO notice (user_id, title, content, file, img, created) VALUES (?, ?, ?, ?, ?, ?)', params);

        res.json({
            status: 'success',
            message: '공지사항 추가 완료',
            data: null
        });
    } catch (error) {
        console.error('공지사항 작성 에러', error);
        res.status(500).send({
            status: 'fail',
            message: '서버 에러'
        });
    }
});

// 공지사항 수정
router.put('/:id', async (req, res) => {

    const { id } = req.params;
    const { title, content } = req.body;
    console.log(id, title, content);

    try {
        const db = await connectToDatabase();

        const [results, fields] = await db.query('SELECT id FROM notice WHERE id = ?', [id]);
        if (results.length === 0) {
            res.status(404).send({
                status: 'fail',
                message: '해당 공지사항이 존재하지 않습니다.'
            });
            return;
        }

        let sql = 'UPDATE notice SET ';
        let params = [];
        if (title) {
            sql += 'title = ?, ';
            params.push(title);
        }

        if (content) {
            sql += 'content = ?, ';
            params.push(content);
        }

        sql = sql.slice(0, -2);
        sql += ' WHERE id = ?';
        params.push(id);

        await db.execute(sql, params);


        res.json({
            status: 'success',
            data: null
        });
    } catch (error) {
        console.error('공지사항 수정 에러', error);
        res.status(500).send({
            status: "fail",
            message: 'Internal Server Error'
        })
    }
});

// 공지사항 목록
// TODO : 페이징 적용
router.get(`/`, async (req, res) => {
    try {
        const db = await connectToDatabase();

        const [results, fields] = await db.query('SELECT user.id user_id, notice.id notice_id, name, email, role, title, content, created, file, img FROM notice, user WHERE notice.user_id = user.id ORDER BY notice.created DESC');
        // console.log(results);
        res.json({
            status: 'success',
            message: '공지사항 목록 조회 성공',
            data: results
        });
    } catch (error) {
        console.error('공지사항 목록 에러', error);
        res.status(500).send({
            status: "fail",
            message: '서버 에러'
        })
    }
});




// 공지사항 상세
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await connectToDatabase();



        const [results, fields] = await db.query('SELECT user.id user_id, notice.id notice_id, name, email, role, title, content, created, file, img FROM notice, user WHERE notice.user_id = user.id AND notice.id = ?', [id]);
        if (results.length === 0) {
            res.status(404).send({
                status: 'fail',
                message: '해당 공지사항이 존재하지 않습니다.'
            });
            return;
        }


        const imgFolder = results[0].img;
        const imgFiles = fs.readdirSync(`${imgFolder}/imgs`);
        results[0].imgFiles = imgFiles.map((file) => `${imgFolder}/imgs/${file}`);

        const fileFolder = results[0].file;
        const files = fs.readdirSync(`${fileFolder}/files`);
        results[0].files = files.map((file) => `${fileFolder}/files/${file}`);

        res.json({
            status: 'success',
            message: '공지사항 상세 조회 성공',
            data: results[0]
        });
    } catch (error) {
        console.error('공지사항 상세 에러', error);
        res.status(500).send({
            status: "fail",
            message: '서버 에러'
        })
    }
});


// 공지사항 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await connectToDatabase();

        const [results, fields] = await db.query('SELECT id FROM notice WHERE id = ?', [id]);
        if (results.length === 0) {
            res.status(404).send({
                status: 'fail',
                message: '해당 공지사항이 존재하지 않습니다.'
            });
            return;
        }

        await db.execute('DELETE FROM notice WHERE id = ?', [id]);

        res.json({
            status: 'success',
            message: '공지사항 삭제 성공',
            data: null
        });
    } catch (error) {
        console.error('공지사항 삭제 에러', error);
        res.status(500).send({
            status: "fail",
            message: 'Internal Server Error'
        })
    }
});


module.exports = router;
