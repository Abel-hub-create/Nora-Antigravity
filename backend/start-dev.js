#!/usr/bin/env node

/**
 * NORA Backend - Development Startup
 *
 * Loads .env.development and starts the server.
 * Used by PM2 via ecosystem.config.cjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load development environment
dotenv.config({ path: join(__dirname, '.env.development') });

console.log('Starting NORA Development Backend...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
console.log(`Table Prefix: ${process.env.DB_TABLE_PREFIX || '(none)'}`);

// Start server
import('./src/server.js');
