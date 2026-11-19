import type { LayoutServerLoad } from './$types';

// Donne à toutes les pages : qui est connecté, et s'il fait partie du personnel.
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, staffRole } = await locals.getAccount();
	return {
		user: user ? { id: user.id, email: user.email ?? '' } : null,
		staffRole
	};
};
