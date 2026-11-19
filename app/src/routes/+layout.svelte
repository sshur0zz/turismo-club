<script lang="ts">
	// En-tête et pied de page identiques au site de référence (mêmes classes, même CSS).
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getLocale, localizeHref, deLocalizeHref } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import { LEGACY_CSS } from '#lib/legacy/index.js';
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const LANGS = [
		{ c: 'en', n: 'English' },
		{ c: 'it', n: 'Italiano' },
		{ c: 'fr', n: 'Français' },
		{ c: 'es', n: 'Español' },
		{ c: 'de', n: 'Deutsch' },
		{ c: 'pt', n: 'Português' },
		{ c: 'nl', n: 'Nederlands' },
		{ c: 'zh', n: '中文' },
		{ c: 'ja', n: '日本語' },
		{ c: 'ko', n: '한국어' }
	] as const;

	const here = $derived(deLocalizeHref(page.url.pathname));
	const lang = $derived(getLocale());
	const home = $derived(localizeHref('/'));
	const current = (p: string) => (here.startsWith(p) ? 'page' : undefined);

	let menuOpen = $state(false);
	let cartCount = $state(0);

	onMount(() => {
		try {
			localStorage.setItem('tc-lang', getLocale()); // même langue en revenant sur l'accueil
			const cart = JSON.parse(localStorage.getItem('tc-cart') || '[]');
			cartCount = Array.isArray(cart) ? cart.length : 0;
		} catch {
			/* stockage indisponible : on garde 0 */
		}
		const close = (e: MouseEvent) => {
			if (!(e.target as Element).closest('.langsel')) menuOpen = false;
		};
		document.addEventListener('click', close);
		return () => document.removeEventListener('click', close);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
	{@html `<style>${LEGACY_CSS}</style>`}
</svelte:head>

<div class="demo" role="note">{m.demo()}</div>
<div class="topbar">
	<div class="wrap"><span>{m.top_left()}</span><span>{m.top_right()}</span></div>
</div>
<header class="site">
	<div class="wrap">
		<a class="logo" data-sveltekit-reload href={home} aria-label="Turismo Club"><Logo /></a>
		<nav class="main" aria-label="Menu">
			<a data-sveltekit-reload href="{home}#catalogue">{m.nav_offers()}</a>
			<a data-sveltekit-reload href="{home}#devis">{m.nav_custom()}</a>
			<a data-sveltekit-reload href="{home}#accueil-faq">{m.nav_faq()}</a>
		</nav>
		<div class="hdr-right" style="display:flex;align-items:center;gap:12px">
			<div class="langsel">
				<button
					type="button"
					id="langBtn"
					aria-haspopup="true"
					aria-expanded={menuOpen}
					aria-controls="langMenu"
					aria-label="{m.lang()}: {LANGS.find((l) => l.c === lang)?.n}"
					onclick={() => (menuOpen = !menuOpen)}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" /><path
							d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"
						/>
					</svg><span>{lang.toUpperCase()}</span>
				</button>
				<div id="langMenu" class="langmenu" hidden={!menuOpen}>
					{#each LANGS as l (l.c)}
						<a
							href={localizeHref(here, { locale: l.c })}
							hreflang={l.c}
							lang={l.c}
							aria-current={l.c === lang}
							data-sveltekit-reload
						>
							{l.n}
						</a>
					{/each}
				</div>
			</div>
			{#if data.staffRole}
				<a class="cart-btn" href={localizeHref('/admin')} aria-current={current('/admin')}>
					{m.nav_admin()}
				</a>
			{/if}
			{#if data.user}
				<a class="cart-btn" href={localizeHref('/compte')} aria-current={current('/compte')}>
					{m.nav_account()}
				</a>
			{:else}
				<a class="cart-btn" href={localizeHref('/connexion')} aria-current={current('/connexion')}>
					{m.nav_login()}
				</a>
			{/if}
			<a class="cart-btn" data-sveltekit-reload href="{home}#panier">
				{m.cart()} <b id="cartCount">{cartCount}</b>
			</a>
		</div>
	</div>
</header>

<main id="app" tabindex="-1">
	{@render children()}
</main>

<footer class="site">
	<div class="wrap">
		<span>
			<strong style="color:var(--ink)">Turismo Club</strong> · {m.footer()} · Via Cavour 182, 00184 Roma
			· bonjour@turismoclub-demo.it
		</span>
		<span>
			P.IVA IT00000000000 (demo) · <a
				data-sveltekit-reload
				href="{home}#credits"
				style="color:var(--muted)"
			>
				{m.credits()}
			</a>
		</span>
	</div>
</footer>

<style>
	/* Le menu des langues du site de référence utilise des <button> ; ici ce sont des liens (vraies adresses par langue). */
	.langmenu a {
		min-height: 40px;
		display: flex;
		align-items: center;
		padding: 0 12px;
		border-radius: 8px;
		font-size: 15px;
		color: var(--ink);
		text-decoration: none;
	}
	.langmenu a:hover {
		background: var(--soft);
	}
	.langmenu a[aria-current='true'] {
		font-weight: 800;
		background: var(--cream);
	}
</style>
