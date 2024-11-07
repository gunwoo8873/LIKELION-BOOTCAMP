let router = require('express').Router();

router.get('/', function (req, res) {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;