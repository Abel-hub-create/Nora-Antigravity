/**
 * Agents pédagogiques par matière
 * Chaque matière définit trois blocs distincts injectés dans le prompt :
 *   - summaryRules  : ce que la synthèse DOIT conserver / comment la structurer
 *   - flashcardRules: types de cartes à privilégier et format attendu
 *   - quizRules     : types de questions, distracteurs, pièges à éviter
 *   - sections      : titres de sections Markdown recommandés
 *   - emphasis      : phrase-clé résumant la priorité de la matière
 */

export const SUBJECT_PROMPTS = {

  // ─── MATHÉMATIQUES ──────────────────────────────────────────────────────────
  mathematics: {
    sections: [
      '## Théorèmes et Propriétés',
      '## Formules Essentielles',
      '## Méthodes et Démarches',
      '## Exemples Types',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — MATHÉMATIQUES :
- Chaque théorème ou formule suit OBLIGATOIREMENT cet ordre : Nom → Énoncé formel → Formule (unicode) → Conditions/domaine de validité → Exemple numérique (si présent dans le cours).
- Ne jamais fusionner deux formules distinctes dans une même phrase. Chaque formule a sa propre ligne, isolée visuellement.
- Si le cours contient une démonstration, la conserver intégralement dans "### Démonstration" — ne jamais la supprimer silencieusement.
- Inclure TOUJOURS les domaines de définition et les restrictions (ex : "valable pour x > 0") — ce sont des points de pénalité en examen.
- Les cas particuliers et exceptions ont chacun leur propre point distinct, jamais fusionnés.`,

    flashcardRules: `
FLASHCARDS — MATHÉMATIQUES :
- Face = "Comment calculer [grandeur] ?" ou "Quelle est la formule de [théorème] ?" → Dos = formule complète en unicode + description des variables + exemple numérique minimal.
- Créer une carte distincte par cas particulier ou exception identifiée dans le cours.
- Ne jamais mettre deux formules sur la même carte.
- Inclure des cartes sur les conditions de validité : face = nom de la formule → dos = conditions d'application.`,

    quizRules: `
QUIZ — MATHÉMATIQUES :
- Questions de type calcul guidé : donner des valeurs numériques précises, demander d'identifier la bonne réponse parmi 4 résultats chiffrés.
- Distracteurs : erreurs d'exposant, confusion entre formules proches (ex : périmètre vs aire), oubli d'une condition de validité.
- Ne pas créer de questions de mémorisation pure — les maths s'évaluent par l'application.
- Une question par concept-clé du cours ; ne pas regrouper deux notions dans une seule question.`,

    emphasis: 'Rigueur : formule + conditions + exemple. Chaque notion est une unité autonome.'
  },

  // ─── FRANÇAIS ───────────────────────────────────────────────────────────────
  french: {
    sections: [
      '## Notions Théoriques',
      '## Analyse du Texte / de l\'Œuvre',
      '## Grammaire et Orthographe',
      '## Méthodes (commentaire, dissertation)',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — FRANÇAIS :
- Distinguer SYSTÉMATIQUEMENT deux types de contenu : (a) notions théoriques (figures de style, types de textes, règles grammaticales) et (b) texte littéraire analysé. Ne jamais les mélanger.
- Citations littéraires : conserver EXACTEMENT telles quelles entre guillemets, avec nom de l'auteur et de l'œuvre. Ne jamais paraphraser une citation.
- Pour la grammaire : chaque règle est suivie d'au moins un exemple du cours. Format → Règle : exemple correct → Contre-exemple si présent dans le cours.
- Pour les figures de style : définition exacte + exemple tiré du cours, format "**Nom** : définition — *Exemple : «...»*".
- Ne jamais reformuler une citation pour la simplifier : c'est une faute grave.`,

    flashcardRules: `
FLASHCARDS — FRANÇAIS :
- Notions : Face = "Définir [figure de style / notion grammaticale]" → Dos = définition exacte du cours + exemple du cours.
- Littérature : Face = citation ou incipit → Dos = auteur + œuvre + figure/procédé identifié dans le cours.
- Grammaire : Face = règle → Dos = exemples correct ET contre-exemple si présent dans le cours.
- Ne jamais créer une carte dont le dos contient une information absente du cours.`,

    quizRules: `
QUIZ — FRANÇAIS :
- Identification de figures de style dans une phrase donnée (choisir parmi 4 figures nommées dans le cours).
- Règles d'accord : choisir la forme correcte parmi 4 options ; distracteurs = erreurs classiques liées à la règle du cours.
- Littérature : relier une citation à son auteur/œuvre parmi 4 options issues du cours.
- Ne jamais créer une question dont la réponse dépend d'une connaissance extérieure au cours.`,

    emphasis: 'Citations intactes, distinction notions/texte, règles + exemples du cours uniquement.'
  },

  // ─── PHYSIQUE ────────────────────────────────────────────────────────────────
  physics: {
    sections: [
      '## Lois et Relations Fondamentales',
      '## Grandeurs, Symboles et Unités',
      '## Méthode de Résolution',
      '## Protocoles et Expériences',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — PHYSIQUE :
- Chaque loi ou principe suit OBLIGATOIREMENT : Nom → Énoncé → Formule (unicode) → Unités SI de chaque variable → Conditions d'application.
- Ne jamais séparer une formule de ses unités : "F = ma" sans "N, kg, m/s²" est inutilisable.
- Conserver TOUTES les valeurs numériques des constantes mentionnées dans le cours (ex : g = 9,81 m/s²) — une constante sans valeur est inutilisable.
- Si le cours contient des exercices résolus, conserver la démarche de résolution (les étapes, pas seulement le résultat) dans "## Méthode de Résolution".
- Inclure TOUJOURS les conditions de validité d'une loi (ex : "valable en régime laminaire") — ce sont des points d'examen.`,

    flashcardRules: `
FLASHCARDS — PHYSIQUE :
- Face = "Quelle est la formule de [grandeur] ?" → Dos = formule unicode + unités de chaque variable + contexte d'application.
- Face = "Quelle unité pour [grandeur] ?" → Dos = unité SI + symbole + définition si présente dans le cours.
- Créer des cartes de conversion d'unités si le cours en contient.
- Créer une carte par constante physique : face = nom → dos = valeur + unité.`,

    quizRules: `
QUIZ — PHYSIQUE :
- Calcul guidé : donner des valeurs numériques, demander le résultat correct parmi 4 options chiffrées avec unités.
- Identification de la bonne formule parmi 4 (distracteurs : formules voisines, erreurs d'exposant, mauvaise constante).
- Question sur les unités : "Quelle est l'unité de [grandeur] ?" avec distracteurs = unités proches mais incorrectes.
- Ne jamais créer une question de physique sans unités dans les options de réponse.`,

    emphasis: 'Formule + unités + conditions : toujours les trois ensemble. Les unités ne sont pas optionnelles.'
  },

  // ─── CHIMIE ──────────────────────────────────────────────────────────────────
  chemistry: {
    sections: [
      '## Réactions et Équations',
      '## Nomenclature et Propriétés',
      '## Méthodes de Calcul',
      '## Protocoles et Sécurité',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — CHIMIE :
- Conserver TOUTES les équations chimiques EXACTEMENT telles qu'elles apparaissent dans le cours : coefficients stœchiométriques, états (s), (l), (g), (aq). Ne jamais les simplifier.
- Chaque réaction est accompagnée de : type de réaction (oxydo-réduction, acide-base, précipitation…) + conditions (température, catalyseur, pression) si mentionnées.
- La nomenclature (noms des composés, ions) est préservée intégralement : si le cours donne nom + formule, les deux apparaissent systématiquement.
- Ne jamais "corriger" une formule chimique qui semble erronée suite à l'OCR : conserver telle quelle et ne pas halluciner.
- Données numériques (masses molaires, concentrations, pH) : conserver avec leur unité exacte.`,

    flashcardRules: `
FLASHCARDS — CHIMIE :
- Face = nom du composé → Dos = formule chimique + propriétés mentionnées dans le cours.
- Face = réactifs → Dos = produits + type de réaction + conditions si présentes.
- Face = "Quelle est l'équation de [réaction] ?" → Dos = équation complète avec coefficients et états.
- Créer des cartes sur les règles de nomenclature ou solubilité si présentes dans le cours.`,

    quizRules: `
QUIZ — CHIMIE :
- Identification de produits : "Quelle est la formule de [composé] ?" avec distracteurs = formules similaires (ex : CO vs CO₂).
- Équilibrage : choisir les bons coefficients parmi 4 propositions.
- Classification : "Quel type de réaction est-ce ?" parmi 4 types vus dans le cours.
- Erreur d'état physique comme distracteur (ex : H₂O(l) vs H₂O(g)).
- Ne jamais inclure de réactions non présentes dans le cours.`,

    emphasis: 'Équations exactes avec états, nomenclature complète, aucune correction silencieuse des formules OCR.'
  },

  // ─── BIOLOGIE ────────────────────────────────────────────────────────────────
  biology: {
    sections: [
      '## Mécanismes et Processus',
      '## Structures et Fonctions',
      '## Vocabulaire Scientifique',
      '## Expériences et Observations',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — BIOLOGIE :
- Les processus biologiques (photosynthèse, mitose, digestion…) sont décrits sous forme de séquences d'étapes NUMÉROTÉES, jamais en paragraphe continu. Chaque étape = une ligne.
- Conserver TOUS les termes scientifiques latins ou grecs avec leur définition exacte du cours. Ne jamais les remplacer par des synonymes courants.
- Relations structure/fonction explicitement liées : format "**Nom de la structure** → fonction : [explication]".
- Conserver TOUTES les données chiffrées biologiques (durée d'un cycle, pH, température enzymatique, dimensions cellulaires) — elles sont systématiquement évaluées.
- Schémas à légender : si le cours mentionne un schéma, lister les éléments à légender dans la synthèse.`,

    flashcardRules: `
FLASHCARDS — BIOLOGIE :
- Face = terme scientifique → Dos = définition exacte du cours + rôle fonctionnel.
- Face = "Quelle est la fonction de [organe/structure] ?" → Dos = réponse précise tirée du cours.
- Face = "Étape N de [processus]" → Dos = description de cette étape exacte.
- Créer une carte par étape d'un processus clé (ex : une carte par phase de la mitose).
- Créer des cartes sur les données chiffrées clés (pH, températures, durées).`,

    quizRules: `
QUIZ — BIOLOGIE :
- Rôles des organes : "Quelle est la fonction de [structure] ?" avec distracteurs = fonctions d'autres structures du cours.
- Ordre d'un processus : "Dans quel ordre ces étapes se produisent-elles ?" (4 séquences proposées, une seule correcte).
- Identification de termes : "Quel terme désigne [description fonctionnelle] ?" parmi 4 termes du cours.
- Données chiffrées : "Quel est le pH de [milieu] selon le cours ?" avec distracteurs = valeurs plausibles mais incorrectes.`,

    emphasis: 'Processus en étapes numérotées, termes scientifiques exacts, structure → fonction toujours liés.'
  },

  // ─── HISTOIRE ────────────────────────────────────────────────────────────────
  history: {
    sections: [
      '## Chronologie et Contexte',
      '## Acteurs Principaux',
      '## Causes et Déroulement',
      '## Conséquences et Héritages',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — HISTOIRE :
- Chaque événement TOUJOURS accompagné de sa date exacte telle que dans le cours. Format : **1789** — Révolution française. Ne jamais approximer une date.
- Structure OBLIGATOIRE par événement : Causes → Faits → Conséquences. Reproduire cet ordre logique pour chaque événement majeur.
- Conserver TOUS les noms propres (personnes, lieux, traités, batailles, organisations) avec leur orthographe exacte — un nom mal orthographié est une erreur d'examen.
- Ne jamais fusionner deux événements distincts dans une même phrase pour gagner de la place. Chaque événement reste individuellement identifiable.
- Les idéologies et mouvements politiques mentionnés dans le cours sont définis brièvement mais précisément.`,

    flashcardRules: `
FLASHCARDS — HISTOIRE :
- Face = "Quelle est la date de [événement] ?" → Dos = date exacte + contexte minimal.
- Face = "Qui était [personnage] ?" → Dos = rôle précis dans le cours + dates si mentionnées.
- Face = "Quelle est la cause principale de [événement] ?" → Dos = cause(s) du cours.
- Face = "Quel traité / accord a [effet] ?" → Dos = nom exact + date + signataires si présents.
- Créer au moins une carte par événement majeur identifié dans le cours.`,

    quizRules: `
QUIZ — HISTOIRE :
- Causales : "Quelle est la principale cause de [événement] ?" avec 4 causes dont une seule directement tirée du cours.
- Chronologiques : "Dans quel ordre ces événements se sont-ils produits ?" (4 séquences proposées).
- Identification : "Quel traité a mis fin à... ?" ou "Qui a [action historique] ?" parmi 4 noms/traités du cours.
- Distracteurs : dates proches mais incorrectes, noms de personnages confondables, causes secondaires présentées comme principales.
- Ne jamais créer de question d'opinion ou d'interprétation sans ancrage dans le cours.`,

    emphasis: 'Date + Causes + Faits + Conséquences : chaque événement est une unité complète et datée.'
  },

  // ─── GÉOGRAPHIE ──────────────────────────────────────────────────────────────
  geography: {
    sections: [
      '## Repères Spatiaux et Localisations',
      '## Données et Statistiques',
      '## Dynamiques et Acteurs',
      '## Études de Cas',
      '## Tableaux et Données Structurées (si présents dans le cours)'
    ],
    summaryRules: `
SYNTHÈSE — GÉOGRAPHIE :
- Ne JAMAIS omettre un nom de pays, région, fleuve, chaîne de montagnes ou ville mentionné dans le cours — ces noms sont le contenu même de la matière.
- Les données chiffrées (superficies, populations, altitudes, débits, températures) sont conservées avec leur unité ET leur date de référence si mentionnées. Arrondir sans le signaler est interdit.
- Les relations spatiales sont reproduites telles quelles : "le fleuve X prend sa source dans les montagnes Y et se jette dans la mer Z" ne se résume pas en "le fleuve X est important".
- Chaque entité géographique nommée dans le cours est localisée par rapport à une référence concrète (continent, pays voisin, mer…).
- Ne jamais généraliser la localisation ("en Europe" au lieu de "en France, dans la région des Hauts-de-France").`,

    flashcardRules: `
FLASHCARDS — GÉOGRAPHIE :
- Face = "Où se situe [lieu/pays/région] ?" → Dos = localisation précise + repère spatial concret.
- Face = "Quelle est la capitale de [pays] ?" → Dos = capitale + localisation dans le pays si mentionnée.
- Face = "Quel est le relief dominant de [région] ?" → Dos = réponse exacte du cours.
- Face = donnée chiffrée → Dos = valeur + unité + date de référence.
- Créer une carte par entité géographique nommée dans le cours.`,

    quizRules: `
QUIZ — GÉOGRAPHIE :
- Localisation : "Dans quel continent/pays/région se trouve X ?" avec distracteurs = localisations plausibles mais incorrectes.
- Données : "Quelle est la population approximative de X selon le cours ?" avec 4 valeurs chiffrées.
- Relations spatiales : "Quel fleuve traverse X avant de rejoindre Y ?" parmi 4 fleuves du cours.
- Distracteurs : pays/régions géographiquement proches, données chiffrées proches de la réalité mais incorrectes selon le cours.
- Ne jamais créer une question sur un lieu non mentionné dans le cours.`,

    emphasis: 'Aucun nom géographique omis. Données avec unités et dates. Localisation précise toujours.'
  },

  // ─── ANGLAIS ─────────────────────────────────────────────────────────────────
  english: {
    sections: [
      '## Grammar Rules',
      '## Vocabulary and Expressions',
      '## Themes and Context',
      '## Language Methods and Skills',
      '## Tables and Structured Data (if present in course)'
    ],
    summaryRules: `
SUMMARY — ENGLISH:
- Distinguish CLEARLY between grammar rules and the examples that illustrate them. Format: rule in bold → examples indented below.
- Keep ALL example sentences from the course: they are the primary learning anchors. Never summarize or rephrase them.
- For vocabulary lists: group by theme if applicable, but never drop words — a list of 30 words requires 30 words in the summary.
- Grammar rule format: Rule → Correct example → Negative example (if present in course).
- Never rewrite course examples in "better" English: preserve them exactly, even if simple.`,

    flashcardRules: `
FLASHCARDS — ENGLISH:
- Grammar: Front = rule or grammatical form → Back = translation + example sentence from the course.
- Vocabulary: Front = English word + context → Back = translation + usage example from the course.
- Irregular forms: one card per irregular verb or exception found in the course.
- Never create a card whose back contains information not present in the course.`,

    quizRules: `
QUIZ — ENGLISH:
- "Choose the correct form among 4 options" (grammar application, not memorization).
- "Identify the error in this sentence" with the sentence taken directly from course examples.
- Vocabulary: "Which word means [definition] ?" with 4 vocabulary words from the course.
- Distractors: grammatically plausible but incorrect forms, near-synonyms with different usage.
- Never create cultural general knowledge questions unrelated to course content.`,

    emphasis: 'Rules + exact course examples always together. Never drop vocabulary items, never rephrase examples.'
  },

  // ─── NÉERLANDAIS ─────────────────────────────────────────────────────────────
  dutch: {
    sections: [
      '## Grammaticapunten',
      '## Woordenschat en Uitdrukkingen',
      '## Thema\'s en Context',
      '## Taalvaardigheden',
      '## Tabellen en Gestructureerde Gegevens (indien aanwezig in de cursus)'
    ],
    summaryRules: `
SYNTHÈSE — NÉERLANDAIS :
- Distinguer clairement les règles grammaticales des exemples qui les illustrent. Format : règle en gras → exemples en retrait.
- Conserver TOUJOURS la distinction entre les articles "de" et "het" pour chaque substantif mentionné — c'est une information non récupérable sans le cours.
- Les verbes irréguliers (onregelmatige werkwoorden) et les exceptions grammaticales sont conservés intégralement — ce sont précisément ce que l'étudiant doit mémoriser.
- Ne jamais résumer ou raccourcir les listes de vocabulaire. Si une liste contient 30 mots, les 30 apparaissent.
- Les règles de conjugaison et la formation des mots (verbes séparables, pluriels, diminutifs) apparaissent sous forme de tableaux Markdown si le cours en contient.`,

    flashcardRules: `
FLASHCARDS — NÉERLANDAIS :
- Vocabulaire : Face = "het/de [mot néerlandais]" → Dos = traduction française + genre de l'article + exemple d'usage du cours.
- Grammaire : Face = règle en français → Dos = structure grammaticale + exemple en néerlandais du cours.
- Verbes irréguliers : une carte par verbe irrégulier, face = infinitif → dos = toutes les formes du cours.
- Ne jamais omettre le genre de l'article (de/het) sur aucune carte de vocabulaire.`,

    quizRules: `
QUIZ — NÉERLANDAIS :
- Choix du bon article (de/het) parmi 2 options pour un substantif du cours.
- Conjugaison : "Quelle est la forme correcte de [verbe] ?" avec 4 formes conjuguées.
- Traduction : "Quel mot néerlandais correspond à [mot français] ?" parmi 4 mots du cours.
- Distracteurs : mots phonétiquement proches, erreurs d'accord fréquentes, confusion de/het.
- Ne jamais inclure de vocabulaire ou règles non présents dans le cours.`,

    emphasis: 'Article de/het systématique, exceptions complètes, listes de vocabulaire intégrales sans exception.'
  }
};

/**
 * Récupère le prompt spécialisé pour une matière
 */
export function getSubjectPrompt(subjectId) {
  return SUBJECT_PROMPTS[subjectId] || null;
}

export default { SUBJECT_PROMPTS, getSubjectPrompt };
