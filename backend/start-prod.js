#!/usr/bin/env node

/**
 * NORA Backend - Production Startup
 *
 * Loads .env.production and starts the server.
 * Used by PM2 via ecosystem.config.cjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load production environment
dotenv.config({ path: join(__dirname, '.env.production') });

console.log('Starting NORA Production Backend...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);

// Start server
import('./src/server.js');
