import { query } from '../config/database.js';

export async function createTicket({ userId, email, category, subject, message }) {
  const result = await query(
    `INSERT INTO support_tickets (user_id, email, category, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [userId ?? null, email ?? null, category, subject, message]
  );
  return result.insertId;
}

export async function getUserTickets(userId) {
  return query(
    `SELECT id, category, subject, message, admin_reply, replied_at, created_at
     FROM support_tickets
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function adminGetAll() {
  return query(
    `SELECT t.id, t.user_id, t.email, t.category, t.subject, t.message,
            t.admin_reply, t.replied_at, t.created_at,
            u.name AS user_name, u.email AS user_email
     FROM support_tickets t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY (t.admin_reply IS NOT NULL) ASC, t.created_at DESC`
  );
}

export async function adminGetUnansweredCount() {
  const [row] = await query(
    `SELECT COUNT(*) AS cnt FROM support_tickets WHERE admin_reply IS NULL`
  );
  return Number(row?.cnt ?? 0);
}

export async function adminReply(ticketId, reply) {
  await query(
    `UPDATE support_tickets SET admin_reply = ?, replied_at = NOW() WHERE id = ?`,
    [reply, ticketId]
  );
  return { ok: true };
}

export async function adminDelete(ticketId) {
  await query(`DELETE FROM support_tickets WHERE id = ?`, [ticketId]);
  return { ok: true };
}
