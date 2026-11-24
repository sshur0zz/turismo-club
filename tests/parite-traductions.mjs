// Test de parité : chaque clé de l'espace équipe existe en français ET en italien (aucun libellé manquant).
// Usage : node tests/parite-traductions.mjs  → code de sortie 1 si une clé manque.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../site/pro/i18n.js', import.meta.url), 'utf8');
const ctx = { window: {}, document: { documentElement: {} }, localStorage: { getItem: () => null, setItem() {} }, navigator: { language: 'fr' } };
new Function('window', 'document', 'localStorage', 'navigator', src)(ctx.window, ctx.document, ctx.localStorage, ctx.navigator);
const TC = ctx.window.TC;
// Les dictionnaires ne sont pas exposés : on relit les blocs « fr: { … } » et « it: { … } » de DICT, accolades comptées hors chaînes
function block(l) {
  const start = src.indexOf('{', src.indexOf(`\n    ${l}: {`));
  let depth = 0, q = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  return '';
}
const keys = b => new Set([...b.matchAll(/(?:^|[,{\n])\s*([a-z][a-z0-9_]*)\s*:\s*['"`]/g)].map(m => m[1]));
const fr = keys(block('fr')), it = keys(block('it'));
const missIt = [...fr].filter(k => !it.has(k)), missFr = [...it].filter(k => !fr.has(k));
console.log(`fr : ${fr.size} clés · it : ${it.size} clés`);
if (missIt.length) console.log('Manquent en italien :', missIt.join(', '));
if (missFr.length) console.log('Manquent en français :', missFr.join(', '));
process.exit(missIt.length || missFr.length ? 1 : 0);
