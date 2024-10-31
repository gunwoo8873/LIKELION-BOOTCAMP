const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    if (!req.session.user) {
        return next();
    }

    const token = req.session.user.token;
    if (!token) {
        return res.status(403).json({ error: '토큰이 제공되지 않았습니다.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: '토큰 인증에 실패했습니다.' });
        }

        req.userId = decoded.userId;
        next();
    });
}

module.exports = { verifyToken };