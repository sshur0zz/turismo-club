<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Turismo Club — {m.acc_t()}</title></svelte:head>

<div class="wrap" style="padding-top:56px">
	<p class="eyebrow">Turismo Club</p>
	<h1 class="ph1">{m.acc_t()}</h1>
	<div class="panel" style="display:flex;flex-direction:column;gap:16px;max-width:720px">
		<p style="margin:0">{m.acc_as({ email: data.user?.email ?? '' })}</p>
		<p class="sim" style="margin:0">{m.acc_soon()}</p>
		<form method="POST" action="/deconnexion">
			<button class="btn ghost" type="submit">{m.nav_logout()}</button>
		</form>
	</div>
</div>
