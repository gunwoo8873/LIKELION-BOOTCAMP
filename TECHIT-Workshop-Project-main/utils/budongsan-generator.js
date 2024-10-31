const faker = require('faker');

////// Database
const { MongoClient } = require('mongodb');
const ObjId = require('mongodb').ObjectId;
const DB_URI = process.env.DB_URI;
let mydb;

MongoClient.connect(DB_URI).then(client => {
    mydb = client.db('myboard');
}).catch((err) => {
    console.log(err);
});
////////////////////

////// Other
const format = require('./format.js')
////////////////////

////// 부동산 매물 자동(랜덤) 등록
function generateApartmentData() {
    return {
        title: `${faker.address.cityName()} ${faker.address.streetName()} 아파트`,
        address: faker.address.streetAddress(),
        city: faker.address.city(),
        seller: "6677faedeb0522988d1d93dd",
        selling_price: Number(faker.commerce.price(300000000, 600000000, 0)),
        jeonse_price: Number(faker.commerce.price(150000000, 300000000, 0)),
        updated_at: format.getCurrentDateString(faker.date.recent(3650))
    };
}

function generateApartmentsData(length = 1) {
    return Array.from({ length }, generateApartmentData);  // { length: length }
}

async function insertApartmentsData(length = 1) {
    try {
        result = await mydb.collection('budongsan').insertMany(generateApartmentsData(length));
        return result;
    } catch (err) {
        console.err(err);
    }
}

module.exports.generateApartmentsData = generateApartmentsData;
module.exports.insertApartmentsData = insertApartmentsData;
////////////////////
