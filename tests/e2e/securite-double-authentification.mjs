// Test de bout en bout (Playwright) — compte « tc-test-admin@example.com » et données marquées TEST, supprimées après le test.
// Lancer : TEST_PW=… node tests/e2e/<fichier>.mjs  (site servi par : python3 -m http.server -d site 8765). Jamais sur un compte réel.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
const B = 'http://127.0.0.1:8765/';
const PW = process.env.TEST_PW;
const H = readFileSync(new URL('../../site/_headers', import.meta.url), 'utf8');
const CSP = H.match(/Content-Security-Policy: (.+)/)[1];
const totp = (secret, off = 0) => { // RFC 6238 : simule l'application du téléphone
  const al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const c of secret.replace(/=+$/, '').toUpperCase()) bits += al.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + off));
  const h = createHmac('sha1', key).update(ctr).digest(); const o = h[19] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
};
const res = [], errs = [], csp = [];
const ok = (n, p, i = '') => { res.push(p); console.log((p ? '✅ ' : '❌ ') + n + (i ? ' — ' + i : '')); };
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/127\.0\.0\.1:8765\/pro\//, async r => { const f = await r.fetch(); r.fulfill({ response: f, headers: { ...f.headers(), 'content-security-policy': CSP } }); });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { const x = m.text(); if (/Content Security Policy|Refused to/i.test(x)) csp.push(x); else if (m.type() === 'error' && !/Failed to load resource/.test(x)) errs.push(x); });
async function login() { await p.goto(B + 'pro/'); await p.waitForSelector('#loginForm'); await p.fill('#lg-email', 'tc-test-admin@example.com'); await p.fill('#lg-pass', PW); await p.click('#loginForm button[type=submit]'); }
await login(); await p.waitForSelector('.shell');
const before = await p.evaluate(async () => (await TC.api.sb.from('quote_requests').select('id', { count: 'exact', head: true })).count);
ok('Sans double authentification : rien ne change (données lisibles)', before > 0, String(before));
ok('Connexion avec la protection CSP active', true);
ok('Direct (temps réel) autorisé par la CSP', await p.waitForFunction(() => TC.api.sb.getChannels().some(c => c.state === 'joined'), null, { timeout: 15000 }).then(() => true).catch(() => false));
for (const r of ['tableau', 'demandes', 'emails', 'planning', 'guides', 'nouvelle']) { await p.goto(B + 'pro/#/' + r); await p.waitForTimeout(1200); }
ok('Toutes les pages s\'ouvrent sans blocage CSP', csp.length === 0, csp.slice(0, 2).join(' | '));
// Activer la double authentification
await p.goto(B + 'pro/#/motdepasse'); await p.waitForSelector('#mfa-start'); await p.click('#mfa-start');
await p.waitForSelector('#mfaEnroll'); const secret = (await p.textContent('#mfa-zone code')).trim();
ok('QR code affiché', await p.$eval('#mfa-zone img', i => i.complete && i.naturalWidth > 0));
await p.fill('#mfa-new', '000000'); await p.click('#mfaEnroll button'); await p.waitForTimeout(800);
ok('Mauvais code refusé', (await p.textContent('#mfa-new-err')).length > 0);
await p.fill('#mfa-new', totp(secret)); await p.click('#mfaEnroll button');
ok('Activation avec le bon code', await p.waitForSelector('#mfa-off', { timeout: 10000 }).then(() => true).catch(() => false));
// Nouvelle connexion : le code est exigé
await p.click('#logout'); await p.waitForSelector('#loginForm'); await login(); await p.waitForSelector('#mfaForm');
ok('Après le mot de passe, le code est demandé (espace fermé)', !(await p.$('.shell')));
const tok = await p.evaluate(async () => (await TC.api.sb.auth.getSession()).data.session.access_token);
const aal = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).aal;
ok('Session encore au niveau 1 avant le code', aal === 'aal1', aal);
const cnt = async () => p.evaluate(async () => { const r = await TC.api.sb.from('quote_requests').select('id', { count: 'exact', head: true }); return r.count; });
ok('Base : aucune donnée lisible avant le code (même en contournant l\'écran)', (await cnt()) === 0, String(await cnt()));
await p.fill('#mfa-code', '123456'); await p.click('#mfaForm button[type=submit]'); await p.waitForTimeout(800);
ok('Mauvais code refusé à la connexion', (await p.textContent('#mfa-err')).length > 0 && !(await p.$('.shell')));
await p.waitForTimeout(31000 - (Date.now() % 30000) + 500); // nouveau code (un code déjà utilisé est refusé)
await p.fill('#mfa-code', totp(secret)); await p.click('#mfaForm button[type=submit]');
ok('Bon code → espace équipe ouvert', await p.waitForSelector('.shell', { timeout: 10000 }).then(() => true).catch(() => false));
ok('Base : données lisibles après le code', (await cnt()) > 0, String(await cnt()));
// Désactiver
await p.goto(B + 'pro/#/motdepasse'); await p.waitForSelector('#mfa-off'); p.once('dialog', d => d.accept()); await p.click('#mfa-off');
ok('Désactivation', await p.waitForSelector('#mfa-start', { timeout: 10000 }).then(() => true).catch(() => false));
// Italien + mobile
await p.evaluate(() => { localStorage.setItem('tc-pro-lang', 'it'); }); await p.reload(); await p.waitForSelector('#mfa-h');
ok('Italien', (await p.textContent('#mfa-h')).includes('due fattori'));
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
ok('390 px sans défilement horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
ok('Aucune erreur JS', !errs.length && !csp.length, [...errs, ...csp].slice(0, 2).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`); await b.close();
