import { query, pool } from '../config/database.js';

function getMaxCopies(planType) {
  return planType === 'free' ? 2 : 25;
}

// ── Rarity pools ─────────────────────────────────────────────────────────────

// Per-booster: card 1 = commun/chill, card 2 = rare/epique, card 3 = rare+
const POOL_COMMON  = { commun: 70, chill: 60 };
const POOL_MEDIUM  = { rare: 40, epique: 20 };
const POOL_HIGH    = { rare: 30, epique: 20, mythique: 10, legendaire: 5, dot: 1 };

// For daily card generation (full spectrum)
const POOL_DAILY = { commun: 70, chill: 60, rare: 40, epique: 20, mythique: 10, legendaire: 5, dot: 1 };

// Pack definitions: { boosters, cost }
const PACKS = {
  one:  { boosters: 1,  cost: 100 },
  five: { boosters: 5,  cost: 400 },
  ten:  { boosters: 10, cost: 800 },
};

// Daily prices per rarity
const DAILY_PRICES = { commun: 10, chill: 15, rare: 20, epique: 35, mythique: 75, legendaire: 150, dot: 300 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRarity(pool) {
  const total = Object.values(pool).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [rarity, w] of Object.entries(pool)) {
    r -= w;
    if (r <= 0) return rarity;
  }
  return Object.keys(pool)[0];
}

function pickCard(cardsByRarity, pool) {
  let attempts = 0;
  while (attempts++ < 30) {
    const rarity = pickRarity(pool);
    const opts = cardsByRarity[rarity];
    if (opts?.length) return opts[Math.floor(Math.random() * opts.length)];
  }
  // fallback
  const all = Object.values(cardsByRarity).flat();
  return all[Math.floor(Math.random() * all.length)];
}

function groupByRarity(cards) {
  return cards.reduce((acc, c) => {
    if (!acc[c.rarity]) acc[c.rarity] = [];
    acc[c.rarity].push(c);
    return acc;
  }, {});
}

function buildBooster(cardsByRarity) {
  return [
    pickCard(cardsByRarity, POOL_COMMON),  // card 1: commun or chill
    pickCard(cardsByRarity, POOL_MEDIUM),  // card 2: rare or epique only
    pickCard(cardsByRarity, POOL_HIGH),    // card 3: rare+ (mythique/légendaire possible)
  ];
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function getAllCards() {
  return query('SELECT * FROM cards ORDER BY rarity_order, id');
}

export async function getUserCards(userId) {
  return query(
    `SELECT c.*, uc.source, uc.obtained_at AS owned_at
     FROM user_cards uc JOIN cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? ORDER BY uc.obtained_at DESC`,
    [userId]
  );
}

export async function getUserCardIds(userId) {
  const rows = await query('SELECT card_id FROM user_cards WHERE user_id = ?', [userId]);
  return rows.map(r => r.card_id);
}

export async function openPack(userId, packType) {
  const packDef = PACKS[packType];
  if (!packDef) throw new Error('Pack inconnu');

  const allCards = await query('SELECT * FROM cards');
  const byRarity = groupByRarity(allCards);

  // Build all boosters
  const packs = Array.from({ length: packDef.boosters }, () => buildBooster(byRarity));
  const allPulled = packs.flat();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT coins FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user || user.coins < packDef.cost) {
      await conn.rollback(); conn.release();
      return { error: 'NOT_ENOUGH_COINS' };
    }
    await conn.query('UPDATE users SET coins = coins - ? WHERE id = ?', [packDef.cost, userId]);

    // Enforce per-card copy limit during pack opening
    const [[userRow]] = await conn.query('SELECT plan_type FROM users WHERE id = ?', [userId]);
    const maxCopies = getMaxCopies(userRow?.plan_type);

    // Count current copies of all pulled cards in one query
    const pulledIds = [...new Set(allPulled.map(c => c.id))];
    const [countRows] = await conn.query(
      `SELECT card_id, COUNT(*) AS cnt FROM user_cards WHERE user_id = ? AND card_id IN (?) GROUP BY card_id`,
      [userId, pulledIds]
    );
    const copyCounts = {};
    for (const row of countRows) copyCounts[row.card_id] = Number(row.cnt);

    for (const card of allPulled) {
      const current = copyCounts[card.id] ?? 0;
      if (current >= maxCopies) continue; // already at max, skip silently
      await conn.query(
        'INSERT INTO user_cards (user_id, card_id, source) VALUES (?, ?, ?)',
        [userId, card.id, 'pack']
      );
      copyCounts[card.id] = current + 1;
    }
    await conn.commit(); conn.release();
    return { packs, cost: packDef.cost };
  } catch (err) {
    await conn.rollback(); conn.release();
    throw err;
  }
}

export async function getDailyCards(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await query(
    'SELECT card_id FROM shop_daily_cards WHERE user_id = ? AND valid_date = ?',
    [userId, today]
  );

  let dailyCardIds;

  if (existing.length >= 6) {
    dailyCardIds = existing.map(r => r.card_id);
  } else {
    const allCards = await query('SELECT * FROM cards');
    const byRarity = groupByRarity(allCards);

    // Generate 6 cards weighted by POOL_DAILY, max 3 identical
    const counts = {};
    const chosen = [];
    let attempts = 0;

    while (chosen.length < 6 && attempts < 200) {
      attempts++;
      const card = pickCard(byRarity, POOL_DAILY);
      if ((counts[card.id] ?? 0) >= 3) continue;
      counts[card.id] = (counts[card.id] ?? 0) + 1;
      chosen.push(card);
    }

    await query('DELETE FROM shop_daily_cards WHERE user_id = ? AND valid_date != ?', [userId, today]);
    for (let i = 0; i < chosen.length; i++) {
      await query(
        'INSERT IGNORE INTO shop_daily_cards (user_id, card_slot, card_id, valid_date) VALUES (?,?,?,?)',
        [userId, i + 1, chosen[i].id, today]
      );
    }
    dailyCardIds = chosen.map(c => c.id);
  }

  if (!dailyCardIds.length) return [];

  const placeholders = dailyCardIds.map(() => '?').join(',');
  const cards = await query(`SELECT * FROM cards WHERE id IN (${placeholders})`, dailyCardIds);
  const ownedIds = await getUserCardIds(userId);

  // Re-order by slot order + add price
  return dailyCardIds.map(id => {
    const c = cards.find(c => c.id === id);
    if (!c) return null;
    return { ...c, owned: ownedIds.includes(c.id), price: DAILY_PRICES[c.rarity] ?? 10 };
  }).filter(Boolean);
}

export async function buyDailyCard(userId, cardId) {
  const today = new Date().toISOString().slice(0, 10);
  const [slot] = await query(
    'SELECT * FROM shop_daily_cards WHERE user_id = ? AND card_id = ? AND valid_date = ?',
    [userId, cardId, today]
  );
  if (!slot) return { error: 'CARD_NOT_AVAILABLE' };

  const [card] = await query('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return { error: 'CARD_NOT_FOUND' };

  const price = DAILY_PRICES[card.rarity] ?? 10;

  const owned = await getUserCardIds(userId);
  if (owned.includes(cardId)) return { error: 'ALREADY_OWNED' };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT coins FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user || user.coins < price) {
      await conn.rollback(); conn.release();
      return { error: 'NOT_ENOUGH_COINS' };
    }
    await conn.query('UPDATE users SET coins = coins - ? WHERE id = ?', [price, userId]);
    await conn.query(
      'INSERT INTO user_cards (user_id, card_id, source) VALUES (?, ?, ?)',
      [userId, cardId, 'daily']
    );
    await conn.commit(); conn.release();
    return { card, cost: price };
  } catch (err) {
    await conn.rollback(); conn.release();
    throw err;
  }
}

// Full catalogue with user's copy count (for binder — 26 fixed slots)
export async function getUserCollection(userId) {
  const allCards = await query('SELECT * FROM cards ORDER BY rarity_order, id');
  const counts = await query(
    'SELECT card_id, COUNT(*) AS cnt FROM user_cards WHERE user_id = ? GROUP BY card_id',
    [userId]
  );
  const countMap = {};
  for (const row of counts) countMap[row.card_id] = Number(row.cnt);
  return allCards.map(c => ({ ...c, count: countMap[c.id] ?? 0 }));
}

export async function getSetProgress(userId) {
  const ownedIds = await getUserCardIds(userId);
  const allCards = await query('SELECT id, set_name FROM cards');
  const sets = {};
  for (const c of allCards) {
    if (!sets[c.set_name]) sets[c.set_name] = { total: 0, owned: 0 };
    sets[c.set_name].total++;
    if (ownedIds.includes(c.id)) sets[c.set_name].owned++;
  }
  return Object.entries(sets).map(([name, s]) => ({
    name, total: s.total, owned: s.owned, completed: s.owned === s.total,
  }));
}
