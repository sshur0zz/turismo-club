import type { PageServerLoad } from './$types';

// Phase 1 : preuve que le site lit bien la base. Les vraies fiches arrivent en phase 2.
export const load: PageServerLoad = async ({ locals }) => {
	const { data, error } = await locals.supabase
		.from('site_offers')
		.select('slug, type, destination, price_adult_cents, title_i18n')
		.eq('is_published', true)
		.order('slug');
	return { offers: error ? [] : (data ?? []), failed: Boolean(error) };
};
