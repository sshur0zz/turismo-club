// Turismo Club — Edge Function « ajouter-membre » : un administrateur ajoute un membre de l'équipe.
// La clé de service n'existe QUE dans l'environnement de la fonction (fournie par Supabase) : jamais dans le navigateur ni dans Git.
// Contrôles serveur : appelant connecté, administrateur actif, double authentification validée s'il l'a activée.
// Le compte est créé avec un mot de passe provisoire affiché une seule fois à l'administrateur ; le membre le change à la première connexion.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ROLES = ['admin', 'conseiller', 'guide'];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function tempPassword(): string {
  const al = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(b, x => al[x % al.length]).join('').replace(/(.{6})(?=.)/g, '$1-');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json(500, { error: 'configuration' });                  // refus explicite si la configuration manque
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await admin.auth.getUser(token);
  if (!u || !u.user) return json(401, { error: 'auth' });
  const { data: me } = await admin.from('staff').select('role,is_active').eq('id', u.user.id).maybeSingle();
  if (!me || !me.is_active || me.role !== 'admin') return json(404, { error: 'introuvable' });   // hors portée = 404
  // double authentification : si l'admin l'a activée, la session doit être au niveau aal2
  const { data: f } = await admin.auth.admin.mfa.listFactors({ userId: u.user.id });
  const aal = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal;
  if ((f?.factors || []).some((x: { status: string }) => x.status === 'verified') && aal !== 'aal2') return json(404, { error: 'introuvable' });

  let body: { email?: string; full_name?: string; role?: string; guide_id?: number | null };
  try { body = await req.json(); } catch { return json(400, { error: 'json' }); }
  const email = String(body.email || '').trim().toLowerCase(), name = String(body.full_name || '').trim(), role = String(body.role || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json(400, { error: 'email' });
  if (!name || name.length > 200) return json(400, { error: 'name' });
  if (!ROLES.includes(role)) return json(400, { error: 'role' });
  const guideId = role === 'guide' && body.guide_id ? Number(body.guide_id) : null;

  const password = tempPassword();
  const { data: created, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } });
  if (e1 || !created?.user) return json(409, { error: /already|exists|registered/i.test(e1?.message || '') ? 'exists' : 'create' });
  const { error: e2 } = await admin.from('staff').insert({ id: created.user.id, email, full_name: name, role, guide_id: guideId });
  if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json(400, { error: 'staff' }); }   // rien d'à moitié créé
  await admin.from('audit_log').insert({ table_name: 'staff', row_id: created.user.id, action: 'INVITE', staff_id: u.user.id, new_data: { email, role } });
  return json(200, { id: created.user.id, email, password });
});
