# CLAUDE.md — Cockpit JK

## Contexte
Station de commande personnelle de Jordan Koskas (JK Consulting). Application desktop-first : Claude est le héros, Airtable la mémoire opérationnelle, le Calendar bidirectionnel, et un Workflow Studio génère des workflows n8n à la demande.

**Emplacement** : `~/JK-Consulting/interne/cockpit-jk`
**Repo** : github.com/JordanK-0385/cockpit-jk
**Déploiement** : Vercel

## Stack
- **Front** : Vite · React 18 · TypeScript strict · Tailwind CSS · Framer Motion · TanStack Query · React Router
- **Backend** : Vercel Serverless Functions (`/api/*`) — proxy sécurisé Airtable / Claude / n8n
- **Auth** : Firebase Auth (Google OAuth, single-tenant)
- **Persistance** : Airtable (source de vérité), Firestore (cache + historique)
- **Design system** : Alpine Studio — vert sauge / bleu glacier / terracotta, glass + ambient layer

## RÈGLE ABSOLUE — sécurité proxy
Aucune clé sensible ne doit JAMAIS être exposée côté client. Toute clé API (Airtable, Anthropic, n8n) passe par les routes `/api/*` qui :
1. lisent le `Authorization: Bearer <firebase-id-token>`,
2. vérifient le token via `firebase-admin`,
3. confirment que l'email == `AUTHORIZED_EMAIL`,
4. relayent vers le service avec les clés serveur.

Côté client, on n'expose QUE : `VITE_FIREBASE_*`, `VITE_AUTHORIZED_EMAIL`, `VITE_GOOGLE_CALENDAR_SCOPE`.
Ne jamais introduire de clé sensible dans le bundle front.

## Modules
- **Cockpit** : vue tâches/projets, lecture Airtable via proxy
- **Chat Claude** : streaming + tool use (création/modif tâches)
- **Radar Projets** : cartes projets actifs + bouton "Focus du jour" (appel Anthropic via proxy Vercel)
- **Apprendre** : parcours gamifié, quiz, glossaire, fiches visuelles (dernière version : v5)
- **Workflow Studio** : génération de workflows n8n via Claude + push API

## Conventions
- TypeScript strict — pas de `any` non justifié
- Modèle Claude utilisé : `claude-sonnet-4-6`
- Tests via Vitest (dossier `tests/`)
- Ne pas committer de `.env` ; voir `.env.example`

## Airtable
Base "Second Cerveau" : appyvKVq6Q6kr37La
Tables clés : Sessions Claude, Tâches, Projets IA & Automatisation, Sous-tâches, Factures & Revenus, Clients

---

## PROTOCOLE MÉMOIRE — Second Cerveau

**Source de vérité unique : Airtable base `appyvKVq6Q6kr37La`.**
**Projet concerné dans Airtable : "Cockpit JK"**

**EN DÉBUT de session, avant toute action :**
1. Lire dans la table Sessions Claude (`tblqyyvcDdkMkTf2F`) le dernier Check-out de ce projet.
2. Lire la fiche du projet dans Projets (`tbl58obVdHkmZU0T1`) et ses tâches ouvertes.
3. Résumer en 2 lignes "voici où on en est" avant de commencer.

**EN FIN de session :**
1. Créer un enregistrement Check-out dans Sessions Claude : projet lié, objectif, résumé, décisions, tâches créées.
2. Mettre à jour les tâches concernées.

**Si l'accès Airtable n'est pas disponible dans cet espace, le dire explicitement plutôt que d'inventer l'état du projet.**
