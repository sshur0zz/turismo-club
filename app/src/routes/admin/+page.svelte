<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.admin_t()} — Turismo Club</title></svelte:head>

<div class="wrap" style="padding-block:48px">
	<h1>{m.admin_t()}</h1>
	<p>{m.admin_hi({ role: data.staffRole ?? '' })}</p>
	<p class="notice">{m.admin_soon()}</p>
</div>
