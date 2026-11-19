<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const title = (o: { slug: string; title_i18n: Record<string, string> | null }) =>
		o.title_i18n?.[getLocale()] ??
		o.title_i18n?.en ??
		o.slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
	const price = (cents: number) =>
		new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'EUR' }).format(cents / 100);
</script>

<svelte:head><title>{m.nav_offers()} — Turismo Club</title></svelte:head>

<div class="wrap">
	<h1>{m.cat_t()}</h1>
	<p>{m.cat_d()}</p>
	{#if data.failed}
		<p class="notice error" role="alert">{m.login_err()}</p>
	{:else}
		<ul>
			{#each data.offers as o (o.slug)}
				<li class="panel">
					<strong>{title(o)}</strong>
					<span>{m.from()} {price(o.price_adult_cents)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 14px;
	}
	li {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
