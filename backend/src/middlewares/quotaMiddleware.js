/**
 * Quota Middleware — Plan-aware quota checking
 *
 * Attaches user plan info to req.planLimits
 * Provides helper to check specific quotas
 */

import { getUserPlanLimits } from '../services/planRepository.js';

/**
 * Middleware that loads user plan limits and attaches them to req
 */
export const loadPlanLimits = async (req, res, next) => {
  try {
    if (!req.user?.id) return next();
    const { plan, limits } = await getUserPlanLimits(req.user.id);
    req.userPlan = plan;
    req.planLimits = limits;
    next();
  } catch (err) {
    console.error('[QuotaMiddleware] Error loading plan limits:', err.message);
    // Don't block the request, use free defaults
    req.userPlan = 'free';
    req.planLimits = {};
    next();
  }
};

/**
 * Check if user has access to a specific feature
 * @param {string} featureKey - e.g. 'has_folders', 'has_flashcards', 'has_tts'
 */
export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!req.planLimits) {
        const { plan, limits } = await getUserPlanLimits(req.user.id);
        req.userPlan = plan;
        req.planLimits = limits;
      }
      const hasFeature = req.planLimits[featureKey];
      if (!hasFeature) {
        return res.status(403).json({
          error: 'FEATURE_LOCKED',
          feature: featureKey,
          plan: req.userPlan,
          message: 'Cette fonctionnalité nécessite un abonnement supérieur'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Check a numeric limit (e.g. max_syntheses, max_conversations)
 * @param {string} limitKey - plan_limits key
 * @param {function} countFn - async function(userId) => current count
 */
export const checkLimit = (limitKey, countFn) => {
  return async (req, res, next) => {
    try {
      if (!req.planLimits) {
        const { plan, limits } = await getUserPlanLimits(req.user.id);
        req.userPlan = plan;
        req.planLimits = limits;
      }
      const limit = req.planLimits[limitKey];
      if (limit === undefined || limit === null) return next(); // No limit defined = unlimited

      const current = await countFn(req.user.id);
      if (current >= limit) {
        return res.status(403).json({
          error: 'LIMIT_REACHED',
          limitKey,
          current,
          limit,
          plan: req.userPlan,
          message: `Limite atteinte (${current}/${limit})`
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
