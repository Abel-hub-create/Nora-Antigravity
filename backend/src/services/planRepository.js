import { query } from '../config/database.js';

// ─── Plans ───────────────────────────────────────────────────────────────────

export const getAllPlans = async () => {
  const plans = await query(`SELECT * FROM plans ORDER BY sort_order ASC`);
  for (const plan of plans) {
    plan.limits = await query(`SELECT * FROM plan_limits WHERE plan_id = ?`, [plan.id]);
  }
  return plans;
};

export const getActivePlans = async () => {
  const plans = await query(`SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC`);
  for (const plan of plans) {
    plan.limits = await query(`SELECT * FROM plan_limits WHERE plan_id = ?`, [plan.id]);
  }
  return plans;
};

export const getPlanBySlug = async (slug) => {
  const rows = await query(`SELECT * FROM plans WHERE slug = ? LIMIT 1`, [slug]);
  if (!rows[0]) return null;
  rows[0].limits = await query(`SELECT * FROM plan_limits WHERE plan_id = ?`, [rows[0].id]);
  return rows[0];
};

export const getPlanById = async (id) => {
  const rows = await query(`SELECT * FROM plans WHERE id = ? LIMIT 1`, [id]);
  if (!rows[0]) return null;
  rows[0].limits = await query(`SELECT * FROM plan_limits WHERE plan_id = ?`, [rows[0].id]);
  return rows[0];
};

export const updatePlan = async (id, { name, description, price_monthly, price_type, stripe_price_id, is_active, sort_order }) => {
  await query(
    `UPDATE plans SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price_monthly = COALESCE(?, price_monthly),
      price_type = COALESCE(?, price_type),
      stripe_price_id = COALESCE(?, stripe_price_id),
      is_active = COALESCE(?, is_active),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ?`,
    [name, description, price_monthly, price_type, stripe_price_id, is_active, sort_order, id]
  );
  return getPlanById(id);
};

export const updatePlanLimit = async (planId, limitKey, limitValue, label) => {
  await query(
    `INSERT INTO plan_limits (plan_id, limit_key, limit_value, label)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE limit_value = VALUES(limit_value), label = COALESCE(VALUES(label), label)`,
    [planId, limitKey, limitValue, label || null]
  );
};

export const deletePlanLimit = async (planId, limitKey) => {
  await query(`DELETE FROM plan_limits WHERE plan_id = ? AND limit_key = ?`, [planId, limitKey]);
};

// ─── User plan helpers ───────────────────────────────────────────────────────

export const getUserPlanLimits = async (userId) => {
  // Get the user's current plan type
  const users = await query(`SELECT plan_type FROM users WHERE id = ? LIMIT 1`, [userId]);
  const planType = users[0]?.plan_type || 'free';

  const plan = await getPlanBySlug(planType);
  if (!plan) return { plan: 'free', limits: {} };

  const limits = {};
  for (const l of plan.limits) {
    limits[l.limit_key] = l.limit_value;
  }
  return { plan: planType, limits };
};

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const getActiveSubscription = async (userId) => {
  const rows = await query(
    `SELECT s.*, p.slug as plan_slug, p.name as plan_name
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const getSubscriptionByStripeId = async (stripeSubscriptionId) => {
  const rows = await query(
    `SELECT * FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1`,
    [stripeSubscriptionId]
  );
  return rows[0] || null;
};

export const createSubscription = async ({ user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, promo_code_id, student_count }) => {
  const result = await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, promo_code_id, student_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, plan_id, status || 'active', stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, promo_code_id, student_count]
  );
  return result.insertId;
};

export const updateSubscription = async (id, fields) => {
  const allowed = ['status', 'current_period_start', 'current_period_end', 'cancel_at_period_end', 'canceled_at', 'student_count'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?`, params);
};

export const updateSubscriptionByStripeId = async (stripeSubscriptionId, fields) => {
  const allowed = ['status', 'current_period_start', 'current_period_end', 'cancel_at_period_end', 'canceled_at'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  params.push(stripeSubscriptionId);
  await query(`UPDATE subscriptions SET ${sets.join(', ')} WHERE stripe_subscription_id = ?`, params);
};

export const setUserPlan = async (userId, planSlug) => {
  await query(`UPDATE users SET plan_type = ? WHERE id = ?`, [planSlug, userId]);
};

// ─── School requests ─────────────────────────────────────────────────────────

export const createSchoolRequest = async ({ school_name, contact_email, contact_name, student_count, message }) => {
  const result = await query(
    `INSERT INTO school_requests (school_name, contact_email, contact_name, student_count, message)
     VALUES (?, ?, ?, ?, ?)`,
    [school_name, contact_email, contact_name, student_count, message]
  );
  return result.insertId;
};

export const getSchoolRequests = async ({ page = 1, limit = 50, status = 'all' }) => {
  const offset = (page - 1) * limit;
  let where = '1=1';
  const params = [];
  if (status !== 'all') {
    where = 'status = ?';
    params.push(status);
  }
  const countRows = await query(`SELECT COUNT(*) as total FROM school_requests WHERE ${where}`, params);
  const total = Number(countRows[0].total);
  const rows = await query(
    `SELECT * FROM school_requests WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { requests: rows, total, page, totalPages: Math.ceil(total / limit) };
};

export const updateSchoolRequest = async (id, { status, admin_notes }) => {
  const sets = [];
  const params = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (admin_notes !== undefined) { sets.push('admin_notes = ?'); params.push(admin_notes); }
  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE school_requests SET ${sets.join(', ')} WHERE id = ?`, params);
};

export const deleteSchoolRequest = async (id) => {
  await query(`DELETE FROM school_requests WHERE id = ?`, [id]);
};

// ─── Promo codes ─────────────────────────────────────────────────────────────

export const getPromoCodes = async () => {
  return query(`SELECT * FROM promo_codes ORDER BY created_at DESC`);
};

export const getPromoCodeByCode = async (code) => {
  const rows = await query(`SELECT * FROM promo_codes WHERE code = ? LIMIT 1`, [code.toUpperCase()]);
  return rows[0] || null;
};

export const getPromoCodeById = async (id) => {
  const rows = await query(`SELECT * FROM promo_codes WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const createPromoCode = async ({ code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans, stripe_coupon_id }) => {
  const result = await query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans, stripe_coupon_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [code.toUpperCase(), discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans ? JSON.stringify(applicable_plans) : null, stripe_coupon_id]
  );
  return result.insertId;
};

export const updatePromoCode = async (id, fields) => {
  const allowed = ['code', 'discount_type', 'discount_value', 'max_uses', 'valid_from', 'valid_until', 'applicable_plans', 'is_active', 'stripe_coupon_id'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      let val = fields[key];
      if (key === 'code') val = val.toUpperCase();
      if (key === 'applicable_plans' && val) val = JSON.stringify(val);
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  await query(`UPDATE promo_codes SET ${sets.join(', ')} WHERE id = ?`, params);
};

export const deletePromoCode = async (id) => {
  await query(`DELETE FROM promo_codes WHERE id = ?`, [id]);
};

export const incrementPromoCodeUse = async (id) => {
  await query(`UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?`, [id]);
};

export const validatePromoCode = async (code, planSlug) => {
  const promo = await getPromoCodeByCode(code);
  if (!promo) return { valid: false, error: 'Code promo invalide' };
  if (!promo.is_active) return { valid: false, error: 'Code promo désactivé' };
  if (promo.max_uses && promo.current_uses >= promo.max_uses) return { valid: false, error: 'Code promo expiré (limite atteinte)' };
  if (promo.valid_from && new Date(promo.valid_from) > new Date()) return { valid: false, error: 'Code promo pas encore actif' };
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) return { valid: false, error: 'Code promo expiré' };
  if (promo.applicable_plans) {
    const plans = typeof promo.applicable_plans === 'string' ? JSON.parse(promo.applicable_plans) : promo.applicable_plans;
    if (Array.isArray(plans) && plans.length > 0 && !plans.includes(planSlug)) {
      return { valid: false, error: 'Code promo non applicable à ce plan' };
    }
  }
  return { valid: true, promo };
};
