import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Autorise la lecture du site de référence (../site/index.html).
	server: { fs: { allow: ['..'] } },
	// En dev, ne pas pré-empaqueter SvelteKit côté serveur (sinon il est chargé deux fois).
	environments: { ssr: { optimizeDeps: { exclude: ['@sveltejs/kit'] } } },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Langue = adresse (/fr/…), sinon anglais. Une adresse = une langue : indispensable pour Google.
			strategy: ['url', 'baseLocale']
		})
	]
});
