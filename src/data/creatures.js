export const RARITIES = {
    RARE: { id: 'rare', name: 'Rare', color: '#22c55e', chance: 80 }, // Green
    VERY_RARE: { id: 'very_rare', name: 'Très Rare', color: '#3b82f6', chance: 50 }, // Blue
    EPIC: { id: 'epic', name: 'Épique', color: '#a855f7', chance: 30 }, // Purple
    LEGENDARY: { id: 'legendary', name: 'Légendaire', color: '#eab308', chance: 10 }, // Yellow
    MYTHIC: { id: 'mythic', name: 'Mythique', color: '#ef4444', chance: 1 }, // Red
    SECRET: { id: 'secret', name: 'Secret', color: '#000000', chance: 90 }, // Black
};

export const CREATURES = [
    // RARE (10)
    { id: 'r1', name: 'Feuille', rarity: 'rare', icon: '🍃' },
    { id: 'r2', name: 'Goutte', rarity: 'rare', icon: '💧' },
    { id: 'r3', name: 'Caillou', rarity: 'rare', icon: '🪨' },
    { id: 'r4', name: 'Brindille', rarity: 'rare', icon: '🌿' },
    { id: 'r5', name: 'Sable', rarity: 'rare', icon: '⏳' },
    { id: 'r6', name: 'Nuage', rarity: 'rare', icon: '☁️' },
    { id: 'r7', name: 'Fleur', rarity: 'rare', icon: '🌸' },
    { id: 'r8', name: 'Champignon', rarity: 'rare', icon: '🍄' },
    { id: 'r9', name: 'Cactus', rarity: 'rare', icon: '🌵' },
    { id: 'r10', name: 'Bambou', rarity: 'rare', icon: '🎍' },

    // VERY RARE (8)
    { id: 'vr1', name: 'Cristal', rarity: 'very_rare', icon: '💎' },
    { id: 'vr2', name: 'Perle', rarity: 'very_rare', icon: '🦪' },
    { id: 'vr3', name: 'Saphir', rarity: 'very_rare', icon: '🧿' },
    { id: 'vr4', name: 'Glace', rarity: 'very_rare', icon: '🧊' },
    { id: 'vr5', name: 'Lune', rarity: 'very_rare', icon: '🌙' },
    { id: 'vr6', name: 'Etoile', rarity: 'very_rare', icon: '⭐️' },
    { id: 'vr7', name: 'Comète', rarity: 'very_rare', icon: '☄️' },
    { id: 'vr8', name: 'Orage', rarity: 'very_rare', icon: '⛈️' },

    // EPIC (6)
    { id: 'e1', name: 'Dragonnet', rarity: 'epic', icon: '🐲' },
    { id: 'e2', name: 'Licorne', rarity: 'epic', icon: '🦄' },
    { id: 'e3', name: 'Phénix', rarity: 'epic', icon: '🦅' },
    { id: 'e4', name: 'Griffon', rarity: 'epic', icon: '🦁' },
    { id: 'e5', name: 'Hydre', rarity: 'epic', icon: '🐍' },
    { id: 'e6', name: 'Chimère', rarity: 'epic', icon: '🐐' },

    // LEGENDARY (5)
    { id: 'l1', name: 'Roi Dragon', rarity: 'legendary', icon: '🐉' },
    { id: 'l2', name: 'Titan', rarity: 'legendary', icon: '🗿' },
    { id: 'l3', name: 'Archange', rarity: 'legendary', icon: '👼' },
    { id: 'l4', name: 'Démon', rarity: 'legendary', icon: '👿' },
    { id: 'l5', name: 'Dieu Solaire', rarity: 'legendary', icon: '☀️' },

    // MYTHIC (3)
    { id: 'm1', name: 'Cthulhu', rarity: 'mythic', icon: '🐙' },
    { id: 'm2', name: 'Léviathan', rarity: 'mythic', icon: '🐋' },
    { id: 'm3', name: 'Kraken', rarity: 'mythic', icon: '🦑' },

    // SECRET (1)
    { id: 's1', name: 'Le Néant', rarity: 'secret', icon: '⚫️', image: '/assets/secret_creature.jpg' },
];

export const getRandomCreature = () => {
    const rand = Math.random() * 100;
    let cumulative = 0;

    // Calculate total weight
    const totalWeight = Object.values(RARITIES).reduce((acc, r) => acc + r.chance, 0);
    const randomValue = Math.random() * totalWeight;

    let selectedRarity = 'rare';
    let currentWeight = 0;

    for (const rarityKey in RARITIES) {
        const rarity = RARITIES[rarityKey];
        currentWeight += rarity.chance;
        if (randomValue <= currentWeight) {
            selectedRarity = rarity.id;
            break;
        }
    }

    const creaturesOfRarity = CREATURES.filter(c => c.rarity === selectedRarity);
    return creaturesOfRarity[Math.floor(Math.random() * creaturesOfRarity.length)];
};
