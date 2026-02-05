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
    // DATA: Contains numbers, percentages, dates, measurements
    const dataPatterns = [
        /\d+[%°]/,
        /\d+\s*(mg|g|kg|ml|l|cm|m|km|s|min|h|j|€|\$)/i,
        /\d{4}/,
        /\d+[\.,]\d+/,
        /^\d+\s/,
        /en\s+\d+/,
        /\d+\s+fois/,
        /\d+\s*à\s*\d+/,
    ];

    for (const pattern of dataPatterns) {
        if (pattern.test(text)) {
            return 'DATA';
        }
    }

    // DEFINITION: Contains definition markers
    const definitionPatterns = [
        /^\*\*[^*]+\*\*\s*:/,
        /^-\s*\*\*[^*]+\*\*/,
        /est\s+(un|une|le|la|l'|des)\s+/i,
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

    return 'CONCEPT';
};

/**
 * Split synthese into logical segments (sentences/phrases)
 */
const splitIntoSegments = (text) => {
    const segments = [];
    let normalizedText = text.replace(/\\n/g, '\n').replace(/  \n/g, '\n');
    const lines = normalizedText.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('## ')) continue;

        if (trimmed.startsWith('**') && trimmed.includes(':')) {
            segments.push({ id: segments.length + 1, text: trimmed, type: 'DEFINITION' });
            continue;
        }

        if (trimmed.length > 100) {
            const sentences = trimmed.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
                const s = sentence.trim();
                if (s.length > 15) {
                    segments.push({ id: segments.length + 1, text: s, type: classifySegment(s) });
                }
            }
        } else if (trimmed.length > 15) {
            segments.push({ id: segments.length + 1, text: trimmed, type: classifySegment(trimmed) });
        }
    }

    return segments;
};

/**
 * Build optimized prompt - same evaluation logic, condensed format
 */
const buildPrompt = (segments, userRecall, specificInstructions, level, customSettings) => {
    const settings = level === 'custom' && customSettings
        ? customSettings
        : REQUIREMENT_LEVELS[level] || REQUIREMENT_LEVELS.intermediate;

    // Compact segment list
    const segmentList = segments.map(seg => `[${seg.id}][${seg.type}] ${seg.text}`).join('\n');

    // Precision descriptions based on level
    const getPrecisionDesc = (value) => {
        if (value >= 95) return 'exact';
        if (value >= 85) return 'reformulation OK';
        return 'idée générale';
    };

    return `Évalue si l'étudiant a retenu chaque segment. Niveau: ${level.toUpperCase()}

SEGMENTS:
${segmentList}

RAPPEL DE L'ÉTUDIANT:
${userRecall}
${specificInstructions ? `\nÉLÉMENTS OBLIGATOIRES: ${specificInstructions}` : ''}

CRITÈRES (${level}):
- DEFINITION ${settings.definitions}%: ${getPrecisionDesc(settings.definitions)}
- CONCEPT ${settings.concepts}%: ${getPrecisionDesc(settings.concepts)}
- DATA ${settings.data}%: ${settings.data === 100 ? 'valeur exacte' : getPrecisionDesc(settings.data)}

RÈGLES:
- VERT: idée exprimée avec précision suffisante (synonymes/reformulations OK)
- ROUGE: absent, trop vague, ou erreur (contresens, inversion, attribution erronée)
- Segment non mentionné = ROUGE

Réponds en JSON:
{"understood":[ids segments verts],"notUnderstood":[ids segments rouges],"feedback":"message court"}

Chaque ID de 1 à ${segments.length} doit apparaître exactement une fois.`;
};

/**
 * Compare user recall with original synthese semantically
 */
export const compareRecall = async (
    originalSummary,
    userRecall,
    specificInstructions = null,
    requirementLevel = 'intermediate',
    customSettings = null
) => {
    const segments = splitIntoSegments(originalSummary);

    console.log('[RevisionCompare] Starting comparison');
    console.log('[RevisionCompare] Level:', requirementLevel, '| Segments:', segments.length);

    const prompt = buildPrompt(segments, userRecall, specificInstructions, requirementLevel, customSettings);

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0,
            response_format: { type: 'json_object' }
        }, {
            timeout: 60000
        });

        const rawResponse = response.choices[0].message.content;
        console.log('[RevisionCompare] Response received');

        const gptResult = JSON.parse(rawResponse);
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

        console.log('[RevisionCompare] Score:', overallScore, '%', `(${understoodConcepts.length}/${totalSegments})`);

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
