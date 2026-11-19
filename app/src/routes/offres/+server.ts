import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Le catalogue est pour l'instant celui du site de référence.
export const GET: RequestHandler = () => redirect(308, '/#catalogue');
