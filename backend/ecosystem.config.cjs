/**
 * NORA Backend - PM2 Configuration
 *
 * Two separate processes:
 * - nora-api-prod: Production backend on port 5000
 * - nora-api-dev:  Development backend on port 5001
 *
 * Commands:
 *   pm2 start ecosystem.config.cjs                   # Start all
 *   pm2 start ecosystem.config.cjs --only nora-api-prod  # Start PROD only
 *   pm2 start ecosystem.config.cjs --only nora-api-dev   # Start DEV only
 *   pm2 reload nora-api-prod                         # Reload PROD
 *   pm2 reload nora-api-dev                          # Reload DEV
 *   pm2 logs nora-api-prod                           # View PROD logs
 *   pm2 logs nora-api-dev                            # View DEV logs
 */

module.exports = {
  apps: [
    {
      name: 'nora-api-prod',
      script: 'start-prod.js',
      cwd: '/var/www/mirora.cloud/backend',
      watch: false, // Disabled in production for stability
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'nora-api-dev',
      script: 'start-dev.js',
      cwd: '/var/www/mirora.cloud/backend',
      watch: true, // Enabled for development hot reload
      ignore_watch: ['node_modules', 'uploads', 'logs', '*.log', 'scripts'],
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
