import { query } from '../config/database.js';

/**
 * Get active session for user + synthese
 */
export const getSession = async (userId, syntheseId) => {
    const sql = `SELECT * FROM revision_sessions WHERE user_id = ? AND synthese_id = ?`;
    const results = await query(sql, [userId, syntheseId]);
    return results[0] || null;
};

/**
 * Start new session (delete any existing first)
 * @param {number} userId
 * @param {number} syntheseId
 * @param {object} options - Optional settings
 * @param {string} options.requirementLevel - 'beginner', 'intermediate', 'expert', or 'custom'
 * @param {object} options.customSettings - Custom precision settings (only for 'custom' level)
 */
export const startSession = async (userId, syntheseId, options = {}) => {
    const { requirementLevel = 'intermediate', customSettings = null } = options;

    // Delete any existing session for this user/synthese
    await query(`DELETE FROM revision_sessions WHERE user_id = ? AND synthese_id = ?`, [userId, syntheseId]);

    // Create new session with requirement level
    const sql = `INSERT INTO revision_sessions (user_id, synthese_id, requirement_level, custom_settings) VALUES (?, ?, ?, ?)`;
    await query(sql, [userId, syntheseId, requirementLevel, customSettings ? JSON.stringify(customSettings) : null]);

    return getSession(userId, syntheseId);
};

/**
 * Sync session state (timer, phase)
 * Updates phase_started_at only when phase changes
 */
export const syncSession = async (userId, syntheseId, data) => {
    const { phase, studyTimeRemaining, pauseTimeRemaining, loopTimeRemaining, currentIteration } = data;

    // Get current session to check if phase changed
    const currentSession = await getSession(userId, syntheseId);
    const phaseChanged = currentSession && currentSession.phase !== phase;

    const sql = phaseChanged
        ? `UPDATE revision_sessions
           SET phase = ?, phase_started_at = NOW(), study_time_remaining = ?, pause_time_remaining = ?, loop_time_remaining = ?, current_iteration = ?, last_activity_at = NOW()
           WHERE user_id = ? AND synthese_id = ?`
        : `UPDATE revision_sessions
           SET phase = ?, study_time_remaining = ?, pause_time_remaining = ?, loop_time_remaining = ?, current_iteration = ?, last_activity_at = NOW()
           WHERE user_id = ? AND synthese_id = ?`;

    await query(sql, [phase, studyTimeRemaining, pauseTimeRemaining, loopTimeRemaining ?? 120, currentIteration, userId, syntheseId]);
};

/**
 * Save user recall text
 */
export const saveRecall = async (userId, syntheseId, userRecall) => {
    const sql = `UPDATE revision_sessions SET user_recall = ?, phase = 'analyzing', phase_started_at = NOW(), last_activity_at = NOW() WHERE user_id = ? AND synthese_id = ?`;
    await query(sql, [userRecall, userId, syntheseId]);
};

/**
 * Save comparison results from AI
 */
export const saveComparison = async (userId, syntheseId, understoodConcepts, missingConcepts) => {
    const sql = `
        UPDATE revision_sessions
        SET understood_concepts = ?, missing_concepts = ?, last_activity_at = NOW()
        WHERE user_id = ? AND synthese_id = ?
    `;
    await query(sql, [JSON.stringify(understoodConcepts), JSON.stringify(missingConcepts), userId, syntheseId]);
};

/**
 * Complete session (move to history)
 */
export const completeSession = async (userId, syntheseId) => {
    const session = await getSession(userId, syntheseId);
    if (!session) return null;

    // Insert into completions history
    await query(
        `INSERT INTO revision_completions (user_id, synthese_id, iterations_count) VALUES (?, ?, ?)`,
        [userId, syntheseId, session.current_iteration]
    );

    // Delete active session
    await query(`DELETE FROM revision_sessions WHERE user_id = ? AND synthese_id = ?`, [userId, syntheseId]);

    return { iterationsCount: session.current_iteration };
};

/**
 * Stop/cancel session without saving to history
 */
export const stopSession = async (userId, syntheseId) => {
    await query(`DELETE FROM revision_sessions WHERE user_id = ? AND synthese_id = ?`, [userId, syntheseId]);
};

/**
 * Check if session expired (15 min inactivity)
 */
export const isSessionExpired = (session) => {
    if (!session) return true;
    const elapsed = (Date.now() - new Date(session.last_activity_at).getTime()) / 1000;
    return elapsed > 900; // 15 minutes
};

/**
 * Get revision completion count for a synthese
 */
export const getCompletionCount = async (userId, syntheseId) => {
    const sql = `SELECT COUNT(*) as count FROM revision_completions WHERE user_id = ? AND synthese_id = ?`;
    const results = await query(sql, [userId, syntheseId]);
    return results[0]?.count || 0;
};

/**
 * Helper to safely parse JSON from database
 */
export const safeJsonParse = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};
