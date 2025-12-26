import * as tokenService from '../services/tokenService.js';
import * as userRepository from '../services/userRepository.js';

export const authenticate = async (req, res, next) => {
  try {
    let payload;

    // Try Bearer token first (from Authorization header)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      payload = tokenService.verifyAccessToken(accessToken);
    } else {
      // Fallback to refresh token from cookie
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: 'Authentification requise' });
      }
      payload = tokenService.verifyRefreshToken(refreshToken);
    }

    // Get user
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};
