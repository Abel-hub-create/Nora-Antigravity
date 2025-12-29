module.exports = {
  apps: [{
    name: 'nora-api',
    script: 'src/server.js',
    cwd: '/var/www/mirora.cloud/backend',
    watch: true,
    ignore_watch: ['node_modules', 'uploads', 'logs', '*.log'],
    env: {
      NODE_ENV: 'production'
    }
  }]
};
