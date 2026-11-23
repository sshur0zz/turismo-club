# E-mails reçus dans l'espace équipe

Gmail → transfert automatique → **demandes@in.turismoclub.it** (Cloudflare Email Routing, sous-domaine `in.`) → ce Worker → Supabase (`inbound_emails`) → rubrique **E-mails** de https://turismoclub.it/pro/.

- Le Worker n'a que la clé **publique** Supabase et un secret partagé (`EMAIL_INGEST_SECRET`, réglé avec `npx wrangler secret put EMAIL_INGEST_SECRET`, jamais dans Git). La base ne garde que l'empreinte SHA-256 de ce secret (`private.settings`, clé `email_ingest_sha256`).
- Déployer : `npm install` puis `npx wrangler deploy` (depuis ce dossier).
- Changer le secret : en générer un nouveau, le mettre dans le Worker, puis mettre son empreinte SHA-256 dans `private.settings`.
