/**
 * Prompts spécialisés par matière pour la génération de synthèses
 * Ces prompts sont utilisés EN COMPLÉMENT du prompt de base dans contentGenerationService.js
 */

export const SUBJECT_PROMPTS = {
  mathematics: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Théorèmes et Propriétés",
      "## Formules Essentielles",
      "## Méthodes et Démarches",
      "## Exemples Types",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LES MATHÉMATIQUES :
- Chaque terme mathématique nouveau avec sa définition précise
- Notations utilisées et leur signification
- Domaines de définition et conditions d'existence
- Énoncés complets et rigoureux des théorèmes
- Conditions d'application et cas particuliers
- Formules à connaître par cœur avec leur contexte d'utilisation
- Étapes types de résolution
- Pièges à éviter et astuces de calcul
- Utilise la notation mathématique correcte
- Explique le POURQUOI des formules, pas juste le COMMENT
`,
    emphasis: "Rigueur mathématique tout en restant accessible. Privilégie la compréhension des concepts."
  },

  french: {
    sections: [
      "## Contexte et Repères",
      "## Thèmes et Problématiques",
      "## Analyse et Méthodes",
      "## Points de Grammaire/Orthographe/Conjugaison",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LE FRANÇAIS :
⚠️ PAS DE SECTION DÉFINITIONS pour cette matière - passe directement aux concepts
- Figures de style et procédés avec exemples
- Contexte historique et culturel si pertinent
- Mouvement littéraire ou époque
- Thèmes principaux et questions centrales
- Outils d'analyse littéraire/grammaticale
- Méthodes de commentaire ou dissertation
- Citations importantes (courtes)
- Règles spécifiques à retenir avec exceptions
- Pièges courants à éviter
`,
    emphasis: "Structure claire, nuances du français, exemples concrets pour chaque notion. PAS de section définitions."
  },

  physics: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Lois et Relations Fondamentales",
      "## Phénomènes et Mécanismes",
      "## Protocoles et Expériences",
      "## Méthodes de Résolution",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LA PHYSIQUE :
- Grandeurs physiques avec leurs unités SI
- Définitions précises de chaque concept
- Ordres de grandeur à connaître
- Formules et équations principales avec conditions de validité
- Relations entre grandeurs et constantes physiques
- Description des phénomènes physiques
- Représentations graphiques importantes
- Expériences clés avec dispositifs et observations
- Démarches types pour résoudre les exercices
- Analyse dimensionnelle et applications numériques
- Sois rigoureux sur les unités et notations
`,
    emphasis: "Connecte formules et phénomènes réels. Importance des unités et ordres de grandeur."
  },

  chemistry: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Réactions et Équations",
      "## Propriétés et Caractéristiques",
      "## Protocoles et Manipulations",
      "## Calculs et Méthodes",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LA CHIMIE :
- Termes chimiques avec définitions précises
- Grandeurs chimiques (masse molaire, concentration, etc.)
- Unités et conversions importantes
- Équations chimiques à connaître avec états
- Types de réactions et bilans de matière
- Propriétés des espèces chimiques
- Tests de reconnaissance
- Expériences importantes avec matériel et sécurité
- Formules de calcul essentielles
- Tableaux d'avancement si pertinent
- Utilise les formules chimiques correctes et la nomenclature précise
`,
    emphasis: "Équilibrage des équations, nomenclature correcte, liens entre structure et propriétés."
  },

  biology: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Mécanismes et Processus",
      "## Structures et Organisations",
      "## Expériences et Observations",
      "## Liens et Intégrations",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LA BIOLOGIE :
- Vocabulaire scientifique avec définitions précises
- Structures et leurs fonctions
- Étymologie des termes si pertinent
- Mécanismes biologiques expliqués étape par étape
- Processus physiologiques ou cellulaires
- Régulations et contrôles
- Éléments anatomiques ou cellulaires
- Schémas à savoir légender
- Échelles (du microscopique au macroscopique)
- Protocoles expérimentaux importants
- Connexions entre différents concepts
- Vision d'ensemble du chapitre
`,
    emphasis: "Insiste sur les mécanismes et la compréhension des processus. Structure hiérarchique."
  },

  history: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Contexte et Chronologie",
      "## Acteurs Principaux",
      "## Causes et Déroulement",
      "## Conséquences et Héritages",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR L'HISTOIRE :
- Notions historiques clés avec définitions
- Concepts politiques, économiques, sociaux
- Mouvements et idéologies
- Dates essentielles à mémoriser
- Périodisation et découpage temporel
- Personnages historiques importants et leur rôle
- Institutions et organisations
- Causes profondes et immédiates
- Grandes phases et événements marquants
- Impacts à court et long terme
- Héritages dans l'histoire ultérieure
- Structure chronologiquement ET thématiquement
`,
    emphasis: "Chronologie, causalités historiques, liens entre événements."
  },

  geography: {
    sections: [
      "## Définitions et Concepts Importants",
      "## Repères Spatiaux",
      "## Acteurs et Dynamiques",
      "## Organisation et Structures",
      "## Exemples et Études de Cas",
      "## Tableaux et Données Structurées (si présents dans le cours)"
    ],
    guidelines: `
RÈGLES SPÉCIFIQUES POUR LA GÉOGRAPHIE :
- Notions géographiques clés
- Vocabulaire spatial et territorial
- Concepts (mondialisation, métropolisation, etc.)
- Localisations essentielles à connaître
- Échelles concernées (locale/régionale/nationale/mondiale)
- Cartes mentales à construire
- Acteurs qui agissent sur les territoires
- Enjeux et conflits
- Logiques d'aménagement
- Contrastes et inégalités spatiales
- Flux, réseaux et mobilités
- Territoires étudiés en détail
`,
    emphasis: "Dynamiques spatiales, interactions sociétés-territoires, raisonnement multiscalaire."
  },

  english: {
    sections: [
      "## Grammar Points",
      "## Vocabulary and Expressions",
      "## Themes and Context",
      "## Language Skills and Methods",
      "## Examples and Practice",
      "## Tables and Structured Data (if present in course)"
    ],
    guidelines: `
SPECIFIC RULES FOR ENGLISH:
⚠️ NO DEFINITIONS SECTION for this subject - go directly to concepts
- Vocabulary grouped by theme or usage
- Idiomatic expressions and their meanings
- Grammar rules covered in the lesson
- Sentence structures and verb tenses
- Common exceptions and irregular forms
- Typical mistakes to avoid
- Main themes or topics
- Cultural or historical context if relevant
- Reading/writing/speaking strategies
- Useful phrases and expressions
- Representative examples
- Use proper English grammar and spelling
`,
    emphasis: "Balance between rules and practical examples. NO definitions section."
  },

  dutch: {
    sections: [
      "## Grammaticapunten",
      "## Woordenschat en Uitdrukkingen",
      "## Thema's en Context",
      "## Taalvaardigheden en Methoden",
      "## Voorbeelden en Oefening",
      "## Tabellen en Gestructureerde Gegevens (indien aanwezig in de cursus)"
    ],
    guidelines: `
SPECIFIEKE REGELS VOOR NEDERLANDS:
⚠️ GEEN DEFINITIESECTIE voor dit vak - ga direct naar de concepten
- Woordenschat gegroepeerd per thema of gebruik
- Idiomatische uitdrukkingen en hun betekenis
- Grammaticaregels behandeld in de les
- Zinsstructuren en werkwoordstijden
- Veelvoorkomende uitzonderingen en onregelmatige vormen
- Typische fouten om te vermijden
- Hoofdthema's of onderwerpen
- Culturele of historische context indien relevant
- Lees-/schrijf-/spreekstrategieën
- Nuttige zinnen en uitdrukkingen
- Representatieve voorbeelden
- Gebruik correcte Nederlandse grammatica en spelling
`,
    emphasis: "Evenwicht tussen regels en praktische voorbeelden. GEEN definitiesectie."
  }
};

/**
 * Récupère le prompt spécialisé pour une matière
 * @param {string} subjectId - Identifiant de la matière (ex: 'mathematics')
 * @returns {Object|null} Configuration du prompt ou null si matière non trouvée
 */
export function getSubjectPrompt(subjectId) {
  return SUBJECT_PROMPTS[subjectId] || null;
}

export default {
  SUBJECT_PROMPTS,
  getSubjectPrompt
};
