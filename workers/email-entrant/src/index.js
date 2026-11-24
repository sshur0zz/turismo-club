// Turismo Club — Worker e-mails
// 1) email() : réception. Gmail transfère les e-mails des clients à demandes@in.turismoclub.it ;
//    on lit l'e-mail d'origine (expéditeur, objet, texte) et on le dépose dans Supabase (rubrique « E-mails »).
// 2) fetch() POST /notify : notification. La base appelle cette adresse quand une demande arrive du site ;
//    on envoie un e-mail à l'agence (Reply-To = le client, pour répondre directement depuis Gmail).
import PostalMime from 'postal-mime';
import { EmailMessage } from 'cloudflare:email';

const MAX_TEXT = 100000;
const NOTIFY_FROM = 'notifications@in.turismoclub.it';

// Texte lisible à partir du HTML, si l'e-mail n'a pas de version texte
function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- Construction d'un e-mail texte (UTF-8) ----------
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const encWord = s => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const oneLine = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
const validEmail = s => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(s || ''));
function buildMime({ from, fromName, to, replyTo, subject, text }) {
  const body = b64(text).replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${encWord(fromName)} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@in.turismoclub.it>`,
    'MIME-Version: 1.0',
    'X-Turismo-Notification: 1',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body
  ].filter(l => l !== null).join('\r\n');
}

// Comparaison sans fuite de temps
function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const LANGS = { en: 'anglais', it: 'italien', fr: 'français', es: 'espagnol', de: 'allemand', pt: 'portugais', nl: 'néerlandais', zh: 'chinois', ja: 'japonais', ko: 'coréen' };

async function notify(request, env) {
  if (!sameSecret(request.headers.get('x-notify-secret') || '', env.NOTIFY_SECRET || '')) return new Response('forbidden', { status: 403 });
  const d = await request.json().catch(() => null);
  if (!d || !d.reference) return new Response('bad request', { status: 400 });
  const custom = !d.offer_title;
  const offer = custom ? 'Voyage sur-mesure' : oneLine(d.offer_title);
  const name = oneLine([d.first_name, d.last_name].filter(Boolean).join(' ')) || 'Client';
  const lines = [
    `Nouvelle demande reçue sur le site : ${d.reference}`,
    '',
    `Client : ${name}`,
    `E-mail : ${oneLine(d.email) || '—'}`,
    `Téléphone / WhatsApp : ${oneLine(d.phone) || '—'}`,
    `Offre : ${offer}`,
    `Date : ${oneLine(d.date_from) || 'à définir'}${d.date_to ? ' → ' + oneLine(d.date_to) : ''}`,
    `Personnes : ${d.travelers || '—'}`,
    `Langue préférée : ${LANGS[d.preferred_language] || d.preferred_language || '—'} (site consulté en ${LANGS[d.language] || d.language || '—'})`,
    '',
    'Message :',
    String(d.message || '—').slice(0, 3000),
    '',
    `Ouvrir dans l'espace équipe : https://turismoclub.it/pro/#/dossier/${Number(d.id)}`,
    '',
    validEmail(d.email) ? 'Répondre à cet e-mail écrit directement au client.' : 'Le client n’a pas laissé d’e-mail valide : contactez-le par téléphone ou WhatsApp.'
  ];
  const raw = buildMime({
    from: NOTIFY_FROM, fromName: 'Turismo Club — Site web', to: env.NOTIFY_TO,
    replyTo: validEmail(d.email) ? oneLine(d.email) : null,
    subject: `Nouvelle demande ${d.reference} · ${offer} · ${name}`.slice(0, 200),
    text: lines.join('\n')
  });
  await env.NOTIFY.send(new EmailMessage(NOTIFY_FROM, env.NOTIFY_TO, raw));
  return new Response('ok');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/notify') {
      try { return await notify(request, env); }
      catch (e) { console.error('Notification impossible', e && e.message); return new Response('error', { status: 500 }); }
    }
    return new Response('Not found', { status: 404 });
  },

  async email(message, env) {
    // Nos propres notifications reviennent par le transfert Gmail : on ne les dépose pas dans la rubrique E-mails.
    if (message.headers.get('x-turismo-notification') || (message.headers.get('from') || '').includes(NOTIFY_FROM)) return;
    const parsed = await PostalMime.parse(message.raw);
    const from = parsed.from || {};
    if ((from.address || '').toLowerCase() === NOTIFY_FROM) return;
    const body = (parsed.text && parsed.text.trim()) || htmlToText(parsed.html);
    const payload = {
      p_secret: env.EMAIL_INGEST_SECRET,
      p_message_id: parsed.messageId || message.headers.get('message-id') || null,
      p_from_name: from.name || null,
      p_from_email: (from.address || message.from || '').toLowerCase(),
      p_to: message.to,
      p_subject: parsed.subject || '',
      p_body: body.slice(0, MAX_TEXT),
      p_attachments: (parsed.attachments || []).length
    };
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ingest_email`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      // L'e-mail d'origine reste dans Gmail : rien n'est perdu. On le signale dans les journaux du Worker.
      console.error('Dépôt impossible', r.status, (await r.text()).slice(0, 300));
    }
  }
};
