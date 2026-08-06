const mysql = require("mysql2/promise"); //promise for more clean querie syntax

const pool = mysql.createPool({ //creating the connection pool
    host: "clinic-queuesmart-db.mysql.database.azure.com",
    user: "qsadmin",
    password: "btwkgKWeyRE7pZm",
    database: "queuesmart",
    port: 3306,
    ssl: {rejectUnauthorized: true}
})

module.exports = pool

