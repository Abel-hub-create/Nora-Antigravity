import * as adminTokenService from '../services/adminTokenService.js';
import * as adminRepository from '../services/adminRepository.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    let payload;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      payload = adminTokenService.verifyAdminAccessToken(authHeader.substring(7));
    } else {
      const token = req.cookies?.adminAccessToken;
      if (!token) {
        return res.status(401).json({ error: 'Admin authentication required', code: 'ADMIN_AUTH_REQUIRED' });
      }
      payload = adminTokenService.verifyAdminAccessToken(token);
    }

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient privileges', code: 'NOT_ADMIN' });
    }

    const admin = await adminRepository.findAdminById(payload.adminId);
    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found', code: 'ADMIN_NOT_FOUND' });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token', code: 'INVALID_ADMIN_TOKEN' });
  }
};
