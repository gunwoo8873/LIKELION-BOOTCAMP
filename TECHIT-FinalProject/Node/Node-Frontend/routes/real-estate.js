let router = require('express').Router();
const multer = require('multer');
const fs = require('fs'); // fs.existsSync와 fs.mkdirSync를 사용하여 경로가 없을 때만 폴더를 생성합니다.
const path = require('path');

// AWS SDK for JavaScript v2는 2024년 9월 8일(Start Date)부터 유지 관리 모드에 들어가며
// 2025년 9월 7일(End Date)에 지원 종료됩니다.
// 정보 출처: https://aws.amazon.com/ko/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
const AWS = require('aws-sdk');

// /real-estate/
router.post('/', async function (req, res) {
    return res.status(200).send();
})

// /real-estate/delete
router.post('/delete', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(200).send(data);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ alertMsg: '서버 오류' });
    }
})

// /real-estate/selling
router.post('/selling', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate/selling`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(200).send(data);
    } catch (err) {
        console.error('게시물 수정 실패:', err);
        return res.status(500).send({ alertMsg: '서버 오류' });
    }
})

// 리스트 검색
router.get('/search', async function (req, res) {
    let req_sword = encodeURIComponent(req.query.sword);
    let req_selectv = req.query.selectv;
    let page = req.query.page || 1;
    let itemsPerPage = req.query.itemsPerPage || 10;
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate/search?selectv=${req_selectv}&sword=${encodeURIComponent(req_sword)}&page=${page}&itemsPerPage=${itemsPerPage}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'sessionuser': req.session.user.userid,
                'req_selectv': req_selectv,
                'req_sword': req_sword
            },
        });
        const data = await response.json();
        // 요청 성공 여부에 따라 렌더링할 데이터와 함께 렌더링
        const csrfToken = req.csrfToken();
        return res.render('real-estate/list.ejs', { 
            data: data.real_estate,
            totalPages: data.totalPages,
            currentPage: data.currentPage,
            user: req.session.user,
            csrfToken,
            appkey: process.env.JAVASCRIPT_APPKEY
        });
    } catch (error) {
        console.error(error);
        // 오류 처리
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

// 부동산 매물 목록
router.get('/', async function (req, res) {
    let page = req.query.page || 1;
    let itemsPerPage = req.query.itemsPerPage || 10;

    if (!req.session.user) {
        return res.render('auth/login.ejs', { csrfToken: req.csrfToken() });
    }

    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate?page=${page}&itemsPerPage=${itemsPerPage}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'sessionuser': req.session.user.userid
            },
        });
        const data = await response.json();
        // console.log(data);

        // 요청 성공 여부에 따라 렌더링할 데이터와 함께 렌더링
        const csrfToken = req.csrfToken();
        return res.render('real-estate/list.ejs', {
            data: data.real_estate,
            totalPages: data.totalPages,
            currentPage: data.currentPage,
            user: req.session.user,
            csrfToken,
            appkey: process.env.JAVASCRIPT_APPKEY
        });
    } catch (error) {
        console.error(error);
        // 오류 처리
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 부동산 매물 등록 폼
router.get('/enter', function (req, res) {
    const csrfToken = req.csrfToken();
    res.render('real-estate/enter.ejs', { user: req.session.user, csrfToken });
});

// 이미지를 저장할 경로 설정
const uploadPath = './public/image';

// 경로가 없으면 자동으로 생성하는 함수
const createUploadPathIfNotExists = () => {
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
};

// 먼저 경로를 생성해줍니다.
createUploadPathIfNotExists();

const storage = multer.diskStorage({
    destination: (req, file, done) => {
        done(null, './public/image'); // 이미지를 저장할 경로
    },
    filename: (req, file, done) => {
        done(null, file.originalname); // 파일명은 원본 파일명으로 설정
    }, limit: 5 * 1024 * 1024 // 5MB 제한
});

const upload = multer({ storage });

let imagepath = ''; // 이미지 경로를 저장할 변수

// router.post('/photo', upload.single('imagepath'), (req, res) => {
//     // 이미지 업로드 시 저장된 파일의 경로를 변수에 저장
//     imagepath = req.file.originalname; // 실제 이미지 파일의 저장 경로를 변수에 저장
//     return res.status(200).json({ alertMsg: `${req.file.originalname} 파일을 성공적으로 업로드했습니다.` });
// });

// AWS S3 설정
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DEFAULT_REGION
});

router.post('/photo', upload.single('imagepath'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ alertMsg: '이미지 파일을 업로드해주세요.' });
    }

    // 파일 읽기
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path);

    // S3에 업로드할 파일 세부 정보
    const params = {
        Bucket: 'team1-public.lion.nyhhs.com/public', // 버킷 이름 및 경로
        Key: req.file.originalname, // S3에 저장될 파일 이름
        Body: fileContent,
        ContentType: req.file.mimetype
    };

    // S3에 파일 업로드
    s3.upload(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ alertMsg: '파일 업로드에 실패했습니다.' });
        }

        // 업도르에 성공하면 로컬 파일 삭제
        fs.unlink(req.file.path, (err) => {
            if (err) {
                console.error(`로컬 파일 삭제 중 오류 발생: ${err}`);
            }
        });

        imagepath = data.Location
        // S3에 업로드 성공 시
        return res.status(200).json({ alertMsg: `${req.file.originalname} 파일을 성공적으로 업로드했습니다.`, location: imagepath });
    });
});

router.post('/save', async function (req, res) {
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...req.body,
                sessionuser: req.session.user,
                imagepath: imagepath // 이미지 경로를 포함시킴
            })
        });
        const data = await response.json();
        if (response.ok) {
            return res.redirect('/real-estate/?alertMsg=매물 등록이 완료되었습니다.');
        } else {
            const csrfToken = req.csrfToken();
            return res.render('real-estate/enter.ejs', { data, user: req.session.user, csrfToken });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ alertMsg: '서버 오류가 발생했습니다.' });
    }
});

// 부동산 매물 수정 Submit
router.post('/edit', async function (req, res) {
    imagepath = req.body.imagepath;
    try {
        const response = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/real-estate/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...req.body,
                sessionuser: req.session.user,
                imagepath: imagepath // 이미지 경로를 포함시킴
            })
        });

        const data = await response.json();
        const csrfToken = req.csrfToken();
        if (response.ok) {
            req.session.realEstateData = {
                user: req.session.user,
                totalPages: data.totalPages,
                currentPage: data.currentPage,
                data: data,
                csrfToken: req.csrfToken(),
            };

            return res.redirect('/real-estate?page=1&alertMsg=수정 완료');
        } else {
            return res.render('real-estate/list.ejs', {
                user: req.session.user,
                totalPages: data.totalPages,
                currentPage: data.currentPage,
                data: data,
                csrfToken: req.csrfToken(),
                appkey: process.env.JAVASCRIPT_APPKEY
            });
        }
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;