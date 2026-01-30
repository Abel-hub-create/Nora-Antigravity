import express from 'express';
import * as authService from '../services/authService.js';
import * as userRepository from '../services/userRepository.js';
import * as googleAuthService from '../services/googleAuthService.js';
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

// Google OAuth login/register
router.post('/google', loginLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    // 1. Verify the Google token
    const googleUser = await googleAuthService.verifyGoogleToken(credential);

    // 2. Find user by google_id OR email
    let user = await userRepository.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Check if account with same email exists
      const existingUser = await userRepository.findByEmail(googleUser.email);

      if (existingUser) {
        // Link Google account to existing account
        await userRepository.linkGoogleAccount(existingUser.id, googleUser.googleId);
        user = existingUser;
      } else {
        // Create new Google user
        user = await userRepository.createGoogleUser(googleUser);
      }
    }

    // 3. Generate JWT tokens
    const { accessToken, refreshToken } = await authService.generateTokens(
      user.id,
      req.headers['user-agent'],
      req.ip
    );

    // 4. Set refresh token cookie (30 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // 5. Update last login
    await userRepository.updateLastLogin(user.id);

    // 6. Get full user data
    const fullUser = await userRepository.findById(user.id);

    res.json({ user: fullUser, accessToken });
  } catch (error) {
    console.error('[Auth Google] Error:', error);
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
    const { email, language } = req.body;
    await authService.forgotPassword(email, language || 'fr');
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

// Complete onboarding (first-time setup)
router.patch('/onboarding', authenticate, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    // Name is required for onboarding
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Le prenom est requis (minimum 2 caracteres)' });
    }

    // Validate name length
    if (name.length > 50) {
      return res.status(400).json({ error: 'Le prenom ne peut pas depasser 50 caracteres' });
    }

    // Complete onboarding (updates name, avatar if provided, and sets onboarding_completed = true)
    await userRepository.completeOnboarding(req.user.id, { name: name.trim(), avatar });

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

// Update user preferences (theme and language)
router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const { theme, language } = req.body;

    // Validate theme
    if (theme && !['dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'Theme invalide' });
    }

    // Validate language (fr, en, es, zh)
    if (language && !['fr', 'en', 'es', 'zh'].includes(language)) {
      return res.status(400).json({ error: 'Langue invalide' });
    }

    // Update preferences
    await userRepository.updatePreferences(req.user.id, { theme, language });

    // Get updated user
    const updatedUser = await userRepository.findById(req.user.id);

    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.params.token);
    if (result.alreadyVerified) {
      res.json({ message: 'Email deja verifie ! Tu peux te connecter.', alreadyVerified: true });
    } else {
      res.json({ message: 'Email verifie avec succes ! Tu peux maintenant te connecter.', alreadyVerified: false });
    }
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/account', authenticate, async (req, res, next) => {
  try {
    await authService.deleteAccount(req.user.id);
    res.clearCookie('refreshToken');
    res.json({ message: 'Compte supprime avec succes' });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
router.post('/resend-verification', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email, language } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    await authService.resendVerificationEmail(email, language || 'fr');
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
