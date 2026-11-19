import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST uniquement : un simple lien ne doit pas pouvoir déconnecter quelqu'un.
export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	redirect(303, '/');
};
