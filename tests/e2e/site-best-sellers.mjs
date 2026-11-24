// Test de bout en bout (Playwright) — compte « tc-test-admin@example.com » et données marquées TEST, supprimées après le test.
// Lancer : TEST_PW=… node tests/e2e/<fichier>.mjs  (site servi par : python3 -m http.server -d site 8765). Jamais sur un compte réel.
import { chromium } from 'playwright';
const B = process.env.B || 'http://127.0.0.1:8765/';
const b = await chromium.launch({ channel: 'chromium' }); const res = []; const errs = [];
const ok = (n, p, i='') => { res.push(p); console.log((p?'✅ ':'❌ ')+n+(i?' — '+i:'')); };
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(B + '#accueil'); await p.waitForFunction(() => typeof state !== 'undefined' && state.dbOk, null, { timeout: 15000 }); await p.waitForTimeout(400);
const best = await p.$$eval('section.best a.card', as => as.map(a => a.getAttribute('href').slice(10)));
ok('Accueil : 4 best-sellers', JSON.stringify(best) === JSON.stringify(['vatican-sixtine','colisee-forum-palatin','hop-on-hop-off','pompei-naples-journee']), best.join(', '));
const order = await p.$$eval('main section', s => s.map(x => x.className));
ok('Section best-sellers juste sous la bannière', order[1] && order[1].includes('best'), order.slice(0,3).join(' | '));
ok('Badges « Best seller » ×4', (await p.$$eval('section.best .badge', x => x.map(e => e.textContent))).every(t => t === 'Best seller'));
await p.goto(B + '#catalogue'); await p.waitForTimeout(400);
const first = await p.$$eval('a.card', as => as.slice(0,4).map(a => a.getAttribute('href').slice(10)));
ok('Catalogue : best-sellers en premier', first.includes('vatican-sixtine') && first.includes('colisee-forum-palatin') && first.includes('hop-on-hop-off') && first.includes('pompei-naples-journee'), first.join(', '));
for (const [l, w] of [['fr','best-sellers à Rome'],['it','più venduti'],['ko','베스트셀러']]) { await p.evaluate(x => setLang(x), l); await p.goto(B + '#accueil'); await p.waitForTimeout(300); ok('Langue ' + l, (await p.textContent('section.best h2')).includes(w)); }
await p.evaluate(() => setLang('fr')); await p.goto(B + '#accueil'); await p.waitForTimeout(2500);
await p.evaluate(() => document.querySelector('section.best').scrollIntoView()); await p.waitForTimeout(500); await p.screenshot({ path: 'best.png' });
const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await m.goto(B + '#accueil'); await m.waitForTimeout(800);
ok('Mobile 390 px : pas de défilement horizontal', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
ok('Console sans erreur', !errs.length, errs.slice(0,2).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
