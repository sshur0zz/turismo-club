import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { createServerClient } from '@supabase/ssr';
import { getTextDirection, localizeHref } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '#lib/config.js';

// 1. Langue : détecte la langue (préfixe d'URL /it/, /fr/…) et l'écrit dans <html lang>.
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		)
	);

// 2. Supabase : un client par requête, qui lit/écrit la session dans les cookies.
const handleSupabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (list) =>
				list.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				)
		}
	});

	// getUser() revérifie la session auprès de Supabase (plus sûr que de lire le cookie seul).
	event.locals.getAccount = async () => {
		const {
			data: { user }
		} = await event.locals.supabase.auth.getUser();
		if (!user) return { user: null, staffRole: null };
		const { data: staff } = await event.locals.supabase
			.from('staff')
			.select('role')
			.eq('id', user.id)
			.eq('is_active', true)
			.maybeSingle();
		return { user, staffRole: staff?.role ?? null };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

// 3. Garde : /compte demande d'être connecté, /admin demande d'être un employé actif.
const handleGuard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname.replace(/^\/(it|fr|es|de|pt|nl|zh|ja|ko)(?=\/|$)/, '') || '/';
	const needsLogin = path.startsWith('/compte') || path.startsWith('/admin');
	if (needsLogin) {
		const account = await event.locals.getAccount();
		if (!account.user) {
			redirect(303, localizeHref(`/connexion?suite=${encodeURIComponent(event.url.pathname)}`));
		}
		if (path.startsWith('/admin') && !account.staffRole) {
			redirect(303, localizeHref('/compte'));
		}
	}
	const response = await resolve(event);
	if (path.startsWith('/admin') || path.startsWith('/compte')) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
		response.headers.set('Cache-Control', 'no-store');
	}
	return response;
};

export const handle: Handle = sequence(handleParaglide, handleSupabase, handleGuard);
