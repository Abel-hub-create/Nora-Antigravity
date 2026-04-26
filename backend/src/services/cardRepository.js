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

// Pack definitions: { boosters, cost, set }
const PACKS = {
  'mh-one':  { boosters: 1,  cost: 100, set: 'Mascarade humaine' },
  'mh-five': { boosters: 5,  cost: 400, set: 'Mascarade humaine' },
  'mh-ten':  { boosters: 10, cost: 800, set: 'Mascarade humaine' },
  'ds-one':  { boosters: 1,  cost: 100, set: 'Domination Silencieuse' },
  'ds-five': { boosters: 5,  cost: 400, set: 'Domination Silencieuse' },
  'ds-ten':  { boosters: 10, cost: 800, set: 'Domination Silencieuse' },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSlotNumberMap() {
  const ordered = await query("SELECT id, set_abbr FROM cards ORDER BY FIELD(set_abbr,'MH','DS'), rarity_order, id");
  const counters = {};
  const map = {};
  for (const c of ordered) {
    counters[c.set_abbr] = (counters[c.set_abbr] ?? 0) + 1;
    map[c.id] = counters[c.set_abbr];
  }
  return map;
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

  const allCards = await query('SELECT * FROM cards WHERE set_name = ?', [packDef.set]);
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

    let skipped = 0;
    for (const card of allPulled) {
      const current = copyCounts[card.id] ?? 0;
      if (current >= maxCopies) { skipped++; continue; }
      await conn.query(
        'INSERT INTO user_cards (user_id, card_id, source) VALUES (?, ?, ?)',
        [userId, card.id, 'pack']
      );
      copyCounts[card.id] = current + 1;
    }
    // Proportional refund for slots skipped due to copy cap
    if (skipped > 0) {
      const refund = Math.round(packDef.cost * skipped / allPulled.length);
      if (refund > 0) {
        await conn.query('UPDATE users SET coins = coins + ? WHERE id = ?', [refund, userId]);
      }
    }
    await conn.commit(); conn.release();
    const slotMap = await getSlotNumberMap();
    const packsWithSlots = packs.map(booster => booster.map(c => ({ ...c, slot_number: slotMap[c.id] ?? null })));
    return { packs: packsWithSlots, cost: packDef.cost, skipped };
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
    const pickSet = async (setName, n) => {
      const setCards = await query('SELECT * FROM cards WHERE set_name = ?', [setName]);
      const byR = groupByRarity(setCards);
      const counts = {}, chosen = [];
      let attempts = 0;
      while (chosen.length < n && attempts < 200) {
        attempts++;
        const card = pickCard(byR, POOL_DAILY);
        if ((counts[card.id] ?? 0) >= 2) continue;
        counts[card.id] = (counts[card.id] ?? 0) + 1;
        chosen.push(card);
      }
      return chosen;
    };

    const mhCards = await pickSet('Mascarade humaine', 3);
    const dsCards = await pickSet('Domination Silencieuse', 3);
    const chosen = [...mhCards, ...dsCards];

    await query('DELETE FROM shop_daily_cards WHERE user_id = ? AND valid_date != ?', [userId, today]);
    for (let i = 0; i < chosen.length; i++) {
      await query(
        'INSERT IGNORE INTO shop_daily_cards (user_id, card_slot, card_id, valid_date) VALUES (?,?,?,?)',
        [userId, i + 1, chosen[i].id, today]
      );
    }
    // Re-SELECT to get what's actually persisted (INSERT IGNORE may have skipped on race/partial state)
    const stored = await query(
      'SELECT card_id FROM shop_daily_cards WHERE user_id = ? AND valid_date = ? ORDER BY card_slot',
      [userId, today]
    );
    dailyCardIds = stored.map(r => r.card_id);
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

// Full catalogue with user's copy count (for binder — grouped by set, slot per set)
export async function getUserCollection(userId) {
  const allCards = await query("SELECT * FROM cards ORDER BY FIELD(set_abbr,'MH','DS'), rarity_order, id");
  const counts = await query(
    'SELECT card_id, COUNT(*) AS cnt FROM user_cards WHERE user_id = ? GROUP BY card_id',
    [userId]
  );
  const countMap = {};
  for (const row of counts) countMap[row.card_id] = Number(row.cnt);
  const setCounters = {};
  return allCards.map(c => {
    setCounters[c.set_abbr] = (setCounters[c.set_abbr] ?? 0) + 1;
    return { ...c, slot_number: setCounters[c.set_abbr], count: countMap[c.id] ?? 0 };
  });
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
