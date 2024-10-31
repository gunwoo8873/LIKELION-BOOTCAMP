let router = require('express').Router();
const { QNA } = require('../utils/qna');
const chatBot = new QNA();

// 챗봇 API
router.post('/', async function (req, res) {
    try {
        res.json({ answer: chatBot.getBestAnswer(req.body.question) });
    } catch (error) {
        console.error('chatBot:', error);
        res.status(500).json({ answer: '챗봇 서버에 문제가 생겼습니다.' });
    }
});

module.exports = router;