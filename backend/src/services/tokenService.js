import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtConfig.accessSecret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};
