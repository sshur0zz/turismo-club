// Test de bout en bout (Playwright) — compte « tc-test-admin@example.com » et données marquées TEST, supprimées après le test.
// Lancer : TEST_PW=… node tests/e2e/<fichier>.mjs  (site servi par : python3 -m http.server -d site 8765). Jamais sur un compte réel.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const B = process.env.B || 'http://127.0.0.1:8765/';
const PW = process.env.TEST_PW;
const CSP = readFileSync(new URL('../../site/_headers', import.meta.url), 'utf8').match(/Content-Security-Policy: (.+)/)[1];
const res = [], errs = [];
const ok = (n, p, i = '') => { res.push(p); console.log((p ? '✅ ' : '❌ ') + n + (i ? ' — ' + i : '')); };
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.route(/127\.0\.0\.1:8765\/pro\//, async r => { const f = await r.fetch(); r.fulfill({ response: f, headers: { ...f.headers(), 'content-security-policy': CSP } }); });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(B + 'pro/'); await p.waitForSelector('#loginForm');
await p.fill('#lg-email', 'tc-test-admin@example.com'); await p.fill('#lg-pass', PW); await p.click('#loginForm button[type=submit]'); await p.waitForSelector('.shell');
ok('Menu : entrée « Clients »', !!(await p.$('.nav a[href="#/clients"]')));
// --- Clients ---
await p.goto(B + 'pro/#/clients'); await p.waitForSelector('#clList');
ok('Liste des clients', (await p.textContent('#clList')).includes('TEST Marco'));
ok('Téléphone normalisé (+39…)', (await p.textContent('#clList')).includes('+390612345678'));
ok('Doublon détecté (même téléphone, écrit différemment)', !!(await p.$('[data-merge]')) && (await p.textContent('#dup-h')).length > 0);
await p.fill('#cq', 'tc-test-b'); ok('Recherche', (await p.$$('#clList tbody tr')).length === 1); await p.fill('#cq', '');
p.once('dialog', d => d.accept()); await p.click('[data-merge]');
await p.waitForFunction(() => !document.querySelector('[data-merge]'), null, { timeout: 10000 }).catch(() => {});
ok('Fusion : le doublon disparaît', !(await p.$('[data-merge]')));
const href = await p.getAttribute('#clList tbody tr th a[href^="#/clients/"]', 'href');
await p.goto(B + 'pro/' + href); await p.waitForSelector('#clForm');
ok('Fiche : les 2 demandes rattachées au même client', (await p.textContent('#cr-h')).includes('2'), await p.textContent('#cr-h'));
ok('Fiche : historique de fusion', !!(await p.$('#cm-h')));
// modification partielle (seul le champ changé part vers la base)
const sent = []; p.on('request', r => { if (r.method() === 'PATCH' && /customers/.test(r.url())) sent.push(r.postData()); });
await p.fill('#c-notes', 'TEST préfère les visites le matin');
await Promise.all([p.waitForResponse(r => r.request().method() === 'PATCH' && /customers/.test(r.url())), p.click('#clForm button[type=submit]')]);
await p.waitForSelector('#clForm');
ok('Enregistrement : seul le champ modifié est envoyé (patch)', sent.length === 1 && JSON.stringify(Object.keys(JSON.parse(sent[0]))) === '["notes"]', sent[0]);
await p.click('#clForm button[type=submit]'); await p.waitForTimeout(500);
ok('Rien envoyé si rien n\'a changé', sent.length === 1);
// --- Kanban ---
await p.goto(B + 'pro/#/demandes'); await p.waitForSelector('#board');
const card = await p.$('.qcard:has-text("TEST Marco")');
ok('Cartes déplaçables', (await card.getAttribute('draggable')) === 'true');
const id = await card.getAttribute('data-id');
await p.dragAndDrop(`.qcard[data-id="${id}"]`, '.col[data-col="sent"]');
await p.waitForFunction(i => document.querySelector(`.col[data-col="sent"] .qcard[data-id="${i}"]`), id, { timeout: 8000 }).catch(() => {});
ok('Glisser-déposer vers « Devis envoyé »', !!(await p.$(`.col[data-col="sent"] .qcard[data-id="${id}"]`)));
// Annulée : motif obligatoire
await p.selectOption(`#st-${id}`, 'lost'); await p.waitForSelector('dialog.dlg[open]');
ok('Passer en « Annulée » ouvre le motif', true);
await p.click('dialog.dlg button[value="ok"]'); await p.waitForTimeout(300);
ok('Motif vide refusé (la fenêtre reste ouverte)', !!(await p.$('dialog.dlg[open]')));
await p.click('dialog.dlg button[value="cancel"]'); await p.waitForTimeout(800);
ok('Renoncer : la demande ne change pas', !(await p.$(`.col[data-col="lost"] .qcard[data-id="${id}"]`)) && (await p.inputValue(`#st-${id}`)) === 'sent');
await p.selectOption(`#st-${id}`, 'lost'); await p.waitForSelector('dialog.dlg[open]');
await p.fill('#lr-txt', 'TEST budget trop serré'); await p.click('dialog.dlg button[value="ok"]');
await p.waitForSelector(`.col[data-col="lost"] .qcard[data-id="${id}"]`, { timeout: 8000 });
ok('Motif enregistré et affiché sur la carte', (await p.textContent(`.qcard[data-id="${id}"]`)).includes('budget trop serré'));
const db = await p.evaluate(async () => { const r = await TC.api.sb.from('quote_requests').update({ status: 'lost', lost_reason: null }).like('first_name', 'TEST%').neq('status', 'lost').select('id'); return r.error ? r.error.message : 'accepté'; });
ok('Base : « Annulée » sans motif refusé même en contournant l\'écran', /quote_lost_needs_reason|violates/.test(db), db);
await p.goto(B + 'pro/#/dossier/' + id); await p.waitForSelector('#d-step');
ok('Fiche demande : motif affiché + lien vers la fiche client', (await p.textContent('main')).includes('budget trop serré') && !!(await p.$('a[href^="#/clients/"]')));
const hist = await p.textContent('main'); ok('Historique : motif journalisé', hist.includes('Motif d'));
// Icônes
const ic = await p.evaluate(() => ({ n: Object.keys(TC.icons.ALL).length, hotel: TC.icons.forScope('hotel').length, veh: TC.icons.forScope('vehicle').length, svg: TC.icons.svg('wifi').startsWith('<svg') }));
ok('Bibliothèque d\'icônes chargée', ic.n >= 35 && ic.hotel > 10 && ic.veh > 8 && ic.svg, JSON.stringify(ic));
// italien + mobile
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'it')); await p.goto(B + 'pro/#/clients'); await p.reload(); await p.waitForSelector('#clList');
ok('Italien', (await p.textContent('main h1')).includes('Clienti'));
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
ok('390 px sans défilement horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'fr'));
ok('Aucune erreur JS ni CSP', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
