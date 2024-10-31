const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const sha = require('sha256');

////// Database
const { MongoClient } = require('mongodb');
const DB_URI = process.env.DB_URI;
let mydb;

MongoClient.connect(DB_URI).then(client => {
    mydb = client.db('myboard');
}).catch((err) => {
    console.log(err);
});
////////////////////

////// Session
const session_config = {
    secret: 'dkufe8938493j4e08349u',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: DB_URI
    })
};

passport.serializeUser(function (user, done) {
    done(null, user.userid);
});

passport.deserializeUser(function (puserid, done) {
    mydb.collection('account').findOne({ userid: puserid }).then((sessionUser) => {
        done(null, sessionUser);
    });
});

passport.use(new LocalStrategy({
    usernameField: "userid",
    passwordField: "userpw",
    session: true,
    passReqToCallback: false,
}, function (inputid, inputpw, done) {
    mydb.collection('account').findOne({ userid: inputid }).then((sessionUser) => {
        if (sessionUser == null) {
            return done(null, false, { message: "아이디가 존재하지 않습니다" });;
        }

        if (sessionUser.userpw == sha(inputpw)) {
            return done(null, sessionUser);  // 새로운 로그인
        }

        return done(null, false, { message: "비밀번호 틀렸어요" });
    });
}));
////////////////////

module.exports.session_config = session_config;
module.exports.passport = passport;