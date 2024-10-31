// Express
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// Dotenv
const dotenv = require('dotenv');
dotenv.config();

// session
const { sessionConfig } = require('./utils/session');
app.use(sessionConfig);

// Body-parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// cookie-parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Listen
const port = process.env.PORT || 8000;
app.listen(port, (err) => {
    if (err) {
        console.error('Error starting server:', err);
        return;
    }

    if (process.env.NODE_ENV === 'production') {
        console.log(`Backend Server Production Ready. PORT: ${port}`);
    } else {
        console.log(`Backend Server Ready. PORT: ${port}`);
    }
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/amm', require('./routes/asset-management'));
app.use('/real-estate', require('./routes/real-estate'));
app.use('/naverlogin', require('./routes/naverlogin'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/health', require('./routes/health'));
