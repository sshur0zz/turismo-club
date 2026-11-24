// Test de bout en bout (Playwright) — compte « tc-test-admin@example.com » et données marquées TEST, supprimées après le test.
// Lancer : TEST_PW=… node tests/e2e/<fichier>.mjs  (site servi par : python3 -m http.server -d site 8765). Jamais sur un compte réel.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const B = 'http://127.0.0.1:8765/';
const PW = process.env.TEST_PW;
const CSP = readFileSync(new URL('../../site/_headers', import.meta.url), 'utf8').match(/Content-Security-Policy: (.+)/)[1];
const res = [], errs = [];
const ok = (n, p, i = '') => { res.push(p); console.log((p ? '✅ ' : '❌ ') + n + (i ? ' — ' + i : '')); };
const b = await chromium.launch({ channel: 'chromium' });
async function page() { const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route(/127\.0\.0\.1:8765\/pro\//, async r => { const f = await r.fetch(); r.fulfill({ response: f, headers: { ...f.headers(), 'content-security-policy': CSP } }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(p.url().split('#')[1] + ' : ' + e.message + ' @ ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.on('dialog', d => d.accept()); return p; }
async function login(p, email, pw) { await p.goto(B + 'pro/'); await p.waitForSelector('#loginForm'); await p.fill('#lg-email', email); await p.fill('#lg-pass', pw); await p.click('#loginForm button[type=submit]'); await p.waitForSelector('.shell'); }
const p = await page();
await login(p, 'tc-test-admin@example.com', PW);
const grps = await p.$$eval('.navgrp', x => x.map(e => e.textContent));
ok('Menu par groupes : Vente, Production, Finance, Pilotage', grps.join('|') === 'Vente|Production|Finance|Pilotage et compte', grps.join('|'));
ok('Menu « Équipe » visible pour l\'admin', !!(await p.$('.nav a[href="#/equipe"]')));
// Recherche
await p.keyboard.press('Control+k'); await p.waitForSelector('dialog.gs[open] #gsInput');
ok('Ctrl+K ouvre la recherche (raccourcis « Créer » affichés)', (await p.textContent('#gsList')).includes('Créer'));
await p.keyboard.type('Recherche'); await p.waitForSelector('#gsList [role=option]:has-text("TEST Giorgio")', { timeout: 10000 });
const txt = await p.textContent('#gsList');
ok('Résultats groupés : demande + client trouvés', txt.includes('Demandes') && txt.includes('Clients') && txt.includes('TC-2611-056'), txt.replace(/\s+/g, ' ').slice(0, 140));
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter');
await p.waitForSelector('#h-items'); ok('Entrée ouvre la fiche (navigation 100 % clavier)', (await p.textContent('.page-head')).includes('TEST Giorgio'));
await p.click('#gsBtn'); await p.waitForSelector('dialog.gs[open]'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('Bouton du menu + Échap pour fermer', !(await p.$('dialog.gs[open]')));
// Équipe : ajouter un membre
await p.goto(B + 'pro/#/equipe'); await p.waitForSelector('#eqNew');
await p.fill('#eq-name', 'TEST Membre Conseiller'); await p.fill('#eq-email', 'tc-test-membre@example.com'); await p.selectOption('#eq-role', 'conseiller'); await p.click('#eqNew button[type=submit]');
await p.waitForSelector('#eqPw', { timeout: 20000 }); const temp = (await p.textContent('#eqPw')).trim();
ok('Membre créé, mot de passe provisoire affiché une fois', temp.length >= 18, temp.replace(/./g, '•'));
await p.fill('#eq-name', 'TEST Doublon'); await p.fill('#eq-email', 'tc-test-membre@example.com'); await p.click('#eqNew button[type=submit]'); await p.waitForTimeout(3000);
ok('Adresse déjà utilisée refusée', /existe déjà/.test(await p.textContent('#eq-err')), await p.textContent('#eq-err'));
// Première connexion du membre
const m = await page(); await login(m, 'tc-test-membre@example.com', temp);
await m.waitForSelector('#pwForm'); ok('1re connexion : obligé de choisir son mot de passe', (await m.textContent('main')).includes('Première connexion'));
ok('Conseiller : pas de menu « Équipe »', !(await m.$('.nav a[href="#/equipe"]')));
const notAdmin = await m.evaluate(async () => { const r = await TC.api.sb.functions.invoke('ajouter-membre', { body: { email: 'x@example.com', full_name: 'x', role: 'admin' } }); return r.error ? r.error.context.status : 'accepté'; });
ok('Base : un conseiller ne peut pas ajouter de membre (404)', notAdmin === 404, String(notAdmin));
const newPw = 'TEST-' + PW + '-x';
await m.fill('#pw1', newPw); await m.fill('#pw2', newPw); await m.click('#pwForm button[type=submit]'); await m.waitForTimeout(2500);
const flag = await m.evaluate(async () => (await TC.api.sb.auth.getUser()).data.user.user_metadata.must_change_password);
ok('Mot de passe choisi → obligation levée', flag === false, String(flag));
// Désactivation
await p.goto(B + 'pro/#/equipe'); await p.waitForSelector('#eqNew'); await p.click('tr:has-text("TEST Membre Conseiller") [data-eqactive]'); await p.waitForTimeout(1500);
const m2 = await page(); await m2.goto(B + 'pro/'); await m2.waitForSelector('#loginForm'); await m2.fill('#lg-email', 'tc-test-membre@example.com'); await m2.fill('#lg-pass', newPw); await m2.click('#loginForm button[type=submit]');
await m2.waitForSelector('.login h1:has-text("Accès non autorisé")', { timeout: 15000 }).catch(() => {}); ok('Membre désactivé : « Accès non autorisé »', (await m2.textContent('.login h1')).includes('Accès non autorisé'));
// Italien + mobile
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'it')); await p.reload(); await p.waitForSelector('.navgrp');
ok('Italien : groupes du menu', (await p.textContent('.nav')).includes('Vendita'));
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
ok('390 px sans défilement horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'fr'));
ok('Aucune erreur JS ni CSP', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
