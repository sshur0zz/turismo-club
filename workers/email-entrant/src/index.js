// Turismo Club — réception des e-mails (Cloudflare Email Routing → ce Worker → espace équipe)
// Gmail transfère les e-mails des clients à demandes@in.turismoclub.it ; on lit l'e-mail d'origine
// (expéditeur, objet, texte) et on le dépose dans Supabase. L'original reste toujours dans Gmail.
import PostalMime from 'postal-mime';

const MAX_TEXT = 100000;

// Texte lisible à partir du HTML, si l'e-mail n'a pas de version texte
function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

export default {
  async email(message, env) {
    const parsed = await PostalMime.parse(message.raw);
    const from = parsed.from || {};
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
