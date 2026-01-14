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

## PRINCIPE FONDAMENTAL - COMPARAISON STRICTE PAR PRESENCE

REGLE ABSOLUE: Une notion est consideree comme RETENUE uniquement si:
- Elle est EXPLICITEMENT ecrite dans le rappel de CETTE tentative
- OU elle est correctement reformulee avec une idee complete

CONSEQUENCE DIRECTE:
- Toute notion ABSENTE du rappel = automatiquement NON RETENUE
- Il ne doit JAMAIS etre suppose qu'une notion est acquise si elle n'a pas ete ecrite
- Pas d'exception a cette regle

## PAS DE MEMOIRE ENTRE TENTATIVES

- Cette evaluation porte UNIQUEMENT sur le texte ecrit dans CETTE tentative
- Ne tiens JAMAIS compte des tentatives precedentes
- Si une notion etait correcte avant mais n'est plus ecrite maintenant = NON RETENUE
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

## GRANULARITE DE LA COMPARAISON - PAR NOTION

IMPORTANT: La comparaison doit se faire PAR NOTION INDIVIDUELLE, pas par section globale.

Exemple de ce qu'il faut faire:
- Definitions = peut etre VERT (retenu)
- Points cles = peut etre ROUGE (non retenu)
- Metaphores = peut etre ROUGE (non retenu)

Il ne doit PAS y avoir de validation implicite d'un bloc entier si une seule partie a ete ecrite.
Chaque notion/concept de la synthese doit etre evaluee SEPAREMENT.

## REGLE DE VALIDATION - UNE IDEE COMPLETE

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

## DEUX ETATS UNIQUEMENT - SURLIGNAGE EXPLICITE

Chaque notion doit avoir UN etat clair et explicite:
- VERT (understoodConcepts) = notion correctement exprimee avec une idee complete
- ROUGE (missingConcepts) = notion absente, incomplete ou mal exprimee

INTERDIT:
- Pas d'etat intermediaire (pas de orange/jaune)
- Pas de notion sans etat attribue
- Le simple fait de "ne pas etre rouge" ne signifie PAS qu'une notion est acquise

## COUVERTURE OBLIGATOIRE

- CHAQUE notion importante de la synthese DOIT apparaitre dans understoodConcepts OU missingConcepts
- Aucune notion ne doit etre ignoree ou laissee sans evaluation
- Une notion non mentionnee dans le rappel = automatiquement dans missingConcepts

## ELEMENTS IMPORTANTS MARQUES

- Les elements marques par l'utilisateur sont OBLIGATOIRES
- S'ils manquent, ils sont automatiquement dans missingConcepts

## FEEDBACK

- Si missingConcepts n'est pas vide: feedback NEUTRE ("Continue, tu progresses", "Revois les elements en rouge")
- Felicitations SEULEMENT si missingConcepts est VIDE (100%)

Retourne UNIQUEMENT ce JSON (sans markdown, sans backticks):
{
    "understoodConcepts": [
        {"concept": "Nom du concept", "userText": "Ce que l'utilisateur a ecrit", "originalText": "Texte EXACT de la synthese pour surlignage vert"}
    ],
    "missingConcepts": [
        {"concept": "Nom du concept manquant", "originalText": "Texte EXACT de la synthese pour surlignage rouge", "importance": "high"}
    ],
    "overallScore": 75,
    "feedback": "Message neutre si manquants, felicitations seulement si 100%"
}

Notes importantes:
- "importance": toujours "high" (pas d'etat intermediaire)
- "overallScore": 0-100 base sur (understoodConcepts.length / total notions) * 100
- "originalText" doit etre le texte EXACT de la synthese pour permettre le surlignage visuel
- Si le rappel est vide ou juste des mots sans relation, TOUTES les notions vont dans missingConcepts`;

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
