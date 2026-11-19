import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

// Seuls des chemins internes sont acceptés comme destination après connexion.
const safePath = (p: string | null) => (p && /^\/(?!\/)/.test(p) ? p : '/compte');

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const next = safePath(String(form.get('suite') ?? ''));
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { email, invalid: true });
		}
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback?suite=${encodeURIComponent(next)}`,
				shouldCreateUser: true // un client peut créer son compte simplement en se connectant
			}
		});
		if (error) return fail(500, { email, failed: true });
		return { sent: true, email };
	}
};
