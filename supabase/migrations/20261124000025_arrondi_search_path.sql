-- Turismo Club — 25 : chemin de recherche figé pour la fonction d'arrondi (alerte Advisors 0011)
ALTER FUNCTION private.round_half_even(numeric) SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION private.round_half_even(numeric) FROM public, anon, authenticated;
