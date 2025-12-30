import app from './app.js';
import { testConnection } from './config/database.js';
import { startNotificationCron } from './cron/notificationCron.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);

    // Start notification cron job
    startNotificationCron();
  });
};

start();
