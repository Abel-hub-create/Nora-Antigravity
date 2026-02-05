import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Table prefix for environment isolation (DEV uses 'dev_', PROD uses '')
const TABLE_PREFIX = process.env.DB_TABLE_PREFIX || '';

// List of all NORA database tables
const TABLES = [
  'users', 'password_resets', 'refresh_tokens', 'syntheses',
  'flashcards', 'quiz_questions', 'folders', 'folder_syntheses',
  'push_subscriptions', 'daily_progress', 'study_history',
  'revision_sessions', 'revision_completions', 'feedbacks', 'feedback_votes'
];

// Validate prefix contains only safe characters and ends with underscore
const validatePrefix = (prefix) => {
  if (!prefix) return true;
  if (!/^[a-zA-Z0-9]+_$/.test(prefix)) {
    throw new Error(`Invalid DB_TABLE_PREFIX: "${prefix}". Must be alphanumeric and end with underscore (e.g., 'dev_').`);
  }
  return true;
};

validatePrefix(TABLE_PREFIX);

// Apply table prefix to SQL queries automatically
const applyTablePrefix = (sql) => {
  if (!TABLE_PREFIX) return sql;

  // Create regex pattern to match table names with word boundaries
  // This handles: FROM users, JOIN users, INTO users, UPDATE users, etc.
  const pattern = new RegExp(`\\b(${TABLES.join('|')})\\b`, 'g');
  return sql.replace(pattern, `${TABLE_PREFIX}$1`);
};

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
  // Always use pool.query() - more flexible with parameter types
  // pool.execute() has issues with LIMIT, bulk inserts, and type coercion
  const prefixedSql = applyTablePrefix(sql);
  const [rows] = await pool.query(prefixedSql, params);
  return rows;
};

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected successfully');
    console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`Table prefix: ${TABLE_PREFIX || '(none - PROD)'}`);
    conn.release();
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    return false;
  }
};

// Export for testing or manual prefix needs
export { TABLE_PREFIX, applyTablePrefix };
