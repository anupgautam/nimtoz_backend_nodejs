// db.js
import mysql from 'mysql2/promise';

const db = mysql.createPool({
    host: 'my.hosteditor.com',
    user: 'nimtozco_nimtozco',
    password: 'Office@0977',
    database: 'nimtozco_nimtoz',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000, // 30 seconds timeout
    acquireTimeout: 30000, // 30 seconds to acquire a connection
});

db.getConnection()
    .then((connection) => {
        console.log("Connected to MySQL database.");
        connection.release(); // Release the connection back to the pool
    })
    .catch((err) => {
        console.error("Error connecting to MySQL:", err);
    });

// Handle pool errors globally
db.on('error', (err) => {
    console.error("Pool error:", err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log("Connection lost, attempting to reconnect...");
        // Optionally, reinitialize the pool here if needed
    }
});

export default db;