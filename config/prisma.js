// db.js
import mysql from 'mysql2/promise';


const globalForMySQL = global;

const dbConfig = {
    host: process.env.DB_HOST || 'nimtoz_nimtoz',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Office@0977',
    database: process.env.DB_NAME || 'nimtoz_nimtozco',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

export const db =
    globalForMySQL.mysql ||
    mysql.createPool(dbConfig);

if (process.env.NODE_ENV !== 'production') {
    globalForMySQL.mysql = db;
}

// Optional: Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down MySQL connection pool...');
    await db.end();
    process.exit(0);
});

export default db;