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
    const prompt = `Tu es un evaluateur DETERMINISTE de comprehension conceptuelle.

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

## PRINCIPE FONDAMENTAL

Tu evalues la COMPREHENSION CONCEPTUELLE, pas la forme.
- Le vocabulaire exact, le style, la syntaxe ne comptent PAS
- Seul compte: l'utilisateur a-t-il compris et restitue le SENS de chaque notion?

## REGLE 1 - DISTINCTION ERREUR vs IMPRECISION

ERREUR BLOQUANTE (= notion INVALIDE):
- Contresens: le rappel dit le CONTRAIRE du cours
- Information fausse: un element remplace par quelque chose de FAUX ou ABSURDE
- Relation inversee: cause/consequence, avant/apres, condition/resultat inverses

IMPRECISION (= notion NON ACQUISE, pas d'erreur):
- Formulation vague ou incomplete SANS contresens
- Manque de details mais direction correcte
- Approximation qui ne CHANGE PAS le sens fondamental

Exemple:
- Reference: "La respiration cellulaire libere de l'energie"
- ERREUR: "libere du caca" → INVALIDE (information fausse)
- IMPRECISION: "libere quelque chose" → NON ACQUIS (trop vague, mais pas faux)
- VALIDE: "ca produit de l'energie" → ACQUIS (sens preserve)

## REGLE 2 - EVALUATION PAR IDEES ESSENTIELLES

Pour chaque notion, identifie ses IDEES ESSENTIELLES (1 a 3 max).
Une notion est ACQUISE seulement si TOUTES ses idees essentielles sont presentes et correctes.

Exemple - Notion: "La photosynthese permet aux plantes de produire de la matiere organique grace a la lumiere"
Idees essentielles:
1. Photosynthese = processus des plantes
2. Produit de la matiere organique
3. Necessite la lumiere

- Si les 3 sont presentes et correctes → ACQUIS
- Si 1 ou 2 manquent → NON ACQUIS
- Si 1 est FAUSSE (ex: "les animaux") → INVALIDE (erreur)

## REGLE 3 - PRIORITE AU SENS

ACCEPTER si le sens est preserve:
- Synonymes et reformulations
- Langage familier ou simplifie
- Ordre different des elements
- Absence de termes techniques si l'idee est la

REFUSER si le sens est altere:
- Contresens ou inversion logique
- Element essentiel manquant
- Information fausse introduite

Exemples:
- "en cas de penurie d'oxygene" = "quand y'a pas assez d'O2" = "sans oxygene" → MEME SENS
- "24h/24" = "tout le temps" = "en permanence" → MEME SENS
- "libere de l'energie" ≠ "libere du caca" → SENS DIFFERENT (erreur)

## REGLE 4 - ERREURS BLOQUANTES

Certaines erreurs invalident TOUTE la notion, meme si d'autres parties sont correctes:
- Terme cle remplace par un terme FAUX ou ABSURDE
- Relation causale INVERSEE
- Attribution a la mauvaise entite

Ces erreurs ont PRIORITE sur tout le reste.

## REGLE 5 - DETERMINISME ABSOLU

Une meme reponse = un meme verdict. TOUJOURS.
Pas de variabilite, pas de seuil flottant, pas d'appreciation subjective.

## PROCESSUS D'EVALUATION (pour chaque notion)

1. Identifier les IDEES ESSENTIELLES de la notion
2. Chercher si le rappel contient une ERREUR BLOQUANTE → Si oui: INVALIDE
3. Verifier si TOUTES les idees essentielles sont presentes
4. Verifier si le SENS est preserve (meme avec reformulation)
5. Decision finale: ACQUIS ou NON ACQUIS

## FORMAT DE SORTIE

JSON uniquement:
{
    "understoodConcepts": [
        {"concept": "Nom", "userText": "Ce que l'utilisateur a ecrit", "originalText": "Texte EXACT de la synthese"}
    ],
    "missingConcepts": [
        {"concept": "Nom", "originalText": "Texte EXACT de la synthese", "importance": "high", "reason": "absent|incomplet|erreur factuelle|contresens"}
    ],
    "overallScore": 0-100,
    "feedback": "Message neutre et encourageant"
}

Notes:
- originalText = copie EXACTE du texte de la synthese (pour surlignage visuel)
- reason = classification du probleme
- overallScore = (understoodConcepts.length / total notions) * 100
- Chaque notion DOIT apparaitre dans exactement UN des deux tableaux`;

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

        return result;
    } catch (error) {
        console.error('[RevisionCompare] Error:', error);
        throw new Error('Erreur lors de la comparaison. Veuillez reessayer.');
    }
};
