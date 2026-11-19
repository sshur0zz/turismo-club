<script lang="ts">
	// Logo « L'Arche » (identité figée). `dark` = version sur fond sombre.
	let { dark = false }: { dark?: boolean } = $props();
	const ink = $derived(dark ? '#FFFFFF' : 'var(--ink)');
	const bg = $derived(dark ? 'var(--hero)' : '#FFFFFF');
	const sub = $derived(dark ? '#CBD5E1' : '#6B7280');
</script>

<svg viewBox="0 0 230 50" role="img" aria-label="Turismo Club" xmlns="http://www.w3.org/2000/svg">
	<path d="M4 48V22a20 20 0 0 1 40 0v26z" fill="var(--accent)" />
	<path d="M14 48V24a10 10 0 0 1 20 0v24z" fill={bg} />
	<path d="M17 48a7 7 0 0 1 14 0z" fill="var(--accent)" />
	<text x="58" y="27" fill={ink} style="font:800 23px var(--font)">Turismo Club</text>
	<text x="59" y="43" fill={sub} style="font:600 9.5px var(--font);letter-spacing:3.2px">
		ROMA · ITALIA
	</text>
</svg>

<style>
	svg {
		display: block;
		height: 44px;
		width: auto;
	}
</style>
