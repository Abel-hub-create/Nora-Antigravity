/**
 * Revision Compare Service
 *
 * AI-powered semantic comparison between user recall and original synthese.
 *
 * APPROACH: We split the synthese into segments OURSELVES (server-side),
 * then ask GPT to evaluate each numbered segment. This ensures perfect
 * highlighting since WE control the exact text, not GPT.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';

/**
 * Split synthese into logical segments (sentences/phrases)
 * Each segment will be evaluated independently by GPT
 * Returns array of { id, text, startIndex, endIndex }
 */
const splitIntoSegments = (text) => {
    const segments = [];

    // Normalize line breaks - handle both \n and literal \\n
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
                text: trimmed
            });
            continue;
        }

        // For regular lines, split by sentences if long enough
        if (trimmed.length > 100) {
            // Split on sentence boundaries
            const sentences = trimmed.split(/(?<=[.!?])\s+/);
            for (const sentence of sentences) {
                const s = sentence.trim();
                if (s.length > 15) {
                    segments.push({
                        id: segments.length + 1,
                        text: s
                    });
                }
            }
        } else if (trimmed.length > 15) {
            // Short lines - keep as single segment
            segments.push({
                id: segments.length + 1,
                text: trimmed
            });
        }
    }

    return segments;
};

/**
 * Compare user recall with original synthese semantically
 * @param {string} originalSummary - The original synthese content
 * @param {string} userRecall - What the user wrote/dictated from memory
 * @param {string|null} specificInstructions - Important elements marked by user during import
 * @returns {Object} Comparison results with understood/missing concepts
 */
export const compareRecall = async (originalSummary, userRecall, specificInstructions = null) => {
    // STEP 1: Split synthese into segments ourselves
    const segments = splitIntoSegments(originalSummary);

    console.log('[RevisionCompare] === STARTING COMPARISON ===');
    console.log('[RevisionCompare] Split into', segments.length, 'segments');
    console.log('[RevisionCompare] User recall length:', userRecall.length, 'chars');

    // Create numbered list for GPT
    const numberedSegments = segments.map(seg => `[${seg.id}] ${seg.text}`).join('\n\n');

    const prompt = `Tu es un enseignant qui evalue si un eleve a compris son cours.

SEGMENTS DE LA SYNTHESE (numerotes de 1 a ${segments.length}):
"""
${numberedSegments}
"""

RAPPEL DE L'UTILISATEUR:
"""
${userRecall}
"""
${specificInstructions ? `
ELEMENTS OBLIGATOIRES (doivent etre presents):
"""
${specificInstructions}
"""` : ''}

---

## TA MISSION

Pour CHAQUE segment numerote, determine si l'utilisateur a exprime cette idee dans son rappel.

Un segment est COMPRIS si:
- L'utilisateur a exprime la MEME IDEE (meme avec des mots differents)
- Reformulations acceptees: vocabulaire familier, simplifications, abreviations (O2 = oxygene, etc.)
- Le SENS est correct, meme si la forme est differente

Un segment est PAS COMPRIS si:
- L'idee du segment n'apparait PAS du tout dans le rappel
- Ou l'idee est exprimee avec un CONTRESENS (sens inverse)

## REGLE IMPORTANTE

Chaque segment absent du rappel = PAS COMPRIS.
Sois strict sur la presence des idees, tolerant sur la formulation.

## FORMAT DE REPONSE (JSON)

{
    "understood": [1, 3, 5],
    "notUnderstood": [2, 4, 6],
    "feedback": "Message encourageant"
}

IMPORTANT:
- Chaque numero de 1 a ${segments.length} doit apparaitre dans "understood" OU "notUnderstood"
- Pas de numero en double
- Pas de numero manquant`;

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0,
            response_format: { type: 'json_object' }
        });

        const rawResponse = response.choices[0].message.content;
        console.log('[RevisionCompare] GPT response:', rawResponse);

        const gptResult = JSON.parse(rawResponse);

        // Convert GPT result (segment IDs) to our format (with original text)
        const understoodIds = new Set(gptResult.understood || []);
        const notUnderstoodIds = new Set(gptResult.notUnderstood || []);

        const understoodConcepts = [];
        const missingConcepts = [];

        for (const segment of segments) {
            if (understoodIds.has(segment.id)) {
                understoodConcepts.push({
                    concept: `Segment ${segment.id}`,
                    userText: '', // We don't need this anymore
                    originalText: segment.text
                });
            } else {
                // If not in understood, it's missing (even if GPT forgot to list it)
                missingConcepts.push({
                    concept: `Segment ${segment.id}`,
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
            feedback: gptResult.feedback || 'Continue comme ca !'
        };

    } catch (error) {
        console.error('[RevisionCompare] Error:', error);
        throw new Error('Erreur lors de la comparaison. Veuillez reessayer.');
    }
};
