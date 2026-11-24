-- Turismo Club — 21 : double authentification exigée par la base (audit SEC-005)
-- L'écran de l'espace équipe demande le code, mais la vraie protection doit être dans la base :
-- un membre qui a activé un code d'application (facteur TOTP vérifié) n'a AUCUN droit tant que sa session
-- n'est pas au niveau aal2 (code saisi). Les membres sans double authentification ne changent pas de comportement.
-- Toutes les politiques RLS passent par ces deux fonctions : une seule modification suffit.

CREATE FUNCTION private.mfa_ok() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
        OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified')
$$;
REVOKE ALL ON FUNCTION private.mfa_ok() FROM public, anon, authenticated; -- appelée seulement par les deux fonctions ci-dessous

CREATE OR REPLACE FUNCTION private.current_staff_role() RETURNS staff_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM staff WHERE id = auth.uid() AND is_active AND private.mfa_ok()
$$;

CREATE OR REPLACE FUNCTION private.current_guide_id() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT guide_id FROM staff WHERE id = auth.uid() AND is_active AND private.mfa_ok()
$$;
