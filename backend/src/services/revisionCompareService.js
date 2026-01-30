/**
 * Revision Compare Service
 *
 * AI-powered semantic comparison between user recall and original synthese.
 * Supports different requirement levels (beginner, intermediate, expert, custom).
 *
 * APPROACH: We split the synthese into segments OURSELVES (server-side),
 * classify each segment by type (definition, concept, data), then ask GPT
 * to evaluate each segment according to the requirement level.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';

/**
 * Default precision settings per requirement level
 */
const REQUIREMENT_LEVELS = {
    beginner: {
        definitions: 70,
        concepts: 70,
        data: 70
    },
    intermediate: {
        definitions: 85,
        concepts: 85,
        data: 95
    },
    expert: {
        definitions: 95,
        concepts: 95,
        data: 100
    }
};

/**
 * Classify a text segment into DEFINITION, CONCEPT, or DATA
 */
const classifySegment = (text) => {
    const lowerText = text.toLowerCase();

    // DATA: Contains numbers, percentages, dates, measurements
    const dataPatterns = [
        /\d+[%°]/, // Percentages, degrees
        /\d+\s*(mg|g|kg|ml|l|cm|m|km|s|min|h|j|€|\$)/i, // Units
        /\d{4}/, // Years (4 digits)
        /\d+[\.,]\d+/, // Decimal numbers
        /^\d+\s/, // Starts with number
        /en\s+\d+/, // "en 1945", "en 2020"
        /\d+\s+fois/, // "X fois"
        /\d+\s*à\s*\d+/, // Ranges "10 à 20"
    ];

    for (const pattern of dataPatterns) {
        if (pattern.test(text)) {
            return 'DATA';
        }
    }

    // DEFINITION: Contains definition markers
    const definitionPatterns = [
        /^\*\*[^*]+\*\*\s*:/, // **Term** : definition
        /^-\s*\*\*[^*]+\*\*/, // - **Term**
        /est\s+(un|une|le|la|l'|des)\s+/i, // "est un/une..."
        /se\s+définit\s+comme/i,
        /désigne\s+(un|une|le|la)/i,
        /signifie\s+/i,
        /correspond\s+à/i,
        /consiste\s+en/i,
        /représente\s+(un|une|le|la)/i,
    ];

    for (const pattern of definitionPatterns) {
        if (pattern.test(text)) {
            return 'DEFINITION';
        }
    }

    // Default to CONCEPT
    return 'CONCEPT';
};

/**
 * Split synthese into logical segments (sentences/phrases)
 * Each segment is classified by type and will be evaluated independently
 * Returns array of { id, text, type }
 */
const splitIntoSegments = (text) => {
    const segments = [];

    // Normalize line breaks
    let normalizedText = text.replace(/\\n/g, '\n').replace(/  \n/g, '\n');

    // Split by lines
    const lines = normalizedText.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip section headers (## Title)
        if (trimmed.startsWith('## ')) continue;

        // For definition lines like "**Term** : definition"
        if (trimmed.startsWith('**') && trimmed.includes(':')) {
            segments.push({
                id: segments.length + 1,
                text: trimmed,
                type: 'DEFINITION'
            });
            continue;
        }

        // For regular lines, split by sentences if long enough
        if (trimmed.length > 100) {
            const sentences = trimmed.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
                const s = sentence.trim();
                if (s.length > 15) {
                    segments.push({
                        id: segments.length + 1,
                        text: s,
                        type: classifySegment(s)
                    });
                }
            }
        } else if (trimmed.length > 15) {
            segments.push({
                id: segments.length + 1,
                text: trimmed,
                type: classifySegment(trimmed)
            });
        }
    }

    return segments;
};

/**
 * Build the prompt with requirement level instructions
 */
const buildPrompt = (segments, userRecall, specificInstructions, level, customSettings) => {
    // Get precision settings
    const settings = level === 'custom' && customSettings
        ? customSettings
        : REQUIREMENT_LEVELS[level] || REQUIREMENT_LEVELS.intermediate;

    // Create numbered list with type annotations
    const numberedSegments = segments.map(seg =>
        `[${seg.id}] [${seg.type}] ${seg.text}`
    ).join('\n\n');

    // Count segments by type
    const typeCounts = segments.reduce((acc, seg) => {
        acc[seg.type] = (acc[seg.type] || 0) + 1;
        return acc;
    }, {});

    return `Tu es un correcteur qui évalue si un étudiant a retenu le contenu de sa synthèse.

## SEGMENTS DE LA SYNTHESE

Chaque segment est numéroté et typé [DEFINITION], [CONCEPT] ou [DATA]:

"""
${numberedSegments}
"""

## RAPPEL DE L'ETUDIANT

Ce que l'étudiant a écrit de mémoire:
"""
${userRecall}
"""
${specificInstructions ? `
## ELEMENTS OBLIGATOIRES

Ces éléments doivent ABSOLUMENT être présents dans le rappel:
"""
${specificInstructions}
"""
` : ''}
---

## NIVEAU D'EXIGENCE : ${level.toUpperCase()}

Critères de précision selon le type de segment:

| Type | Précision requise | Ce que ça signifie |
|------|-------------------|-------------------|
| DEFINITION | ${settings.definitions}% | ${settings.definitions >= 95 ? 'Quasi-parfait: tous les termes clés et leur sens exact' : settings.definitions >= 85 ? 'Reformulation acceptée si le sens est préservé' : 'Idée générale suffit, les termes exacts ne sont pas requis'} |
| CONCEPT | ${settings.concepts}% | ${settings.concepts >= 95 ? 'Explication complète avec tous les détails' : settings.concepts >= 85 ? 'Reformulation acceptée si logique correcte' : 'Compréhension générale, simplifications acceptées'} |
| DATA | ${settings.data}% | ${settings.data === 100 ? 'Aucune erreur: chiffres/dates/valeurs EXACTS' : settings.data >= 95 ? 'Très précis, marge infime (±5%)' : 'Ordre de grandeur correct, approximations acceptées'} |

Statistiques des segments: ${typeCounts.DEFINITION || 0} définitions, ${typeCounts.CONCEPT || 0} concepts, ${typeCounts.DATA || 0} données.

---

## COMMENT DECIDER SI UN SEGMENT EST RETENU (VERT) OU NON (ROUGE)

### REGLE FONDAMENTALE
- VERT (retenu): L'étudiant a exprimé L'IDÉE du segment avec la précision requise par le niveau
- ROUGE (non retenu): L'idée est absente, trop vague, ou contient une erreur bloquante

### POUR CHAQUE TYPE DE SEGMENT:

**[DEFINITION] - Précision requise: ${settings.definitions}%**
${settings.definitions >= 95 ? `
- VERT: Le terme ET sa signification exacte sont présents
- ROUGE: Terme absent, ou définition incomplète/erronée
- Exemple: "La photosynthèse est le processus de conversion de lumière en énergie chimique"
  - VERT si: "La photosynthèse convertit la lumière en énergie chimique"
  - ROUGE si: "La photosynthèse c'est un truc avec la lumière" (trop vague)
` : settings.definitions >= 85 ? `
- VERT: L'idée centrale de la définition est présente, même reformulée
- ROUGE: Idée absente ou sens inversé
- Exemple: "La photosynthèse est le processus de conversion de lumière en énergie chimique"
  - VERT si: "Les plantes transforment la lumière en énergie" (reformulation OK)
  - ROUGE si: "La photosynthèse c'est la respiration" (sens erroné)
` : `
- VERT: L'étudiant montre qu'il comprend le concept général
- ROUGE: Aucune mention ou contresens flagrant
- Exemple: "La photosynthèse est le processus de conversion de lumière en énergie chimique"
  - VERT si: "Les plantes utilisent la lumière" (idée générale OK)
  - ROUGE si: Pas mentionné du tout
`}

**[CONCEPT] - Précision requise: ${settings.concepts}%**
${settings.concepts >= 95 ? `
- VERT: Tous les éléments du concept sont présents et corrects
- ROUGE: Élément manquant ou logique incorrecte
- Accepter: Synonymes, vocabulaire simplifié (O2 = oxygène, etc.)
- Rejeter: Relations causales inversées, éléments essentiels manquants
` : settings.concepts >= 85 ? `
- VERT: L'idée principale est exprimée, même avec des mots différents
- ROUGE: Idée absente ou contresens
- Accepter: Reformulations, simplifications, ordre différent
- Rejeter: Contradictions, inversions de cause/effet
` : `
- VERT: L'étudiant a compris l'essentiel du concept
- ROUGE: Aucune trace de compréhension ou erreur grave
- Accepter: Explications simplifiées, exemples personnels, approximations
- Rejeter: Contresens flagrants
`}

**[DATA] - Précision requise: ${settings.data}%**
${settings.data === 100 ? `
- VERT: Valeur EXACTE (chiffre, date, pourcentage, mesure)
- ROUGE: Toute approximation ou erreur
- Exemple: "1789" doit être "1789", pas "fin du 18ème siècle"
- Exemple: "70%" doit être "70%", pas "environ 70%" ou "la majorité"
` : settings.data >= 95 ? `
- VERT: Valeur correcte ou très proche (±5%)
- ROUGE: Erreur significative ou valeur absente
- Exemple: "1789" → VERT si "1789" ou "1788-1790"
- Exemple: "70%" → VERT si "70%" ou "environ 70%", ROUGE si "50%"
` : `
- VERT: Ordre de grandeur correct
- ROUGE: Erreur d'ordre de grandeur ou absence
- Exemple: "1789" → VERT si "fin 18ème siècle"
- Exemple: "70%" → VERT si "la majorité", ROUGE si "une minorité"
`}

### ERREURS BLOQUANTES (toujours ROUGE, quel que soit le niveau):
1. CONTRESENS: "La photosynthèse consomme de l'énergie" (au lieu de produire)
2. ATTRIBUTION ERRONÉE: "Les animaux font la photosynthèse"
3. RELATION INVERSÉE: "L'eau est produite par la photosynthèse" (alors qu'elle est consommée)

### REFORMULATIONS ACCEPTÉES (selon le niveau):
- Synonymes: "énergie" = "force" = "puissance" (si contexte clair)
- Abréviations: "O2" = "oxygène", "CO2" = "dioxyde de carbone"
- Simplifications: "quand y'a pas d'oxygène" = "en l'absence d'oxygène"
- Vocabulaire familier: "ça fait" = "cela produit"

---

## FORMAT DE REPONSE (JSON STRICT)

{
    "understood": [1, 3, 5],
    "notUnderstood": [2, 4, 6],
    "feedback": "Message encourageant adapté au score"
}

## REGLES ABSOLUES

1. Chaque numéro de 1 à ${segments.length} doit apparaître dans "understood" OU "notUnderstood"
2. Pas de numéro en double
3. Pas de numéro manquant
4. Un segment non mentionné dans le rappel = ROUGE (notUnderstood)
5. Applique STRICTEMENT les critères de précision du niveau ${level.toUpperCase()}`;
};

/**
 * Compare user recall with original synthese semantically
 * @param {string} originalSummary - The original synthese content
 * @param {string} userRecall - What the user wrote/dictated from memory
 * @param {string|null} specificInstructions - Important elements marked by user during import
 * @param {string} requirementLevel - 'beginner', 'intermediate', 'expert', or 'custom'
 * @param {object|null} customSettings - Custom precision settings (only for 'custom' level)
 * @returns {Object} Comparison results with understood/missing concepts
 */
export const compareRecall = async (
    originalSummary,
    userRecall,
    specificInstructions = null,
    requirementLevel = 'intermediate',
    customSettings = null
) => {
    // STEP 1: Split synthese into typed segments
    const segments = splitIntoSegments(originalSummary);

    console.log('[RevisionCompare] === STARTING COMPARISON ===');
    console.log('[RevisionCompare] Requirement level:', requirementLevel);
    console.log('[RevisionCompare] Split into', segments.length, 'segments');
    console.log('[RevisionCompare] Segment types:', segments.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
    }, {}));
    console.log('[RevisionCompare] User recall length:', userRecall.length, 'chars');

    // STEP 2: Build the prompt with requirement level
    const prompt = buildPrompt(segments, userRecall, specificInstructions, requirementLevel, customSettings);

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0, // Deterministic results
            response_format: { type: 'json_object' }
        });

        const rawResponse = response.choices[0].message.content;
        console.log('[RevisionCompare] GPT response:', rawResponse);

        const gptResult = JSON.parse(rawResponse);

        // Convert GPT result (segment IDs) to our format (with original text and type)
        const understoodIds = new Set(gptResult.understood || []);

        const understoodConcepts = [];
        const missingConcepts = [];

        for (const segment of segments) {
            if (understoodIds.has(segment.id)) {
                understoodConcepts.push({
                    concept: `Segment ${segment.id}`,
                    type: segment.type,
                    originalText: segment.text
                });
            } else {
                missingConcepts.push({
                    concept: `Segment ${segment.id}`,
                    type: segment.type,
                    originalText: segment.text,
                    importance: 'high',
                    reason: 'absent'
                });
            }
        }

        const totalSegments = segments.length;
        const overallScore = totalSegments > 0
            ? Math.round((understoodConcepts.length / totalSegments) * 100)
            : 0;

        console.log('[RevisionCompare] === RESULTS ===');
        console.log('[RevisionCompare] Understood:', understoodConcepts.length, '/', totalSegments);
        console.log('[RevisionCompare] Score:', overallScore, '%');

        return {
            understoodConcepts,
            missingConcepts,
            overallScore,
            feedback: gptResult.feedback || 'Continue comme ça !',
            requirementLevel,
            segmentStats: {
                total: totalSegments,
                byType: segments.reduce((acc, s) => {
                    acc[s.type] = (acc[s.type] || 0) + 1;
                    return acc;
                }, {})
            }
        };

    } catch (error) {
        console.error('[RevisionCompare] Error:', error);
        throw new Error('Erreur lors de la comparaison. Veuillez réessayer.');
    }
};
