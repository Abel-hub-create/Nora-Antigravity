import express from 'express';
import * as authService from '../services/authService.js';
import * as userRepository from '../services/userRepository.js';
import { validate } from '../middlewares/validation.js';
import { authenticate } from '../middlewares/auth.js';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middlewares/rateLimiter.js';
import * as validators from '../validators/authValidators.js';

const router = express.Router();

// Register (user must verify email before login)
router.post('/register', registerLimiter, validate(validators.registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    // Don't generate tokens - user must verify email first
    res.status(201).json({
      message: 'Compte cree ! Verifie ton email pour activer ton compte.',
      requiresVerification: true
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginLimiter, validate(validators.loginSchema), async (req, res, next) => {
  try {
    const user = await authService.login(req.body);

    // Generate tokens
    const { accessToken, refreshToken } = await authService.generateTokens(
      user.id,
      req.headers['user-agent'],
      req.ip
    );

    // Set cookie (30 days if rememberMe, session otherwise)
    const cookieMaxAge = req.body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge
    });

    res.json({ user, accessToken });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);

    res.clearCookie('refreshToken');
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Token de rafraîchissement requis' });
    }

    const { accessToken } = await authService.verifyAndRefreshToken(refreshToken);
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, validate(validators.forgotPasswordSchema), async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    // Always return success (security - don't reveal if email exists)
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', validate(validators.resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    next(error);
  }
});

// Update user profile (name and avatar)
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    if (!name && !avatar) {
      return res.status(400).json({ error: 'Nom ou avatar requis' });
    }

    // Validate name length
    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({ error: 'Le nom doit contenir entre 2 et 50 caractères' });
    }

    // Update profile
    await userRepository.updateProfile(req.user.id, { name, avatar });

    // Get updated user
    const updatedUser = await userRepository.findById(req.user.id);

    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

// Sync user data (save progress from frontend)
router.post('/sync', authenticate, validate(validators.syncUserDataSchema), async (req, res, next) => {
  try {
    const updatedUser = await authService.syncUserData(req.user.id, req.body);
    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email verifie avec succes ! Tu peux maintenant te connecter.' });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
router.post('/resend-verification', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    await authService.resendVerificationEmail(email);
    // Always return same message to prevent email enumeration
    res.json({ message: 'Si cet email existe et n\'est pas verifie, un nouveau lien a ete envoye' });
  } catch (error) {
    // Don't leak information about email status - return same success message
    if (error.message === 'Cet email est deja verifie') {
      res.json({ message: 'Si cet email existe et n\'est pas verifie, un nouveau lien a ete envoye' });
    } else {
      next(error);
    }
  }
});

export default router;
