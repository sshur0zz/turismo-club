import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Le lien reçu par e-mail arrive ici : on échange le code contre une session (cookie).
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('suite') ?? '/compte';
	const safeNext = /^\/(?!\/)/.test(next) ? next : '/compte';
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, safeNext);
	}
	redirect(303, '/connexion?erreur=1');
};
