// Importe le dictionnaire UI de l'ancien site (site/index.html) vers app/messages/{lang}.json.
// Usage (depuis app/) : node scripts/import-ui-v1.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('../site/index.html', 'utf8');
const start = html.indexOf('const UI = {');
let i = html.indexOf('{', start), depth = 0, end = i;
for (; end < html.length; end++) {
  const c = html[end];
  if (c === '"' || c === "'" || c === '`') { const q = c; end++; while (html[end] !== q) { if (html[end] === '\\') end++; end++; } continue; }
  if (c === '{') depth++; else if (c === '}' && --depth === 0) break;
}
const UI = new Function(`return (${html.slice(i, end + 1)})`)();
for (const [lang, dict] of Object.entries(UI)) {
  const out = { $schema: 'https://inlang.com/schema/inlang-message-format' };
  for (const [k, v] of Object.entries(dict)) if (typeof v === 'string') out[k] = v;
  writeFileSync(`messages/${lang}.json`, JSON.stringify(out, null, '\t') + '\n');
  console.log(lang, Object.keys(out).length - 1, 'textes');
}
