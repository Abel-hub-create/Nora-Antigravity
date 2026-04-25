-- 044_cards_system.sql
CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(64) PRIMARY KEY,
  card_name VARCHAR(100) NOT NULL,
  quote TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  image VARCHAR(200) NOT NULL,
  rarity ENUM('commun','chill','rare','epique','mythique','legendaire','dot') NOT NULL,
  set_name VARCHAR(100) NOT NULL,
  explanation TEXT NOT NULL,
  rarity_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  card_id VARCHAR(64) NOT NULL,
  source ENUM('pack','daily','event') DEFAULT 'pack',
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_cards_user (user_id),
  INDEX idx_user_cards_card (card_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO cards (id, card_name, quote, author, image, rarity, set_name, explanation, rarity_order) VALUES
('commun-zoro-1', 'Le Perso Réel', 'Tu essayes d\'améliorer un perso virtuel alors que tu es le perso de ton propre jeu, on appelle ça le jeu de la vie', 'Zoro', 'zorocard.png', 'commun', 'Nakama', 'Nos vies méritent plus d\'attention que nos personnages virtuels. Tu es le héros de ta propre histoire.', 0),
('commun-zoro-2', 'Rien ne Change', 'Rien ne change si rien ne change', 'Zoro', 'zorocard.png', 'commun', 'Nakama', 'L\'inaction garantit la stagnation. Pour voir des résultats différents, il faut agir différemment.', 0),
('commun-zoro-3', 'Trop Tôt', 'Les gens abandonnent trop tôt, pas trop tard.', 'Zoro', 'zorocard.png', 'commun', 'Nakama', 'La plupart des échecs arrivent juste avant le succès. La persévérance sépare ceux qui réussissent.', 0),
('chill-mrdreamax-1', 'Le Tri', 'Le temps balaye les faux amis et confirme les vrais.', 'Mrdreamax', 'mrdreamaxcard.jpg', 'chill', 'Rue & Vérité', 'Le temps est le meilleur filtre. Ceux qui restent dans les moments difficiles sont les vrais.', 1),
('chill-mrdreamax-2', 'La Peur', 'Plus la peur de l\'échec progresse, plus le courage d\'essayer régresse.', 'Mrdreamax', 'mrdreamaxcard.jpg', 'chill', 'Rue & Vérité', 'La peur est l\'ennemi de l\'action. Plus on la laisse grandir, plus on se paralyse.', 1),
('chill-mrdreamax-3', 'Les Vides', 'Ceux qui jugent le plus sont rarement les meilleurs… juste les plus vides.', 'Mrdreamax', 'mrdreamaxcard.jpg', 'chill', 'Rue & Vérité', 'Le jugement masque souvent l\'insécurité. Les gens accomplis ont peu de temps pour critiquer.', 1),
('chill-franky-1', 'SUPER !', 'Vivre n\'est pas un crime.', 'Franky', 'frankycard.jpg', 'chill', 'Nakama', 'Assumer pleinement qui tu es sans t\'excuser d\'exister. C\'est ça la vraie liberté.', 1),
('rare-luffy-1', 'Le Regard', 'Si tu ne vis que pour le regard des autres, tu sacrifies tes rêves.', 'Luffy', 'luffy.png', 'rare', 'Nakama', 'Vivre pour l\'approbation extérieure c\'est abandonner ses ambitions. Les vrais rêves viennent de l\'intérieur.', 2),
('rare-luffy-2', 'Gagne ou Meurs', 'Si tu gagnes, tu vis. Si tu perds, tu meurs. Si tu ne te bats pas, tu ne peux pas gagner.', 'Luffy', 'luffy.png', 'rare', 'Nakama', 'Le seul vrai échec est de ne pas essayer. La bataille est la seule voie vers la victoire.', 2),
('rare-damso-1', 'Le Risque', 'Mais le risque de l\'amour, c\'est d\'y croire seul en étant à deux.', 'Damso', 'damsocard.png', 'rare', 'Rue & Vérité', 'L\'amour le plus douloureux est celui qu\'on porte seul. Quand l\'investissement émotionnel n\'est pas partagé.', 2),
('epique-einstein-1', 'La Décision', 'Derrière chaque entreprise florissante se cache une décision courageuse.', 'Einstein', 'einsteincard.png', 'epique', 'Philosophes', 'Le succès ne vient pas du hasard mais d\'un moment de courage où l\'on choisit d\'agir malgré l\'incertitude.', 3),
('epique-einstein-2', 'Le Bétail', 'Les fous sont ceux qui acceptent de vivre comme du bétail.', 'Einstein', 'einsteincard.png', 'epique', 'Philosophes', 'Suivre la masse sans questionner c\'est abandonner sa liberté de penser. La vraie folie est la conformité aveugle.', 3),
('epique-einstein-3', 'L\'Énervé', 'Quand quelqu\'un te dit quelque chose en étant énervé, c\'est qu\'il mourrait d\'envie de te le dire, fais y attention.', 'Einstein', 'einsteincard.png', 'epique', 'Philosophes', 'La colère est souvent un masque de la vérité. Ce que les gens disent sous l\'émotion révèle ce qu\'ils pensent vraiment.', 3),
('epique-luffy-1', 'Liberté', 'La passion et les rêves sont comme le temps, rien ne peut les arrêter, et il en sera ainsi tant qu\'il aura des hommes prêts à donner un sens au mot « LIBERTÉ ».', 'Luffy', 'luffy.png', 'epique', 'Nakama', 'La liberté n\'est pas juste un mot, c\'est une force vivante portée par ceux qui refusent de renoncer à leurs rêves.', 3),
('mythique-luffy-1', 'La Forge', 'Les moments qui te brisent sont souvent ceux qui te construisent… la douleur forge ce que le confort détruit.', 'Luffy', 'luffy.png', 'mythique', 'Nakama', 'Les épreuves ne nous détruisent pas, elles révèlent et renforcent ce qu\'on est vraiment. Le confort, lui, nous endort.', 4);
