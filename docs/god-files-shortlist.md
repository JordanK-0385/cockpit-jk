# God files shortlist — repérés en posant le filet de tests

Fichiers trop gros / trop multi-rôles pour être testés proprement
sans refactor préalable. À nourrir dans l'audit god files à venir
— **aucun refactor à faire maintenant**.

| Fichier | LOC | Pourquoi c'est problématique pour les tests |
|---|---|---|
| `src/components/cockpit/ColumnCenter.tsx` | 360 | Chat UI principal — 16 hooks (useState/useEffect/useRef/useMemo/useCallback). Mélange : streaming SSE, construction du payload API, auto-scroll RAF, sticky-to-bottom, gestion des messages, rendu. Beaucoup trop de responsabilités pour des tests unitaires lisibles. À éclater (au minimum) en : `useChatStream` hook, `buildApiMessages` pure function (déjà extrait partiellement), composant de rendu pur. |
| `src/components/chat/MarkdownBubble.tsx` | 171 | Mélange : parsing markdown, syntax highlighting (react-syntax-highlighter, gros), composant React, mémoisation. Tester l'output HTML est possible mais le coût initial (mocker react-markdown + remark-gfm + highlighter) est élevé. Bonne candidate pour rester telle qu'elle est, mais une fonction pure `extractCodeBlocks(text) → segments[]` séparée serait facile à tester. |
| `src/lib/preferences.tsx` | 149 | Provider/Context + persistance localStorage + hook. Testable, mais la persistance localStorage et le provider sont mélangés dans le même fichier. Séparer le pur (reducer / shape par défaut) du provider rendrait les tests triviaux. |
| `src/components/PerformanceToggle.tsx` | 139 | Toggle UI couplé à des effets globaux (DOM mutations sur le document ? à vérifier). Si oui, ces effets devraient sortir dans un module pur testable. |
| `api/claude/chat.ts` | 122 | Handler Vercel + streaming SSE + construction du payload Anthropic + gestion d'erreurs, le tout dans un seul `export default`. Pas de couture pure à tester aujourd'hui. À découper en : `buildAnthropicPayload(messages) → payload` (pur, testable) + `streamToClient(res, anthropic)` (effets, testable par contrat). |
| `src/pages/Login.tsx` | 106 | Composant page qui importe directement `firebase` (effets de bord à l'import). Difficile à tester sans mocker tout le module firebase. Pas critique car la logique est minime, mais à garder à l'œil. |

## Ce qui était déjà bien testable (et qu'on a couvert)

- `api/_lib/auth.ts` → `requireAuthorizedUser` : couture nette, mockable via `req/res` minimalistes.
- `api/_lib/airtable.ts` → `buildQuery` : fonction pure, déterministe. La rendre `export` a suffi.
- `src/App.tsx` : assez petit (~30 LOC) pour être testé en mockant `useAuth` et les pages.

## Prochaines coutures faciles à isoler (sans gros refactor)

Si tu veux étendre le filet *sans* refactor, ces extractions sont chacune ≤ 20 LOC :

1. `buildApiMessages` dans ColumnCenter — déjà nommé, peut être déplacé dans un fichier helper et testé seul (couvre directement le bug "First message must be from user" du 11 mai).
2. `buildAnthropicPayload` à extraire de `api/claude/chat.ts` — pareil, pure, ~10 LOC.
3. Le reducer de `src/lib/preferences.tsx` si jamais il est sorti en pure.

Ces 3-là, si elles arrivent, doublent la valeur du filet pour un coût minime.
