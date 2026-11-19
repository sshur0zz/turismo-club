import type { SupabaseClient, User } from '@supabase/supabase-js';

export type StaffRole = 'admin' | 'conseiller' | 'guide';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			getAccount: () => Promise<{ user: User | null; staffRole: StaffRole | null }>;
		}
		interface PageData {
			user: { id: string; email: string } | null;
			staffRole: StaffRole | null;
		}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}

export {};
