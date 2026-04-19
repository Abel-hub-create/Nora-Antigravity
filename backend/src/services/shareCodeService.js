import { query } from '../config/database.js';

const ADJECTIVES = [
  'Bold', 'Brave', 'Calm', 'Crazy', 'Dark', 'Dizzy', 'Dusty', 'Funky',
  'Fuzzy', 'Grumpy', 'Lucky', 'Mighty', 'Rusty', 'Shiny', 'Silly',
  'Sleepy', 'Sneaky', 'Spooky', 'Sticky', 'Stormy', 'Swift', 'Tiny',
  'Wild', 'Crispy', 'Fluffy', 'Chilly', 'Clumsy', 'Greedy', 'Hungry',
  'Jumpy', 'Lazy', 'Moody', 'Nerdy', 'Noisy', 'Perky', 'Plump',
  'Proud', 'Quirky', 'Salty', 'Sassy', 'Savvy', 'Sharp', 'Sloppy',
  'Snarky', 'Soggy', 'Stiff', 'Stuffy', 'Tacky', 'Tangy', 'Testy',
];

const NOUNS = [
  'Badger', 'Biscuit', 'Cobra', 'Dagger', 'Dragon', 'Falcon', 'Ferret',
  'Gibbon', 'Hamster', 'Lobster', 'Marmot', 'Muffin', 'Pelican',
  'Pickle', 'Raccoon', 'Sparrow', 'Walrus', 'Wombat', 'Burrito',
  'Cactus', 'Cashew', 'Donut', 'Dumpling', 'Goblin', 'Gremlin',
  'Llama', 'Mango', 'Noodle', 'Nugget', 'Otter', 'Pebble',
  'Pigeon', 'Pretzel', 'Puffin', 'Quokka', 'Radish', 'Ramen',
  'Turnip', 'Waffle', 'Walnut', 'Yak',
];

export function generateCode() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return adj + noun;
}

export async function generateUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    if (code.length < 10 || code.length > 15) continue;
    const exists = await query('SELECT id FROM users WHERE share_code = ? LIMIT 1', [code]);
    if (!exists[0]) return code;
  }
  // fallback avec timestamp si collision extrême
  return generateCode() + Date.now().toString().slice(-3);
}
