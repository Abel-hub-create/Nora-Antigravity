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

PRINCIPE FONDAMENTAL - EVALUATION PAR TENTATIVE:
- Cette evaluation porte UNIQUEMENT sur le texte ecrit dans CETTE tentative
- Ne tiens JAMAIS compte des tentatives precedentes
- Si une notion etait correcte avant mais n'est plus ecrite maintenant, elle est NON RETENUE
- Chaque tentative est INDEPENDANTE et complete

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

REGLE DE VALIDATION - UNE IDEE COMPLETE:
Une reponse est consideree comme correcte UNIQUEMENT si elle exprime une idee complete:
- Un concept
- Relie a au moins une information importante
- Par une relation explicite (verbe, lien de cause, role, fonction, variation, etc.)

EXEMPLES:
Notion de reference: "La photosynthese permet aux plantes de produire de la matiere organique grace a la lumiere."
- REFUSE: "photosynthese lumiere" (mots-cles sans relation)
- REFUSE: "photosynthese plantes matiere" (mots-cles sans verbe ni lien)
- ACCEPTE: "La photosynthese permet aux plantes de produire de la matiere grace a la lumiere"
- ACCEPTE: "Grace a la photosynthese, les plantes produisent de la matiere avec la lumiere"

Cette regle s'applique de maniere IDENTIQUE pour TOUTES les notions, sans exception.

REGLES SUPPLEMENTAIRES:

1. DEUX ETATS UNIQUEMENT:
   - RETENU (understoodConcepts) = notion correctement exprimee avec une idee complete
   - NON RETENU (missingConcepts) = notion absente ou mal exprimee
   - Pas d'etat intermediaire

2. COUVERTURE OBLIGATOIRE:
   - Chaque notion importante de la synthese doit etre evaluee
   - Une notion non mentionnee = NON RETENUE
   - Une notion avec juste des mots-cles = NON RETENUE

3. ELEMENTS IMPORTANTS MARQUES:
   - Les elements marques par l'utilisateur sont OBLIGATOIRES
   - S'ils manquent, ils sont automatiquement non retenus

4. FEEDBACK NEUTRE SI INCOMPLET:
   - Si missingConcepts n'est pas vide, feedback NEUTRE uniquement
   - Exemples: "Continue, tu progresses", "Revois les elements en rouge"
   - Felicitations SEULEMENT si missingConcepts est VIDE

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
- "importance": toujours "high" (pas d'etat intermediaire)
- "overallScore": 0-100 base sur le ratio compris/total
- "originalText" dans missingConcepts doit etre le texte EXACT de la synthese pour permettre le surlignage
- Si le rappel est vide ou juste des mots sans relation, TOUS les concepts sont manquants`;

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
