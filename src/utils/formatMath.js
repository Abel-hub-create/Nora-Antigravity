/**
 * formatMath — convertit les notations mathématiques textuelles en caractères unicode propres.
 *
 * Exemples :
 *   x^2       → x²
 *   H_2O      → H₂O
 *   x^(n+1)   → xⁿ⁺¹
 *   >=        → ≥
 *   sqrt(x)   → √x
 *   pi        → π
 */

const SUP = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ',
  'j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ',
  't':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','+':'⁺','-':'⁻','=':'⁼'
};

const SUB = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  'a':'ₐ','e':'ₑ','i':'ᵢ','n':'ₙ','o':'ₒ','r':'ᵣ','u':'ᵤ','v':'ᵥ','x':'ₓ',
  '+':'₊','-':'₋','=':'₌'
};

const toSup = str => str.split('').map(c => SUP[c] || SUP[c.toLowerCase()] || c).join('');
const toSub = str => str.split('').map(c => SUB[c] || SUB[c.toLowerCase()] || c).join('');

const GREEK = {
  alpha:'α', bêta:'β', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε',
  theta:'θ', lambda:'λ', mu:'μ', sigma:'σ', tau:'τ',
  omega:'ω', phi:'φ', psi:'ψ', pi:'π', rho:'ρ', eta:'η', nu:'ν'
};

export function formatMath(text) {
  if (!text || typeof text !== 'string') return text;

  // Exposants multi-caractères : x^(2n+1) ou x^{n-1}
  text = text.replace(/\^[({]([^)}\s]{1,10})[)}]/g, (_, expr) => toSup(expr));
  // Exposant simple : x^2, a^n, 10^-3
  text = text.replace(/\^([0-9a-zA-Z+\-])/g, (_, c) => SUP[c] || SUP[c.toLowerCase()] || `^${c}`);

  // Indices multi-caractères : x_(2n) ou x_{n+1}
  text = text.replace(/_[({]([^)}\s]{1,10})[)}]/g, (_, expr) => toSub(expr));
  // Indice simple : H_2, x_n
  text = text.replace(/_([0-9a-zA-Z+\-])/g, (_, c) => SUB[c] || SUB[c.toLowerCase()] || `_${c}`);

  // Opérateurs de comparaison
  text = text.replace(/>=/g, '≥');
  text = text.replace(/<=/g, '≤');
  text = text.replace(/!=/g, '≠');
  text = text.replace(/~=/g, '≈');

  // Flèches
  text = text.replace(/ <-> /g, ' ↔ ');
  text = text.replace(/ -> /g, ' → ');
  text = text.replace(/ => /g, ' ⇒ ');

  // ± et ∓
  text = text.replace(/\+-/g, '±');
  text = text.replace(/-\+/g, '∓');

  // Multiplication
  text = text.replace(/ \* /g, ' × ');
  text = text.replace(/ x /g, (m, offset, str) => {
    // Uniquement si entouré de chiffres (ex: 3 x 4)
    const before = str[offset - 1];
    const after = str[offset + 3];
    if (/\d/.test(before) && /\d/.test(after)) return ' × ';
    return m;
  });

  // Infini
  text = text.replace(/\binfini\b/gi, '∞');
  text = text.replace(/\binfinity\b/gi, '∞');

  // Racine carrée
  text = text.replace(/sqrt\(([^)]{1,20})\)/g, '√($1)');
  text = text.replace(/racine\s+carrée\s+de\s+(\w+)/gi, '√$1');

  // Lettres grecques (mot entier uniquement)
  for (const [word, sym] of Object.entries(GREEK)) {
    text = text.replace(new RegExp(`\\b${word}\\b`, 'gi'), sym);
  }

  return text;
}
