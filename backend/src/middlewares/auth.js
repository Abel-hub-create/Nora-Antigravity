import * as tokenService from '../services/tokenService.js';
import * as userRepository from '../services/userRepository.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // Verify token
    const payload = tokenService.verifyRefreshToken(refreshToken);

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
