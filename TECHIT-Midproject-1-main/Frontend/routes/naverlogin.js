let router = require('express').Router();
const request = require('request');
const jwt = require('jsonwebtoken');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirectURI = encodeURI(process.env.REDIRECT_URI);

router.get('/login', async function (req, res) {
  const code = req.query.code;
  const state = req.query.state;
  
  const api_url = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=' + client_id + '&client_secret=' + client_secret + '&redirect_uri=' + redirectURI + '&code=' + code + '&state=' + state;
  
  const api_options = {
    url: api_url,
    headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
  };

  request.get(api_options, function (error, response, body) { // token 요청
    if (!error && response.statusCode == 200) { 
      const access_token = JSON.parse(body).access_token; 

      const profile_url = 'https://openapi.naver.com/v1/nid/me';
      const options = {
        url: profile_url,
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      };
      request.get(options, async function (error, response, body) { // api 호출
        if (!error && response.statusCode == 200) { 
          const profile = JSON.parse(body).response;

          const user = {
            userid: 'naver-'+profile.id,
            userpw: 'naver',
            salt: 'naver',
            email: profile.email,
            birthday: '00-' + profile.birthday

          };

          const userid = 'naver-'+profile.id;
          try {
            const checkUserResponse = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/naverlogin/checkUser`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userid: userid })
            });
            const userCheckResult = await checkUserResponse.json();

            if (userCheckResult.length > 0) { // 로그인
              const nickname = userCheckResult[0].nickname;
              const token = jwt.sign({ userid: userid }, process.env.JWT_SECRET, { expiresIn: '1h' });
              req.session.user = { userid: userid, token, nickname };
              res.cookie('uid', userid);
              return res.render('index.ejs', { user: req.session.user});
            } else {  // 회원가입
              const addUserResponse = await fetch(`http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/naverlogin/addUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user })
              });

              if (!addUserResponse.ok) {
                throw new Error('Failed to add user'); // 정보 추가 실패
              }

              const token = jwt.sign({ userid: userid }, process.env.JWT_SECRET, { expiresIn: '1h' });
              req.session.user = { userid: userid, token, nickname: "고객" };
              res.cookie('uid', userid);
              return res.render('index.ejs', { user: req.session.user });
            }
          } catch (err) {
            console.error('Error:', err); // 서버에서 발생한 에러 메시지 출력
            res.status(500).send('서버 에러');
          }
        } else {
          res.status(response.statusCode).send('네이버 API 호출 에러');
        }
      });
    } else {
      res.status(response.statusCode).send('네이버 토큰 요청 에러');
    }
  });
});

module.exports = router;