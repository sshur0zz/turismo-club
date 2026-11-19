import type { RequestHandler } from './$types';
import { legacyPage } from '#lib/legacy/index.js';
import { locales } from '#lib/paraglide/runtime.js';
import { m } from '#lib/paraglide/messages.js';

const labels = Object.fromEntries(
	locales.map((locale) => [
		locale,
		{
			login: m.nav_login({}, { locale }),
			account: m.nav_account({}, { locale }),
			admin: m.nav_admin({}, { locale })
		}
	])
);

// Accueil (/, /fr, /it…) : le site de référence, à l'identique.
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, staffRole } = await locals.getAccount();
	const prefix = url.pathname.split('/')[1];
	const lang = (locales as readonly string[]).includes(prefix) ? prefix : null;
	const html = legacyPage({
		account: user ? { email: user.email ?? '', staff: Boolean(staffRole) } : null,
		lang,
		labels
	});
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-cache' }
	});
};
