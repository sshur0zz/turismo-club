<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.acc_t()} — Turismo Club</title></svelte:head>

<div class="wrap" style="padding-block:48px">
	<h1>{m.acc_t()}</h1>
	<p>{m.acc_as({ email: data.user?.email ?? '' })}</p>
	<p class="notice">{m.acc_soon()}</p>
	<form method="POST" action="/deconnexion" style="margin-top:24px">
		<button class="btn ghost" type="submit">{m.nav_logout()}</button>
	</form>
</div>
