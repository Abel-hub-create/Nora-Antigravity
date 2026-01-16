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
    const prompt = `Tu es un enseignant evaluateur. Tu dois analyser un rappel redige librement par un utilisateur et le comparer a une synthese de cours structuree.

SYNTHESE ORIGINALE:
"""
${originalSummary}
"""

RAPPEL DE L'UTILISATEUR:
"""
${userRecall}
"""

${specificInstructions ? `ELEMENTS OBLIGATOIRES (doivent etre presents):
"""
${specificInstructions}
"""` : ''}

---

## CONTEXTE GENERAL

L'objectif n'est PAS de comparer des phrases, mais d'evaluer la COMPREHENSION REELLE des notions presentes dans la synthese.
La validation doit etre logique, coherente, deterministe et pedagogique, comme le ferait un enseignant humain.

## PRINCIPE CENTRAL (NON NEGOCIABLE)

La validation repose sur le SENS et la COHERENCE CONCEPTUELLE, jamais sur la similarite textuelle ou le copier-coller.

## DECOUPAGE LOGIQUE OBLIGATOIRE

AVANT toute validation:
1. Considere la synthese comme un ensemble de NOTIONS DISTINCTES (definitions, conditions, relations, mecanismes, comparaisons)
2. Evalue chaque rappel utilisateur UNIQUEMENT par rapport aux notions qu'il concerne explicitement
3. Il est INTERDIT d'evaluer un rappel de maniere globale ou floue

## REGLES DE RAISONNEMENT POUR CHAQUE NOTION

### 1. Comprehension avant tout
Tu dois determiner si l'utilisateur a compris l'IDEE ESSENTIELLE de la notion, independamment de la forme, du vocabulaire exact ou de la syntaxe.

### 2. Reformulation libre autorisee
Une notion peut etre validee meme si elle est reformulee, TANT QUE:
- Le sens est respecte
- Les relations logiques sont correctes
- Aucune erreur bloquante n'est introduite

### 3. Erreurs bloquantes (priorite absolue)
Si le rappel contient:
- Une CONTRADICTION avec le cours
- Une information scientifiquement ou factuellement FAUSSE
- Une alteration qui CHANGE le sens fondamental
→ La notion est NON ACQUISE, meme si certains mots-cles sont presents

### 4. Imprecision ≠ erreur
Une formulation vague, incomplete ou imprecise SANS contresens ne doit PAS etre consideree comme fausse.
→ La notion est simplement NON ACQUISE, pas invalide pour erreur

### 5. Idees essentielles obligatoires
Chaque notion possede des idees essentielles (1 a 3 max).
Si une ou plusieurs de ces idees sont ABSENTES, la notion ne peut PAS etre validee, meme si d'autres elements sont corrects.

## DETERMINISME STRICT

Une meme reponse utilisateur, analysee dans le meme contexte, doit produire EXACTEMENT le meme verdict a chaque tentative.
Aucune variabilite, tolerance fluctuante ou appreciation aleatoire n'est acceptable.

## ALIGNEMENT AVEC LA SYNTHESE (CRITIQUE)

- Une notion ne peut etre consideree comme ACQUISE que si cela se reflete DIRECTEMENT sur la synthese correspondante
- Il est INTERDIT de valider une notion "en dehors" de la synthese
- Chaque decision logique doit avoir un impact clair et coherent sur l'etat de la synthese

## REGLE VISUELLE (STRICTE)

Il n'existe que DEUX etats finaux pour chaque notion:
- VERT: notion acquise (comprise)
- ROUGE: notion non acquise (manquante, incomplete, ou erronee)

TOUT ce qui n'est pas clairement compris est ROUGE.
AUCUN texte neutre ne doit subsister apres l'analyse.

## FORMAT DE SORTIE

JSON uniquement (sans markdown, sans backticks):
{
    "understoodConcepts": [
        {"concept": "Nom de la notion", "userText": "Ce que l'utilisateur a ecrit (reformulation)", "originalText": "Texte EXACT copie de la synthese pour surlignage vert"}
    ],
    "missingConcepts": [
        {"concept": "Nom de la notion", "originalText": "Texte EXACT copie de la synthese pour surlignage rouge", "importance": "high", "reason": "absent|incomplet|erreur factuelle|contresens"}
    ],
    "overallScore": 0-100,
    "feedback": "Message neutre et encourageant"
}

REGLES IMPORTANTES:
- originalText = copie EXACTE du texte de la synthese (pour permettre le surlignage visuel)
- overallScore = (understoodConcepts.length / total notions) * 100
- Chaque notion DOIT apparaitre dans EXACTEMENT UN des deux tableaux
- Si le rappel est vide ou hors-sujet, TOUTES les notions vont dans missingConcepts

OBJECTIF FINAL: Te comporter comme un enseignant exigeant mais juste - tolerant a la reformulation, strict face aux contresens, coherent d'une tentative a l'autre, focalise sur la comprehension reelle et non sur la forme.`;

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
