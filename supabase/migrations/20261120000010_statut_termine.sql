-- Turismo Club — 10 : nouvelle étape « Terminée » pour les dossiers (espace équipe)
-- Étapes : new (Nouvelle) → in_progress (En cours) → sent (Devis envoyé) → won (Confirmée) → done (Terminée) ; lost = Annulée.
-- Migration séparée : une valeur ajoutée à un type énuméré ne peut pas être utilisée dans la même transaction.
ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'done' AFTER 'won';
