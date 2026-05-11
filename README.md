# Cockpit JK

Station de commande personnelle pour Jordan Koskas. Application desktop-first où Claude est le héros, Airtable la mémoire opérationnelle, le Calendar bidirectionnel, et un Workflow Studio qui génère des workflows n8n à la demande.

## Stack

- **Front** Vite · React 18 · TypeScript strict · Tailwind CSS · Framer Motion · TanStack Query · React Router
- **Backend léger** Vercel Serverless Functions (`/api/*`) — proxy sécurisé pour Airtable / Claude / n8n
- **Auth** Firebase Auth (Google OAuth, single-tenant)
- **Persistance** Airtable (source de vérité opérationnelle), Firestore (cache + historique conversations à venir)
- **Design system** Alpine Studio — vert sauge / bleu glacier / terracotta, glass + ambient layer

## Architecture sécurité — proxy obligatoire

Aucune clé sensible n'est exposée côté client. Les routes `/api/*` :
1. lisent le `Authorization: Bearer <firebase-id-token>` envoyé par le front,
2. vérifient le token via `firebase-admin`,
3. confirment que l'email == `AUTHORIZED_EMAIL`,
4. relayent ensuite l'appel vers Airtable / Anthropic / n8n avec les clés serveur.

Côté client, on n'expose que :
- `VITE_FIREBASE_*` (publiques par design),
- `VITE_AUTHORIZED_EMAIL` (UX guard),
- `VITE_GOOGLE_CALENDAR_SCOPE`.

Voir `.env.example` pour la liste complète.

## Plan de sprint

| Sprint | Livrable |
| :--- | :--- |
| **1 (en cours)** | Scaffolding · design system · ambient · auth Google · vue Cockpit lecture seule branchée à Airtable via proxy |
| 2 | Chat Claude streaming + tool use (création/modif tâches Airtable) |
| 3 | Veille auto multi-sources via workflow n8n (3×/jour → table `Veille`) |
| 4 | Calendar bidirectionnel · Tasks Kanban · Projects grid · Sessions timeline · Check-out modal |
| 5 | Workflow Studio · génération de workflows n8n via Claude + push API |

## Démarrer en local

```bash
# 1. installer les dépendances
npm install

# 2. créer .env.local depuis le template et remplir au minimum :
#    - VITE_FIREBASE_*
#    - AIRTABLE_PAT, AIRTABLE_BASE_ID, AUTHORIZED_EMAIL
#    - FIREBASE_SERVICE_ACCOUNT_JSON (pour que les /api/* vérifient les tokens)
cp .env.example .env.local

# 3. dev "complet" (front + /api/* via Vercel CLI)
npx vercel dev

# alternative — front seul (pas d'/api/*) sur le port 5174
npm run dev
```

`npx vercel dev` est requis pour que les routes `/api/*` répondent en local.

## Déploiement Vercel

1. Sur **vercel.com → Import Project**, importer `JordanK-0385/cockpit-jk`.
2. Framework détecté : Vite. Laisser les defaults (`npm run build`, `dist`).
3. **Environment Variables** : ajouter chaque entrée de `.env.example`. Bien noter que `AIRTABLE_PAT`, `ANTHROPIC_API_KEY`, `N8N_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` ne doivent **pas** avoir le préfixe `VITE_`.
4. Deploy. Auto-deploy sur push `main` ensuite.

Smoke-test après déploiement :
```bash
curl https://<domaine-vercel>/api/health
# → { ok: true, service: "cockpit-jk", sprint: 1, ... }
```

## Structure

```
src/
├── lib/                  firebase, airtable client (frontend), queries, utils, types
├── components/
│   ├── ambient/          AmbientOrbs · Bokeh · Particles · Grain · AmbientLayer
│   ├── ui/               Glass primitives — Card / Button / Pill / Badge / Input / Loader
│   └── cockpit/          ColumnLeft · ColumnCenter · ColumnRight
├── pages/                Login · Cockpit
├── styles/globals.css    Tokens Alpine Studio + classes glass
└── App.tsx               Routing avec auth guard

api/                      Vercel serverless functions (proxy)
├── _lib/                 auth (Firebase admin) · airtable upstream
├── airtable/records.ts   GET/POST/PATCH proxy
├── claude/chat.ts        stub Sprint 2
├── n8n/workflows.ts      stub Sprint 5
└── health.ts             public health check
```
