#!/usr/bin/env node

/**
 * Create DEV tables with dev_ prefix
 *
 * This script reads all migration files and creates prefixed copies of tables
 * for the development environment.
 *
 * Usage: node scripts/create-dev-tables.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production env to get DB credentials
dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const PREFIX = 'dev_';

// Tables to prefix (must match the TABLES list in database.js)
const TABLES = [
  'users', 'password_resets', 'refresh_tokens', 'syntheses',
  'flashcards', 'quiz_questions', 'folders', 'folder_syntheses',
  'push_subscriptions', 'daily_progress', 'study_history',
  'revision_sessions', 'revision_completions', 'feedbacks', 'feedback_votes'
];

async function createDevTables() {
  console.log('='.repeat(50));
  console.log('NORA - Create DEV Tables');
  console.log('='.repeat(50));
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log('');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const migrationsDir = path.join(__dirname, '..', 'src', 'database', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files\n`);

    for (const file of sqlFiles) {
      console.log(`Processing: ${file}`);
      const filePath = path.join(migrationsDir, file);
      let sql = await fs.readFile(filePath, 'utf8');

      // Apply prefix to all table names
      const pattern = new RegExp(`\\b(${TABLES.join('|')})\\b`, 'g');
      sql = sql.replace(pattern, `${PREFIX}$1`);

      try {
        await connection.query(sql);
        console.log(`  ✓ Applied successfully`);
      } catch (error) {
        // Ignorable errors (idempotent operations)
        const ignorableCodes = [
          'ER_TABLE_EXISTS_ERROR',      // Table already exists
          'ER_DUP_FIELDNAME',           // Column already exists
          'ER_DUP_KEYNAME',             // Key already exists
          'ER_CANT_DROP_FIELD_OR_KEY',  // Column/key doesn't exist (for DROP)
          'ER_DUP_ENTRY'                // Duplicate entry (for initial data)
        ];

        if (ignorableCodes.includes(error.code)) {
          console.log(`  ⊘ Already applied (skipped): ${error.code}`);
        } else {
          console.log(`  ✗ CRITICAL ERROR: ${error.message}`);
          console.log(`    Code: ${error.code}`);
          throw new Error(`Migration failed at ${file}: ${error.message}`);
        }
      }
    }

    // Verify tables were created
    console.log('\n' + '='.repeat(50));
    console.log('Verifying DEV tables...');
    console.log('='.repeat(50) + '\n');

    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'dev_%'
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME]
    );

    console.log(`Created ${tables.length} DEV tables:`);
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    console.log('\n✓ DEV tables setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start DEV backend: pm2 start ecosystem.config.cjs --only nora-api-dev');
    console.log('2. Build DEV frontend: npm run build:dev');
    console.log('3. Configure Nginx for dev.mirora.cloud');

  } catch (error) {
    console.error('\n✗ Error creating DEV tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createDevTables();
