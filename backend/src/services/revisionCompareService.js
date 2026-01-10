/**
 * Revision Compare Service
 *
 * AI-powered semantic comparison between user recall and original synthese.
 * Uses GPT-4o-mini to evaluate understanding, not word-for-word matching.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';

/**
 * Compare user recall with original synthese semantically
 * @param {string} originalSummary - The original synthese content
 * @param {string} userRecall - What the user wrote/dictated from memory
 * @param {string|null} specificInstructions - Important elements marked by user during import
 * @returns {Object} Comparison results with understood/missing concepts
 */
export const compareRecall = async (originalSummary, userRecall, specificInstructions = null) => {
    const prompt = `Tu es Nora, une application d'etude calme et pedagogique.

Compare le rappel de l'utilisateur avec la synthese originale de maniere SEMANTIQUE (pas mot a mot).

SYNTHESE ORIGINALE:
"""
${originalSummary}
"""

RAPPEL DE L'UTILISATEUR:
"""
${userRecall}
"""

${specificInstructions ? `ELEMENTS IMPORTANTS MARQUES PAR L'UTILISATEUR (DOIVENT etre presents):
"""
${specificInstructions}
"""` : ''}

REGLES D'EVALUATION:
- Accepte les reformulations et synonymes
- Sois plus strict sur les definitions exactes
- Les elements importants marques par l'utilisateur sont OBLIGATOIRES
- Evalue la comprehension globale, pas la memorisation mot a mot
- Un concept est "compris" meme si l'utilisateur l'a reformule differemment

Retourne UNIQUEMENT ce JSON (sans markdown, sans backticks):
{
    "understoodConcepts": [
        {"concept": "Nom du concept", "userText": "Ce que l'utilisateur a ecrit", "originalText": "Texte original correspondant"}
    ],
    "missingConcepts": [
        {"concept": "Nom du concept manquant", "originalText": "Ce qui manque dans le rappel", "importance": "high"}
    ],
    "overallScore": 75,
    "feedback": "Message encourageant personnalise en francais"
}

Notes:
- "importance" peut etre "high" ou "medium"
- "overallScore" est un nombre entre 0 et 100
- Si le rappel est vide ou sans rapport, retourne understoodConcepts=[] et tous les concepts comme manquants`;

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Ensure arrays exist
        result.understoodConcepts = result.understoodConcepts || [];
        result.missingConcepts = result.missingConcepts || [];
        result.overallScore = result.overallScore ?? 0;
        result.feedback = result.feedback || 'Continue comme ca !';

        return result;
    } catch (error) {
        console.error('[RevisionCompare] Error:', error);
        throw new Error('Erreur lors de la comparaison. Veuillez reessayer.');
    }
};
