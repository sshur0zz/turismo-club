<script lang="ts">
	import { localizeHref } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>Turismo Club — Rome</title>
	<meta name="description" content={m.hero_d()} />
</svelte:head>

<section class="hero">
	<div class="wrap">
		<p class="eyebrow" style="color:var(--accent-light)">{m.hero_eb()}</p>
		<h1>{m.hero_t()}</h1>
		<p class="lead">{m.hero_d()}</p>
		<a class="btn" href={localizeHref('/offres')}>{m.see_all()}</a>
	</div>
</section>

<section class="wrap why">
	<p class="eyebrow">{m.why_eb()}</p>
	<h2>{m.why_t()}</h2>
	<div class="grid">
		<div class="panel">
			<h3>{m.why1t()}</h3>
			<p>{m.why1d()}</p>
		</div>
		<div class="panel">
			<h3>{m.why2t()}</h3>
			<p>{m.why2d()}</p>
		</div>
		<div class="panel">
			<h3>{m.why3t()}</h3>
			<p>{m.why3d()}</p>
		</div>
	</div>
</section>

<style>
	.hero {
		background: var(--hero);
		color: #fff;
		padding-block: 72px;
	}
	h1 {
		font-size: clamp(32px, 5vw, 52px);
		max-width: 18ch;
		margin: 12px 0;
	}
	.lead {
		font-size: 19px;
		max-width: 60ch;
		color: #f3f4f6;
		margin-bottom: 28px;
	}
	.why {
		padding-block: 56px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}
	.grid h3 {
		margin-top: 0;
	}
</style>
