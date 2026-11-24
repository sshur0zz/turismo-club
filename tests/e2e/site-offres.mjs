// Test de bout en bout (Playwright) — compte « tc-test-admin@example.com » et données marquées TEST, supprimées après le test.
// Lancer : TEST_PW=… node tests/e2e/<fichier>.mjs  (site servi par : python3 -m http.server -d site 8765). Jamais sur un compte réel.
import { chromium } from 'playwright';
const B = 'http://127.0.0.1:8765/';
const NEW = ['rome-classique','audience-papale','vatican-bus-24h','thermes-diocletien-bus','rome-pass-72h','orvieto-assise','sejour-rome-pompei','sejour-rome-assise','transfert-prive'];
const b = await chromium.launch({ channel: 'chromium' }); const res = []; const errs = [];
const ok = (n, p, i='') => { res.push(p); console.log((p?'✅ ':'❌ ')+n+(i?' — '+i:'')); };
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
const badImg = []; p.on('response', r => { if (/upload\.wikimedia/.test(r.url()) && r.status() >= 400) badImg.push(r.status()+' '+r.url()); });
await p.goto(B + '#catalogue'); await p.waitForFunction(() => typeof state !== "undefined" && state.dbOk, null, { timeout: 15000 });
await p.waitForTimeout(500);
const cards = await p.$$eval('a.card', as => as.map(a => a.getAttribute('href')));
ok('Catalogue : les 9 nouvelles offres sont publiées', NEW.every(s => cards.includes('#activite-' + s)), cards.length + ' offres');
for (const s of NEW) {
  await p.goto(B + '#activite-' + s); await p.waitForSelector('#reqForm'); await p.waitForTimeout(200);
  const t = await p.textContent('main');
  const price = await p.textContent('.book p');
  ok('Fiche ' + s, t.length > 300, price.replace(/\s+/g,' ').trim());
}
// prix attendus
await p.goto(B + '#catalogue'); await p.waitForTimeout(300);
const prices = await p.$$eval('a.card', as => Object.fromEntries(as.map(a => [a.getAttribute('href').slice(10), a.querySelector('.price').textContent.replace(/\s+/g,' ').trim()])));
const exp = { 'rome-classique': '42', 'audience-papale': '34', 'vatican-bus-24h': '62', 'rome-pass-72h': '85', 'orvieto-assise': '169', 'sejour-rome-pompei': '329', 'sejour-rome-assise': '329', 'transfert-prive': '84' };
ok('Prix affichés = base (≈5 % sous Green Line)', Object.entries(exp).every(([k,v]) => prices[k].includes(v)), JSON.stringify(Object.fromEntries(NEW.map(k=>[k,prices[k]]))));
ok('Transfert : prix « par véhicule »', /vehicle/.test(prices['transfert-prive']));
ok('Thermes : « Price on request »', /Price on request/.test(prices['thermes-diocletien-bus']));
// catégories
await p.goto(B + '#accueil'); await p.waitForTimeout(400);
const tiles = await p.$$eval('.tile .lbl', x => x.map(e => e.textContent.trim()));
ok('Accueil : nouvelle catégorie « Private transfers »', tiles.some(x => /Private transfers/.test(x)), tiles.join(' | '));
// langues
for (const [lang, word] of [['fr','Prix sur demande'],['it','Prezzo su richiesta'],['ja','料金はお問い合わせください'],['de','Fahrzeug']]) {
  await p.evaluate(l => setLang(l), lang); await p.goto(B + '#catalogue'); await p.waitForTimeout(300);
  ok('Langue ' + lang, (await p.textContent('main')).includes(word));
}
await p.evaluate(() => setLang('en'));
await p.goto(B + '#credits'); await p.waitForTimeout(300);
const cr = await p.textContent('main');
ok('Crédits photos : nouveaux auteurs listés', ['Julian Lupyan','Berthold Werner','Gerdy Ling','NikonZ7II'].every(a => cr.includes(a)));
// mobile
const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await m.goto(B + '#activite-orvieto-assise'); await m.waitForSelector('#reqForm');
ok('Mobile 390 px : pas de défilement horizontal', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
await p.goto(B + '#activite-rome-classique'); await p.waitForTimeout(2500);
ok('Photos Wikimedia chargées', badImg.length === 0, badImg.slice(0,3).join(' | '));
await p.screenshot({ path: 'offre.png' });
await p.goto(B + '#catalogue'); await p.waitForTimeout(2500); await p.screenshot({ path: 'catalogue.png', fullPage: false });
ok('Console sans erreur', errs.length === 0, errs.slice(0,3).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
