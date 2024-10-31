let router = require('express').Router();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirectURI = process.env.REDIRECT_URI;
const state = 'RANDOM_STATE'; // CSRF 공격 방지를 위한 상태 토큰

const api_url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirectURI}&state=${state}`;

// get post
router.get('/', async (req, res) => {
    const csrfToken = req.csrfToken();
    res.render('index.ejs', { user: req.session.user, csrfToken, api_url: api_url });
});

module.exports = router;