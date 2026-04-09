export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur serveur interne';

  res.status(statusCode).json({
    error: message,
    ...(err.code && { code: err.code }),
    ...(err.reason !== undefined && { reason: err.reason }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
