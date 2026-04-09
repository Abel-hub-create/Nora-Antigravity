export const adminConfig = {
  jwtSecret:        process.env.ADMIN_JWT_SECRET,
  jwtRefreshSecret: process.env.ADMIN_JWT_REFRESH_SECRET,
  accessExpiresIn:  '15m',
  refreshExpiresIn: '8h',
  allowedEmails:    ['abeldemora@gmail.com', 'merchezjulien2011@gmail.com'],
};
