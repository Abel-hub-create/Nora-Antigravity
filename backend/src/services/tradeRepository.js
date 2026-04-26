import { query, pool } from '../config/database.js';
import { findByShareCode } from './userRepository.js';
import { sendNotification } from './notificationService.js';

// Max card copies by plan
function getMaxCopies(planType) {
  return planType === 'free' ? 2 : 25;
}

// Count how many copies of a card a user has
async function countUserCard(userId, cardId) {
  const [row] = await query(
    'SELECT COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id = ?',
    [userId, cardId]
  );
  return row?.cnt ?? 0;
}

// ── Envoyer une demande ──────────────────────────────────────────────────────

export async function createTradeRequest(initiatorId, receiverShareCode, offeredCardId) {
  // Find receiver
  const receiver = await findByShareCode(receiverShareCode.trim().toUpperCase());
  if (!receiver) return { error: 'RECEIVER_NOT_FOUND' };
  if (receiver.id === initiatorId) return { error: 'CANNOT_TRADE_YOURSELF' };

  // Verify initiator owns the offered card
  const initiatorCount = await countUserCard(initiatorId, offeredCardId);
  if (initiatorCount === 0) return { error: 'CARD_NOT_OWNED' };

  // Prevent duplicate pending requests
  const existing = await query(
    `SELECT id FROM card_trade_requests
     WHERE initiator_id = ? AND receiver_id = ? AND offered_card_id = ? AND status = 'pending'`,
    [initiatorId, receiver.id, offeredCardId]
  );
  if (existing.length > 0) return { error: 'REQUEST_ALREADY_PENDING' };

  const result = await query(
    `INSERT INTO card_trade_requests (initiator_id, receiver_id, offered_card_id)
     VALUES (?, ?, ?)`,
    [initiatorId, receiver.id, offeredCardId]
  );

  // Notify receiver
  const [initiator] = await query('SELECT name FROM users WHERE id = ?', [initiatorId]);
  await sendNotification(
    receiver.id,
    '🃏 Demande d\'échange',
    `${initiator?.name ?? 'Quelqu\'un'} vous propose un échange de carte !`
  ).catch(() => {});

  return { ok: true, requestId: result.insertId, receiver };
}

// ── Boîte de réception ───────────────────────────────────────────────────────

export async function getInbox(userId) {
  return query(
    `SELECT
       r.id, r.created_at, r.status,
       c.id AS card_id, c.card_name, c.set_name, c.set_abbr, c.author, c.image, c.rarity, c.rarity_order, c.quote, c.explanation,
       u.id AS initiator_id, u.name AS initiator_name, u.level AS initiator_level, u.avatar AS initiator_avatar
     FROM card_trade_requests r
     JOIN cards c ON c.id = r.offered_card_id
     JOIN users u ON u.id = r.initiator_id
     WHERE r.receiver_id = ? AND r.status = 'pending'
     ORDER BY r.created_at DESC`,
    [userId]
  );
}

export async function getInboxCount(userId) {
  const [row] = await query(
    `SELECT COUNT(*) AS cnt FROM card_trade_requests WHERE receiver_id = ? AND status = 'pending'`,
    [userId]
  );
  return row?.cnt ?? 0;
}

// ── Refuser ──────────────────────────────────────────────────────────────────

export async function refuseRequest(requestId, receiverId) {
  const [req] = await query(
    `SELECT initiator_id, offered_card_id FROM card_trade_requests
     WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
    [requestId, receiverId]
  );
  if (!req) return { error: 'REQUEST_NOT_FOUND' };

  await query(
    `UPDATE card_trade_requests SET status = 'refused' WHERE id = ?`,
    [requestId]
  );

  const [receiver] = await query('SELECT name FROM users WHERE id = ?', [receiverId]);
  const [card] = await query('SELECT card_name FROM cards WHERE id = ?', [req.offered_card_id]);
  await sendNotification(
    req.initiator_id,
    '❌ Échange refusé',
    `${receiver?.name ?? 'L\'utilisateur'} a refusé votre demande d\'échange de "${card?.card_name ?? 'carte'}".`
  ).catch(() => {});

  return { ok: true };
}

// ── Cartes disponibles pour le destinataire ──────────────────────────────────

export async function getAvailableCards(requestId, receiverId) {
  const [req] = await query(
    `SELECT r.initiator_id, r.offered_card_id, c.rarity_order
     FROM card_trade_requests r
     JOIN cards c ON c.id = r.offered_card_id
     WHERE r.id = ? AND r.receiver_id = ? AND r.status = 'pending'`,
    [requestId, receiverId]
  );
  if (!req) return { error: 'REQUEST_NOT_FOUND' };

  const [initiator] = await query('SELECT plan_type FROM users WHERE id = ?', [req.initiator_id]);
  const initiatorMax = getMaxCopies(initiator?.plan_type);

  // Compute rarity bounds in JS to avoid UNSIGNED subtraction overflow in MySQL
  const minRarity = Math.max(0, req.rarity_order - 1);
  const maxRarity = req.rarity_order + 1;

  // Unique cards the receiver owns (count ≥ 1) within rarity ±1
  const cards = await query(
    `SELECT c.*, COUNT(uc.id) AS count
     FROM user_cards uc
     JOIN cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND c.rarity_order BETWEEN ? AND ?
     GROUP BY c.id
     ORDER BY c.rarity_order, c.id`,
    [receiverId, minRarity, maxRarity]
  );

  // Check initiator stock for each card
  const enriched = await Promise.all(cards.map(async (card) => {
    const initiatorCount = await countUserCard(req.initiator_id, card.id);
    return {
      ...card,
      count: Number(card.count),
      initiator_stock_full: initiatorCount >= initiatorMax,
    };
  }));

  return { cards: enriched, offeredRarityOrder: req.rarity_order };
}

// ── Accepter et exécuter l'échange ───────────────────────────────────────────

export async function acceptRequest(requestId, receiverId, requestedCardId) {
  // Get plan limits before transaction (read-only, no lock needed)
  const [receiverUser] = await query('SELECT plan_type FROM users WHERE id = ?', [receiverId]);
  const receiverMax = getMaxCopies(receiverUser?.plan_type);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the request row to prevent concurrent double-accept (TOCTOU fix)
    const [[req]] = await conn.query(
      `SELECT r.initiator_id, r.offered_card_id, c.rarity_order AS offered_rarity_order
       FROM card_trade_requests r
       JOIN cards c ON c.id = r.offered_card_id
       WHERE r.id = ? AND r.receiver_id = ? AND r.status = 'pending'
       FOR UPDATE`,
      [requestId, receiverId]
    );
    if (!req) { await conn.rollback(); conn.release(); return { error: 'REQUEST_NOT_FOUND' }; }

    const { initiator_id, offered_card_id, offered_rarity_order } = req;

    // Server-side rarity validation (prevents picker bypass by malicious client)
    const [[reqCardRow]] = await conn.query(
      'SELECT rarity_order FROM cards WHERE id = ?',
      [requestedCardId]
    );
    if (!reqCardRow || Math.abs(reqCardRow.rarity_order - offered_rarity_order) > 1) {
      await conn.rollback(); conn.release();
      return { error: 'INVALID_RARITY' };
    }

    const [initiatorUser] = await query('SELECT plan_type FROM users WHERE id = ?', [initiator_id]);
    const initiatorMax = getMaxCopies(initiatorUser?.plan_type);

    // Re-check counts inside transaction (all under the row lock)
    const [[icRow]] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id = ?',
      [initiator_id, offered_card_id]
    );
    const [[rcRow]] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id = ?',
      [receiverId, requestedCardId]
    );
    const [[irRow]] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id = ?',
      [initiator_id, requestedCardId]
    );
    const [[rrRow]] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id = ?',
      [receiverId, offered_card_id]
    );

    if (Number(icRow.cnt) === 0) { await conn.rollback(); conn.release(); return { error: 'INITIATOR_CARD_GONE' }; }
    if (Number(rcRow.cnt) === 0) { await conn.rollback(); conn.release(); return { error: 'RECEIVER_CARD_GONE' }; }
    if (Number(irRow.cnt) >= initiatorMax) { await conn.rollback(); conn.release(); return { error: 'INITIATOR_STOCK_FULL' }; }
    if (Number(rrRow.cnt) >= receiverMax)  { await conn.rollback(); conn.release(); return { error: 'RECEIVER_STOCK_FULL' }; }

    // Remove 1 copy: initiator loses offered card
    const [delInit] = await conn.query(
      'DELETE FROM user_cards WHERE user_id = ? AND card_id = ? LIMIT 1',
      [initiator_id, offered_card_id]
    );
    if (delInit.affectedRows !== 1) {
      await conn.rollback(); conn.release();
      return { error: 'INITIATOR_CARD_GONE' };
    }
    // Remove 1 copy: receiver loses requested card
    const [delRecv] = await conn.query(
      'DELETE FROM user_cards WHERE user_id = ? AND card_id = ? LIMIT 1',
      [receiverId, requestedCardId]
    );
    if (delRecv.affectedRows !== 1) {
      await conn.rollback(); conn.release();
      return { error: 'RECEIVER_CARD_GONE' };
    }

    // Receiver gains offered card
    await conn.query(
      'INSERT INTO user_cards (user_id, card_id, source) VALUES (?, ?, ?)',
      [receiverId, offered_card_id, 'trade']
    );
    // Initiator gains requested card
    await conn.query(
      'INSERT INTO user_cards (user_id, card_id, source) VALUES (?, ?, ?)',
      [initiator_id, requestedCardId, 'trade']
    );

    // Update request
    await conn.query(
      `UPDATE card_trade_requests SET status = 'accepted', requested_card_id = ? WHERE id = ?`,
      [requestedCardId, requestId]
    );

    await conn.commit();
    conn.release();

    // Fetch card names for notification (use standalone query, conn is released)
    const [offCard]  = await query('SELECT card_name FROM cards WHERE id = ?', [offered_card_id]).catch(() => [{}]);
    const [reqCard]  = await query('SELECT card_name FROM cards WHERE id = ?', [requestedCardId]).catch(() => [{}]);
    const [recUser]  = await query('SELECT name FROM users WHERE id = ?', [receiverId]).catch(() => [{}]);

    // Notify initiator
    await sendNotification(
      initiator_id,
      '✅ Échange accepté !',
      `${recUser?.name ?? 'Le destinataire'} a accepté votre échange. Vous avez reçu "${reqCard?.card_name ?? 'une carte'}" !`
    ).catch(() => {});

    return { ok: true, offeredCardId: offered_card_id, requestedCardId };
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
}
