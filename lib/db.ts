require('dotenv').config({path: './.env'});
const mysql = require('mysql');
const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

let init = async (callback:any) => {
    try {
        con.connect(function(err:Error) {
            if (err) throw err;
            console.log("Connected!");
        });
        return callback(con);
    } catch (e:any) {
        console.error(e);
    }
};

module.exports = {
    init
};