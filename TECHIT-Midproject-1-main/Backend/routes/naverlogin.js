let router = require('express').Router();

// DB Setup
const { setup } = require('../utils/setup_db');

router.post('/checkUser', async (req, res) => {
  // console.log('checkUser!');
  const { mysqldb } = await setup();
  const { userid } = req.body;
  mysqldb.query('SELECT * FROM users WHERE userid = ?', [userid], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

router.post('/addUser', async (req, res) => {
  const { mysqldb } = await setup();
  const { user } = req.body;
  mysqldb.query('INSERT INTO users SET ?', user, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err });
    }
    // console.log('회원가입 완료');
    res.json({ results });
  });
});

module.exports = router;