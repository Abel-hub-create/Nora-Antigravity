/**
 * Service de vérification du contenu par rapport à la matière sélectionnée
 * Analyse le contenu d'un cours et vérifie s'il correspond à la matière choisie par l'utilisateur
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Mapping des matières avec leurs noms en français
const SUBJECT_NAMES = {
    mathematics: 'Mathématiques',
    french: 'Français',
    physics: 'Physique',
    chemistry: 'Chimie',
    biology: 'Biologie',
    history: 'Histoire',
    geography: 'Géographie',
    english: 'Anglais',
    dutch: 'Néerlandais'
};

// Indicateurs clés par matière pour guider la détection
const SUBJECT_INDICATORS = {
    mathematics: ['équation', 'théorème', 'fonction', 'calcul', 'nombre', 'géométrie', 'algèbre', 'dérivée', 'intégrale', 'probabilité', 'matrice', 'vecteur'],
    french: ['grammaire', 'conjugaison', 'littérature', 'syntaxe', 'vocabulaire', 'orthographe', 'auteur', 'roman', 'poésie', 'figure de style', 'dissertation'],
    physics: ['force', 'énergie', 'mouvement', 'vitesse', 'masse', 'électrique', 'magnétique', 'onde', 'lumière', 'mécanique', 'thermodynamique', 'atome'],
    chemistry: ['molécule', 'réaction', 'élément', 'chimique', 'solution', 'acide', 'base', 'ion', 'liaison', 'oxydation', 'périodique', 'concentration'],
    biology: ['cellule', 'organisme', 'ADN', 'génétique', 'évolution', 'espèce', 'protéine', 'enzyme', 'métabolisme', 'photosynthèse', 'écosystème', 'reproduction'],
    history: ['guerre', 'siècle', 'historique', 'révolution', 'empire', 'civilisation', 'roi', 'bataille', 'traité', 'régime', 'colonie', 'indépendance'],
    geography: ['pays', 'continent', 'climat', 'population', 'carte', 'région', 'territoire', 'urbanisation', 'mondialisation', 'flux', 'frontière', 'ressource'],
    english: ['grammar', 'vocabulary', 'verb', 'sentence', 'tense', 'language', 'present', 'past', 'future', 'adjective', 'adverb', 'preposition'],
    dutch: ['grammatica', 'werkwoord', 'zin', 'taal', 'woord', 'lidwoord', 'bijvoeglijk', 'naamwoord', 'uitspraak', 'spelling']
};

const SYSTEM_PROMPT = `Tu es un classificateur de matières scolaires rapide et précis.
Tu dois déterminer si un contenu de cours correspond à la matière sélectionnée par l'utilisateur.

Les matières possibles sont : Mathématiques, Français, Physique, Chimie, Biologie, Histoire, Géographie, Anglais, Néerlandais.

Tu dois répondre UNIQUEMENT en JSON valide, sans texte avant ou après.`;

/**
 * Vérifie si le contenu correspond à la matière sélectionnée
 * @param {string} content - Contenu du cours à vérifier
 * @param {string} selectedSubject - Matière sélectionnée par l'utilisateur (ex: 'mathematics')
 * @returns {Promise<Object>} - { correspondance: boolean, matiere_detectee: string, confiance: string, message: string }
 */
export async function verifyContentSubject(content, selectedSubject) {
    // Validation des entrées
    if (!content || content.length < 30) {
        throw new Error('Contenu trop court pour être analysé');
    }

    if (!selectedSubject || !SUBJECT_NAMES[selectedSubject]) {
        throw new Error('Matière invalide');
    }

    const selectedSubjectName = SUBJECT_NAMES[selectedSubject];

    // Tronquer le contenu pour optimiser les tokens (premier 1500 caractères suffisent généralement)
    const truncatedContent = content.substring(0, 1500);

    const userPrompt = `Analyse ce texte de cours et vérifie s'il correspond à la matière sélectionnée.

MATIÈRE SÉLECTIONNÉE PAR L'UTILISATEUR : ${selectedSubjectName}

CONTENU DU COURS (extrait) :
"""
${truncatedContent}
"""

INSTRUCTIONS :
1. Détermine de quelle matière ce contenu parle réellement
2. Compare avec la matière sélectionnée (${selectedSubjectName})
3. Si c'est la même matière → correspondance = true
4. Si c'est une autre matière → correspondance = false, indique la vraie matière

RÉPONDS UNIQUEMENT AVEC CE JSON (pas d'autre texte) :
{
  "correspondance": true ou false,
  "matiere_detectee": "nom de la matière détectée en français (Mathématiques, Français, Physique, Chimie, Biologie, Histoire, Géographie, Anglais, ou Néerlandais)",
  "confiance": "forte" ou "moyenne" ou "faible",
  "message": "message court expliquant pourquoi (1-2 phrases max)"
}`;

    try {
        console.log('[ContentVerification] Vérification en cours pour matière:', selectedSubject);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 200,
            temperature: 0.1 // Basse température pour des réponses plus déterministes
        });

        const responseText = response.choices[0]?.message?.content?.trim();

        if (!responseText) {
            throw new Error('Réponse vide de l\'API');
        }

        // Parser la réponse JSON
        let result;
        try {
            // Nettoyer la réponse si elle contient des backticks markdown
            const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
            result = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('[ContentVerification] Erreur de parsing JSON:', responseText);
            throw new Error('Réponse invalide de l\'API');
        }

        // Valider la structure de la réponse
        if (typeof result.correspondance !== 'boolean' ||
            typeof result.matiere_detectee !== 'string' ||
            typeof result.confiance !== 'string' ||
            typeof result.message !== 'string') {
            throw new Error('Structure de réponse invalide');
        }

        // Normaliser la confiance vers des clés i18n
        const confidenceMapping = {
            'élevée': 'forte',
            'elevée': 'forte',
            'haute': 'forte',
            'high': 'forte',
            'moyenne': 'moyenne',
            'medium': 'moyenne',
            'faible': 'faible',
            'basse': 'faible',
            'low': 'faible'
        };
        result.confiance = confidenceMapping[result.confiance.toLowerCase()] || 'moyenne';

        // Convertir le nom de matière détectée en ID si possible
        const detectedSubjectId = Object.entries(SUBJECT_NAMES).find(
            ([, name]) => name.toLowerCase() === result.matiere_detectee.toLowerCase()
        )?.[0] || null;

        console.log('[ContentVerification] Résultat:', {
            correspondance: result.correspondance,
            matiere_detectee: result.matiere_detectee,
            confiance: result.confiance
        });

        return {
            correspondance: result.correspondance,
            matiere_detectee: result.matiere_detectee,
            matiere_detectee_id: detectedSubjectId,
            confiance: result.confiance,
            message: result.message
        };

    } catch (error) {
        console.error('[ContentVerification] Erreur:', error.message);
        throw error;
    }
}

export default {
    verifyContentSubject
};
