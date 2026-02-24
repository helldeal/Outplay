# OUTPLAY – Prisma + Supabase Setup

## Stack ciblée
- Supabase PostgreSQL
- Prisma ORM (schema + seed)
- Auth Supabase via Discord uniquement
- RLS sur `users`, `user_cards`, `booster_openings`
- Assets images via Supabase Storage (`assets`)

## 1) Préparer Supabase
1. Créer le projet Supabase
2. Dans Auth → Providers, activer **Discord** et configurer `Client ID`, `Client Secret`, redirect URL
3. Récupérer les URLs DB et les mettre dans `.env`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

## 2) Installer et migrer Prisma
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init_outplay
```

## 3) Seed initial OUTPLAY
Ce seed crée:
- Games
- Teams
- Nationalities
- Roles
- Series `S1`
- 70 Cards (`S1-01` à `S1-70`, avec 1 seule `LEGENDS`)
- 4 boosters (`NORMAL`, `LUCK`, `PREMIUM`, `GODPACK` daily)

```bash
npx prisma db seed
```

## 4) Appliquer le hardening Supabase
Exécuter le SQL de [prisma/supabase-hardening.sql](prisma/supabase-hardening.sql) dans SQL Editor Supabase.

Ce script ajoute:
- FK `public.users(id)` -> `auth.users(id)` (`ON DELETE CASCADE`)
- Règle métier: max 1 carte `LEGENDS` par série
- Trigger d’immutabilité `boosters.drop_rates`
- Activation RLS + policies utilisateur
- Fonction RPC `public.open_booster(...)` (logique random serveur)
- Création du bucket storage `assets` (si absent)

## 5) Règle produit importante
- Ne jamais calculer la logique économique booster côté client.
- Utiliser uniquement l’appel RPC serveur (`open_booster`) depuis le front.
