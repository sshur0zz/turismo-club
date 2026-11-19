<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let sending = $state(false);
</script>

<svelte:head>
	<title>Turismo Club — {m.login_t()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="wrap" style="max-width:600px;padding-top:56px">
	<h1 class="ph1">{m.login_t()}</h1>
	{#if form?.sent}
		<p class="ok" role="status">{m.login_sent({ email: form.email })}</p>
	{:else}
		<form
			class="form panel"
			method="POST"
			novalidate
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
		>
			<p style="margin:0;color:var(--ink-2)">{m.login_d()}</p>
			<input type="hidden" name="suite" value={page.url.searchParams.get('suite') ?? ''} />
			<div class="field">
				<label for="email">{m.email()}</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
					aria-invalid={form?.invalid ? 'true' : undefined}
					aria-describedby="email-err"
				/>
				<span class="err" id="email-err">{form?.invalid ? m.e_email() : ''}</span>
			</div>
			{#if form?.failed}<p class="warn" role="alert">{m.login_err()}</p>{/if}
			<button class="btn" type="submit" disabled={sending}>{m.login_b()}</button>
		</form>
	{/if}
</div>
