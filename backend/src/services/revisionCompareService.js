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

REGLES D'EVALUATION STRICTES:

1. REFORMULATION ACCEPTEE vs JUXTAPOSITION REFUSEE:
   - ACCEPTE: "La chlorophylle donne la couleur verte aux plantes" (reformulation avec sens)
   - REFUSE: "chlorophylle vert plante" (simple juxtaposition de mots-cles)
   - Une reponse est valide seulement si:
     * Les concepts cles sont presents
     * La relation logique entre concepts est exprimee
     * La phrase montre une comprehension reelle (pas juste des mots isoles)

2. DEFINITIONS:
   - Sois plus strict sur les definitions exactes
   - Le sens doit etre preserve, meme avec des mots differents

3. ELEMENTS IMPORTANTS:
   - Les elements marques par l'utilisateur sont OBLIGATOIRES
   - S'ils manquent, ils sont automatiquement "high" importance

4. FEEDBACK NEUTRE SI INCOMPLET:
   - Si missingConcepts n'est pas vide, le feedback doit etre NEUTRE et ENCOURAGEANT
   - NE JAMAIS dire "bien joue", "bravo", "super" s'il reste des elements manquants
   - Exemples de feedback neutre: "Continue, tu progresses", "Concentre-toi sur les points manquants", "Tu avances, revois les elements en rouge"
   - Le message de succes/felicitations est RESERVE au cas ou missingConcepts est VIDE

Retourne UNIQUEMENT ce JSON (sans markdown, sans backticks):
{
    "understoodConcepts": [
        {"concept": "Nom du concept", "userText": "Ce que l'utilisateur a ecrit (phrase complete)", "originalText": "Texte original correspondant"}
    ],
    "missingConcepts": [
        {"concept": "Nom du concept manquant", "originalText": "Ce qui manque dans le rappel (pour surlignage)", "importance": "high"}
    ],
    "overallScore": 75,
    "feedback": "Message neutre si manquants, felicitations seulement si tout est compris"
}

Notes:
- "importance": "high" pour definitions et elements importants, "medium" pour details secondaires
- "overallScore": 0-100 base sur le ratio compris/total
- "originalText" dans missingConcepts doit etre le texte EXACT de la synthese pour permettre le surlignage
- Si le rappel est vide ou juste des mots sans sens, TOUS les concepts sont manquants`;

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
