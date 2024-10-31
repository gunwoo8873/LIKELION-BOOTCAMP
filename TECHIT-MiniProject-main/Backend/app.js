require('dotenv').config();
const path = require('path');

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// 미들웨어 추가
app.use(cors());  // CORS 미들웨어 사용
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: '암호화키',
    resave: false,
    saveUninitialized: false,
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 라우터 추가
const accountRouter = require('./router/account');
const authRouter = require('./router/auth');
const noticeRouter = require('./router/notice');
const qnaRouter = require('./router/qna');

app.use('/api/account', accountRouter);
app.use('/api/notice', noticeRouter);
app.use('/api/auth', authRouter);
app.use('/api/qna', qnaRouter);

const HOST = process.env.SERVER_HOST || '127.0.0.1';
const PORT = process.env.SERVER_PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
