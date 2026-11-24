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
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.route(/127\.0\.0\.1:8765\/pro\//, async r => { const f = await r.fetch(); r.fulfill({ response: f, headers: { ...f.headers(), 'content-security-policy': CSP } }); });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
p.on('dialog', d => d.accept());
const jpeg = await p.screenshot({ type: 'jpeg', quality: 60, clip: { x: 0, y: 0, width: 320, height: 240 } });
await p.goto(B + 'pro/'); await p.waitForSelector('#loginForm');
await p.fill('#lg-email', 'tc-test-admin@example.com'); await p.fill('#lg-pass', PW); await p.click('#loginForm button[type=submit]'); await p.waitForSelector('.shell');
ok('Menu : Flotte + Locations', !!(await p.$('.nav a[href="#/flotte"]')) && !!(await p.$('.nav a[href="#/locations"]')));
// Réglages
await p.goto(B + 'pro/#/flotte/reglages'); await p.waitForSelector('#sLoc');
await p.fill('#sl-name', 'TEST Agence Termini'); await p.click('#sLoc button'); await p.waitForSelector('text=TEST Agence Termini');
await p.fill('#sl-name', 'TEST Aéroport FCO'); await p.click('#sLoc button'); await p.waitForSelector('#sDist');
await p.selectOption('#sd-from', { label: 'TEST Agence Termini' }); await p.selectOption('#sd-to', { label: 'TEST Aéroport FCO' }); await p.fill('#sd-km', '32'); await p.click('#sDist button'); await p.waitForSelector('text=32 km');
await p.fill('#se-name', 'TEST Siège bébé'); await p.fill('#se-price', '6'); await p.selectOption('#se-per', 'day'); await p.selectOption('#se-icon', 'baby_cot'); await p.click('#sExtra button'); await p.waitForSelector('text=TEST Siège bébé');
ok('Réglages : 2 lieux, distance dans les deux sens, option payante', (await p.textContent('main')).includes('32 km'));
// Véhicule
await p.goto(B + 'pro/#/flotte'); await p.waitForSelector('#vNew');
await p.fill('#vn-plate', 'tt 001 st'); await p.fill('#vn-make', 'Fiat'); await p.fill('#vn-model', 'TEST Panda fictive'); await p.fill('#vn-km', '15000'); await p.click('#vNew button');
await p.waitForSelector('#vInfo');
await p.selectOption('#vi-home', { label: 'TEST Agence Termini' }); await p.fill('#vi-day', '45'); await p.fill('#vi-inckm', '150'); await p.fill('#vi-xkm', '0,30'); await p.fill('#vi-dep', '300'); await p.fill('#vi-age', '21'); await p.fill('#vi-years', '1');
await p.check('input[name="vi-feat"][value="air_conditioning"]'); await p.check('input[name="vi-feat"][value="bluetooth"]'); await p.click('#vInfo button[type=submit]');
await p.waitForSelector('.page-head .ichip');
ok('Véhicule créé (immatriculation en majuscules), prix et équipements', (await p.textContent('.page-head')).includes('TT 001 ST'));
await p.fill('#vo-km', '14000'); await p.click('#vOdo button'); await p.waitForTimeout(1200);
ok('Kilométrage en baisse refusé', /diminuer/.test(await p.textContent('#vo-err')), await p.textContent('#vo-err'));
await p.selectOption('#vd-kind', 'insurance'); await p.fill('#vd-exp', '2026-12-05'); await p.click('#vDoc button'); await p.waitForSelector('.late');
ok('Document à échéance proche signalé', true);
// Contrat
await p.goto(B + 'pro/#/locations/nouveau'); await p.waitForSelector('#rlNew');
await p.selectOption('#rn-veh', { label: 'TT 001 ST · Fiat TEST Panda fictive' });
await p.fill('#rn-cf', 'TEST Paolo'); await p.fill('#rn-cl', 'Rossi'); await p.fill('#rn-ce', 'tc-test-rent@example.com');
await p.fill('#rn-sd', '2026-12-10'); await p.fill('#rn-st', '09:00'); await p.fill('#rn-ed', '2026-12-12'); await p.fill('#rn-et', '10:00');
await p.selectOption('#rn-pick', { label: 'TEST Agence Termini' }); await p.selectOption('#rn-ret', { label: 'TEST Aéroport FCO' }); await p.check('input[name="rn-x"]');
await p.fill('#rn-dn', 'TEST Paolo Rossi'); await p.fill('#rn-db', '1985-03-02'); await p.fill('#rn-ln', 'TEST-RM123'); await p.fill('#rn-li', '2005-06-01'); await p.fill('#rn-le', '2026-12-11');
await p.click('#rlNew button[type=submit]'); await p.waitForTimeout(1500);
ok('Permis expirant avant le retour : refusé', /Permis expiré/.test(await p.textContent('#rn-err')), await p.textContent('#rn-err'));
await p.selectOption('#rn-cust', ''); await p.fill('#rn-le', '2031-01-01'); await p.click('#rlNew button[type=submit]');
await p.waitForSelector('#rt-h');
const tot = await p.textContent('#rt-h ~ table');
ok('Contrat : 3 jours × 45 € + option 6 € × 3 = 153 € calculés par la base', /153,00/.test(tot), tot.replace(/\s+/g, ' '));
const cid = location => location; const url = p.url(); const id = url.split('/').pop();
// Chevauchement
await p.goto(B + 'pro/#/locations/nouveau'); await p.waitForSelector('#rlNew');
await p.selectOption('#rn-veh', { label: 'TT 001 ST · Fiat TEST Panda fictive' }); await p.selectOption('#rn-cust', { label: 'TEST Paolo Rossi · tc-test-rent@example.com' });
await p.fill('#rn-sd', '2026-12-11'); await p.fill('#rn-ed', '2026-12-13'); await p.fill('#rn-dn', 'TEST X'); await p.fill('#rn-db', '1985-03-02'); await p.fill('#rn-ln', 'TEST-2'); await p.fill('#rn-li', '2005-06-01'); await p.fill('#rn-le', '2031-01-01');
await p.click('#rlNew button[type=submit]'); await p.waitForTimeout(1500);
ok('Double réservation du véhicule refusée', /déjà loué/.test(await p.textContent('#rn-err')), await p.textContent('#rn-err'));
// État des lieux de départ
await p.goto(B + 'pro/#/locations/' + id); await p.waitForSelector('[data-ins-start="departure"]');
await p.click('[data-rl="active"]'); await p.waitForTimeout(1200);
ok('Remise des clés refusée sans permis vérifié', /original du permis/.test(await p.textContent('#rl-err')));
await p.click('[data-ins-start="departure"]'); await p.waitForSelector('#ik-departure');
await p.fill('#ik-departure', '15020'); await p.selectOption('#if-departure', '8'); await p.click('[data-ins-save="departure"]'); await p.waitForTimeout(1000);
for (const s of ['front', 'back', 'left', 'right', 'interior']) { await p.setInputFiles(`input[data-photo="departure:${s}"]`, { name: s + '.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await p.waitForSelector(`.ph:has(img[alt="${({front:'Avant',back:'Arrière',left:'Côté gauche',right:'Côté droit',interior:'Intérieur'})[s]}"])`, { timeout: 15000 }); }
ok('Photos compressées, envoyées et affichées (adresses signées, CSP)', (await p.$$('section[data-ins] .ph img')).length === 5);
const cv = await p.$('canvas[data-sig="departure"]'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
await p.mouse.move(bb.x + 30, bb.y + 100); await p.mouse.down(); await p.mouse.move(bb.x + 200, bb.y + 40, { steps: 8 }); await p.mouse.move(bb.x + 320, bb.y + 120, { steps: 8 }); await p.mouse.up();
await p.click('[data-ins-sign="departure"]'); await p.waitForTimeout(1500);
ok('Signature refusée tant qu\'une photo obligatoire manque (nommée)', /Tableau de bord/.test(await p.textContent('#ie-departure')), await p.textContent('#ie-departure'));
await p.setInputFiles('input[data-photo="departure:dashboard"]', { name: 'd.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await p.waitForSelector('.ph:has(img[alt="Tableau de bord"])');
await p.focus('rect[data-zone="rear_bumper"]'); await p.keyboard.press('Enter');
await p.waitForSelector('text=Zone choisie : Pare-chocs arrière');
ok('Zone du schéma choisie au clavier (Entrée)', true);
await p.selectOption('#dt-departure', 'scratch'); await p.fill('#dn-departure', 'TEST rayure existante'); await p.click('form[data-dmg-form="departure"] button[type=submit]');
await p.waitForSelector('text=TEST rayure existante');
const cv2 = await p.$('canvas[data-sig="departure"]'); await cv2.scrollIntoViewIfNeeded(); const b2 = await cv2.boundingBox();
await p.mouse.move(b2.x + 30, b2.y + 100); await p.mouse.down(); await p.mouse.move(b2.x + 250, b2.y + 50, { steps: 10 }); await p.mouse.up();
await p.click('[data-ins-sign="departure"]'); await p.waitForSelector('#ip-departure .badge.st-won', { timeout: 15000 });
ok('État des lieux de départ signé et figé (plus de champs modifiables)', !(await p.$('[data-ins-save="departure"]')) && !!(await p.$('img[alt="Zone de signature"]')));
await p.check('#rl-lic'); await p.waitForTimeout(1000); await p.click('[data-rl="active"]'); await p.waitForSelector('.page-head .rs-active');
ok('Permis vérifié → clés remises (location en cours)', true);
// Retour
await p.click('[data-ins-start="return"]'); await p.waitForSelector('#ik-return');
await p.fill('#ik-return', '15500'); await p.selectOption('#if-return', '6'); await p.click('[data-ins-save="return"]'); await p.waitForTimeout(800);
for (const s of ['front', 'back', 'left', 'right', 'interior', 'dashboard']) { const n = (await p.$$('section[aria-labelledby="ip-return"] .ph img')).length; await p.setInputFiles(`input[data-photo="return:${s}"]`, { name: s + '.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await p.waitForFunction(k => document.querySelectorAll('section[aria-labelledby="ip-return"] .ph img').length > k, n, { timeout: 15000 }); }
await p.click('rect[data-zone="left_front_door"]'); await p.waitForSelector('text=Zone choisie : Porte avant gauche');
await p.selectOption('#dt-return', 'dent'); await p.click('form[data-dmg-form="return"] button[type=submit]'); await p.waitForSelector('text=nouveau');
const cv3 = await p.$('canvas[data-sig="return"]'); await cv3.scrollIntoViewIfNeeded(); const b3 = await cv3.boundingBox();
await p.mouse.move(b3.x + 40, b3.y + 90); await p.mouse.down(); await p.mouse.move(b3.x + 260, b3.y + 60, { steps: 10 }); await p.mouse.up();
await p.click('[data-ins-sign="return"]'); await p.waitForSelector('#cmp-h', { timeout: 20000 }).catch(async () => { console.log('ERREUR RETOUR :', await p.textContent('#ie-return').catch(() => '?')); });
const cmp = await p.textContent('section[aria-labelledby="cmp-h"]');
ok('Comparaison : 480 km, carburant 8/8 → 6/8, 1 nouveau dégât', /480 km/.test(cmp) && /8\/8 → 6\/8/.test(cmp) && /1 nouveau/.test(cmp), cmp.replace(/\s+/g, ' ').slice(0, 160));
ok('Schéma : nouveau dégât en rouge, ancien en orange', !!(await p.$('rect.z-new[data-zone="left_front_door"]')) && !!(await p.$('rect.z-old[data-zone="rear_bumper"]')));
await p.fill('#fe-fuel', '20'); await p.fill('#fe-dmg', '150'); await p.click('#feeForm button');
await p.waitForFunction(() => /332,00/.test(document.querySelector('#rt-h ~ table tfoot').textContent), null, { timeout: 8000 }).catch(() => {});
ok('Total : 153 + 30 km supp. × 0,30 € (9 €) + carburant 20 + dégâts 150 = 332 €', /332,00/.test(await p.textContent('#rt-h ~ table tfoot')), (await p.textContent('#rt-h ~ table')).replace(/\s+/g, ' '));
await p.click('[data-rl="returned"]'); await p.waitForSelector('.page-head .rs-returned');
ok('Location close', true);
await p.goto(B + 'pro/#/flotte'); await p.click('a:has-text("TT 001 ST")'); await p.waitForSelector('#vg-h');
const vs = await p.textContent('main');
ok('Fiche véhicule : km 15 500, historique location et dégâts par zone', /15[\s  ]?500 km/.test(vs) && vs.includes('Porte avant gauche') && vs.includes('Pare-chocs arrière'));
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'it')); await p.reload(); await p.waitForSelector('#vg-h');
ok('Italien', (await p.textContent('#vg-h')).includes('Danni'));
await p.setViewportSize({ width: 390, height: 844 }); await p.goto(B + 'pro/#/locations/' + id); await p.waitForSelector('#rt-h'); await p.waitForTimeout(400);
ok('390 px sans défilement horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, String(await p.evaluate(() => document.documentElement.scrollWidth)));
await p.evaluate(() => localStorage.setItem('tc-pro-lang', 'fr'));
ok('Aucune erreur JS ni CSP', !errs.length, errs.slice(0, 3).join(' | '));
console.log('CONTRAT', id); console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
