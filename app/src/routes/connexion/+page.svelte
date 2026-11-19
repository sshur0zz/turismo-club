<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let sending = $state(false);
</script>

<svelte:head>
	<title>{m.login_t()} — Turismo Club</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="wrap box">
	<h1>{m.login_t()}</h1>
	{#if form?.sent}
		<p class="notice" role="status">{m.login_sent({ email: form.email })}</p>
	{:else}
		<p>{m.login_d()}</p>
		<form
			method="POST"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
		>
			<input type="hidden" name="suite" value={page.url.searchParams.get('suite') ?? ''} />
			<label for="email">{m.email()}</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
				aria-invalid={form?.invalid ? 'true' : undefined}
				aria-describedby={form?.invalid ? 'email-err' : undefined}
			/>
			{#if form?.invalid}<p id="email-err" class="err">{m.e_email()}</p>{/if}
			{#if form?.failed}<p class="notice error" role="alert">{m.login_err()}</p>{/if}
			<button class="btn" type="submit" disabled={sending}>{m.login_b()}</button>
		</form>
	{/if}
</div>

<style>
	.box {
		max-width: 520px;
		padding-block: 56px;
	}
	form {
		display: grid;
		gap: 12px;
	}
	.err {
		color: #b91c1c;
		margin: 0;
	}
</style>
