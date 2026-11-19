<script lang="ts">
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.css';
	import { page } from '$app/state';
	import { getLocale, localizeHref, deLocalizeHref } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import Logo from '#lib/components/Logo.svelte';
	import favicon from '#lib/assets/favicon.svg';
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
	const isAdmin = $derived(here.startsWith('/admin'));
	const current = (p: string) =>
		here === p || (p !== '/' && here.startsWith(p)) ? 'page' : undefined;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip" href="#main">{m.skip()}</a>

{#if !isAdmin}
	<p class="demo">{m.demo()}</p>
{/if}

<header>
	<div class="wrap bar">
		<a class="logo" href={localizeHref('/')}><Logo /></a>
		<nav aria-label="Menu">
			<a href={localizeHref('/offres')} aria-current={current('/offres')}>{m.nav_offers()}</a>
			{#if data.staffRole}
				<a href={localizeHref('/admin')} aria-current={current('/admin')}>{m.nav_admin()}</a>
			{/if}
			{#if data.user}
				<a href={localizeHref('/compte')} aria-current={current('/compte')}>{m.nav_account()}</a>
			{:else}
				<a class="btn ghost" href={localizeHref('/connexion')}>{m.nav_login()}</a>
			{/if}
			<label class="lang">
				<span class="sr-only">{m.lang()}</span>
				<select
					value={getLocale()}
					onchange={(e) =>
						(location.href = localizeHref(here, { locale: e.currentTarget.value as never }))}
				>
					{#each LANGS as l (l.c)}
						<option value={l.c}>{l.n}</option>
					{/each}
				</select>
			</label>
		</nav>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer>
	<div class="wrap foot">
		<Logo dark />
		<p>{m.footer()}</p>
		<!-- Liens pour les moteurs de recherche : la même page dans chaque langue. -->
		<nav aria-label={m.lang()}>
			{#each LANGS as l (l.c)}
				<a href={localizeHref(here, { locale: l.c })} hreflang={l.c} lang={l.c}>{l.n}</a>
			{/each}
		</nav>
	</div>
</footer>

<style>
	.demo {
		margin: 0;
		padding: 8px 20px;
		background: var(--accent-light);
		color: #451a03;
		font-size: 13px;
		text-align: center;
	}
	header {
		border-bottom: 1px solid var(--line);
		background: #fff;
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-block: 10px;
	}
	.logo {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 6px 18px;
		flex-wrap: wrap;
	}
	nav a:not(.btn) {
		color: var(--ink);
		font-weight: 700;
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	nav a[aria-current='page'] {
		color: var(--accent);
		box-shadow: inset 0 -2px 0 var(--accent);
	}
	.lang {
		margin: 0;
	}
	select {
		min-height: 44px;
		border: 1px solid #9ca3af;
		border-radius: 10px;
		padding: 0 10px;
		font: 600 15px var(--font);
		background: #fff;
	}
	main {
		min-height: 60vh;
	}
	footer {
		background: var(--hero);
		color: #e5e7eb;
		margin-top: 64px;
	}
	.foot {
		padding-block: 36px;
	}
	.foot nav a {
		color: #e5e7eb;
		font-weight: 500;
		font-size: 14px;
	}
</style>
