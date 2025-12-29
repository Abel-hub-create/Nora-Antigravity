import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const query = async (sql, params) => {
  // Use pool.query for bulk inserts and LIMIT/OFFSET queries
  // execute() doesn't support these with placeholders
  const needsQuery = sql.includes('VALUES ?') || sql.includes('LIMIT ?');
  const [rows] = needsQuery
    ? await pool.query(sql, params)
    : await pool.execute(sql, params);
  return rows;
};

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected successfully');
    conn.release();
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    return false;
  }
};
