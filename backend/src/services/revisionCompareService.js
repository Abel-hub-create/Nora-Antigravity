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
    const prompt = `Tu es un enseignant qui evalue un rappel de cours.

SYNTHESE ORIGINALE:
"""
${originalSummary}
"""

RAPPEL DE L'UTILISATEUR:
"""
${userRecall}
"""

${specificInstructions ? `ELEMENTS OBLIGATOIRES:
"""
${specificInstructions}
"""` : ''}

---

## ETAPE 1 - DECOUPER LA SYNTHESE EN NOTIONS

D'abord, identifie TOUTES les notions distinctes de la synthese:
- Chaque definition
- Chaque processus/mecanisme
- Chaque equation/formule
- Chaque lieu/localisation
- Chaque condition
- Chaque comparaison
- Chaque consequence/resultat

Une synthese contient generalement entre 10 et 30 notions distinctes.

## ETAPE 2 - EVALUER CHAQUE NOTION

Pour CHAQUE notion identifiee, verifie si l'utilisateur l'a mentionnee dans son rappel.

ACQUIS (vert) si:
- L'utilisateur a exprime cette idee (meme reformulee, meme avec ses propres mots)
- Le sens est correct

NON ACQUIS (rouge) si:
- La notion n'est PAS mentionnee du tout dans le rappel
- Ou le sens est faux/inverse

## REGLE CRITIQUE

TOUTE notion de la synthese qui n'apparait PAS dans le rappel de l'utilisateur est automatiquement NON ACQUISE.

Si l'utilisateur ecrit une seule phrase, il ne peut avoir qu'une ou deux notions ACQUISES - toutes les autres sont NON ACQUISES.

Le score doit refleter: (notions acquises / total notions) * 100

## TOLERANCE SUR LA FORME

Quand une notion EST mentionnee, accepte les reformulations:
- Vocabulaire different ou familier
- Simplifications
- Abreviations (O2, CO2)
- Langage informel

## FORMAT JSON

{
    "understoodConcepts": [
        {"concept": "Nom court de la notion", "userText": "Ce que l'utilisateur a ecrit", "originalText": "Texte EXACT de la synthese a surligner en vert"}
    ],
    "missingConcepts": [
        {"concept": "Nom court de la notion", "originalText": "Texte EXACT de la synthese a surligner en rouge", "importance": "high", "reason": "absent"}
    ],
    "overallScore": 0-100,
    "feedback": "Message encourageant"
}

IMPORTANT:
- Chaque notion de la synthese DOIT apparaitre dans understoodConcepts OU missingConcepts
- originalText = copie EXACTE du texte de la synthese (pour surlignage)`;

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0, // Deterministic - same input = same output
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Ensure arrays exist
        result.understoodConcepts = result.understoodConcepts || [];
        result.missingConcepts = result.missingConcepts || [];
        result.overallScore = result.overallScore ?? 0;
        result.feedback = result.feedback || 'Continue comme ca !';

        // Log for debugging
        console.log('[RevisionCompare] User recall:', userRecall.substring(0, 100));
        console.log('[RevisionCompare] Understood:', result.understoodConcepts.length, 'concepts');
        console.log('[RevisionCompare] Missing:', result.missingConcepts.length, 'concepts');
        console.log('[RevisionCompare] Score:', result.overallScore);
        if (result.understoodConcepts.length > 0) {
            console.log('[RevisionCompare] Understood details:', JSON.stringify(result.understoodConcepts, null, 2));
        }

        return result;
    } catch (error) {
        console.error('[RevisionCompare] Error:', error);
        throw new Error('Erreur lors de la comparaison. Veuillez reessayer.');
    }
};
