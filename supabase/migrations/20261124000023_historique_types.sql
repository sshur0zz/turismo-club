-- Turismo Club — 23 : nouveaux types d'entrées d'historique (booking_events.kind)
-- motif_perte (lot 1 : motif d'annulation obligatoire), fournisseur et voucher (lot 3 : statuts fournisseur, bons d'échange), tache (lot 3 : tâches).
ALTER TABLE booking_events DROP CONSTRAINT booking_events_kind_check;
ALTER TABLE booking_events ADD CONSTRAINT booking_events_kind_check CHECK (kind = ANY (ARRAY[
  'note', 'appel', 'email', 'modification', 'annulation', 'remboursement', 'creation', 'statut', 'responsable', 'paiement',
  'prestation', 'note_interne', 'guide', 'pointage', 'motif_perte', 'fournisseur', 'voucher', 'tache']));
