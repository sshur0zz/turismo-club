// Site de référence (dernière version validée) : ../site/index.html.
// La v2 l'affiche tel quel, avec seulement l'ajout du lien « Se connecter / Mon compte ».
// Les pages v2 (connexion, compte, admin) réutilisent exactement son CSS.
// Au fil des phases, chaque page sera reconvertie en composant Svelte avec le même rendu.
import raw from '../../../../site/index.html?raw';

// Palette « Bordeaux & or » : l'ancien site l'applique en JavaScript au chargement.
const BORDEAUX =
	':root{--accent:#9F1239;--accent-dark:#881337;--accent-light:#FCD34D;--cream:#FFF1F2;--cream-line:#FECDD3;--hero:#2B0F17}';

const style = raw.match(/<style>([\s\S]*?)<\/style>/);
if (!style) throw new Error('Site de référence : bloc <style> introuvable');
export const LEGACY_CSS = style[1] + BORDEAUX;

export type Account = { email: string; staff: boolean } | null;

function patch(html: string, from: string, to: string): string {
	if (!html.includes(from))
		throw new Error(`Site de référence : passage introuvable « ${from.slice(0, 60)} »`);
	return html.replace(from, to);
}

/** Page d'accueil v2 = site de référence + lien compte + langue tirée de l'adresse. */
export function legacyPage(opts: {
	account: Account;
	lang: string | null;
	labels: Record<string, { login: string; account: string; admin: string }>;
}): string {
	const tc = JSON.stringify(opts).replace(/</g, '\\u003c');
	let html = raw;
	// 1. Données du serveur + fonction qui dessine le lien compte (appelée par applyChrome).
	html = patch(
		html,
		'\n<script>\n',
		`\n<script>window.TC=${tc};
function tcAccountLink(){var p=LANG==='en'?'':'/'+LANG,l=TC.labels[LANG]||TC.labels.en;
if(!TC.account)return '<a class="cart-btn" href="'+p+'/connexion">'+l.login+'</a>';
return (TC.account.staff?'<a class="cart-btn" href="'+p+'/admin">'+l.admin+'</a>':'')+'<a class="cart-btn" href="'+p+'/compte">'+l.account+'</a>';}
</script>\n<script>\n`
	);
	// 2. Le lien compte, juste avant le panier.
	html = patch(
		html,
		'<a class="cart-btn" href="#panier" data-nav="panier">${tr(\'cart\')}',
		'${tcAccountLink()}<a class="cart-btn" href="#panier" data-nav="panier">${tr(\'cart\')}'
	);
	// 3. /fr, /it… : la langue de l'adresse prime et est mémorisée.
	html = patch(
		html,
		"const sl = localStorage.getItem('tc-lang'); if (sl && UI[sl]) LANG = sl;",
		"const sl = TC.lang || localStorage.getItem('tc-lang'); if (sl && UI[sl]) { LANG = sl; localStorage.setItem('tc-lang', sl); }"
	);
	return html;
}
