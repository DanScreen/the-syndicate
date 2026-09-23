# @tiki-acca/client

React hooks shared by `apps/web` and `apps/mobile`: the data layer behind the group screens. React only — no DOM, no React Native, no Next.js — so the same hook runs in both apps. Pure logic belongs in `@tiki-acca/shared` instead.

Each app supplies an `ApiFetcher` (how to reach the API) and keeps its own rendering, navigation and platform APIs (share sheet, confirm dialogs, scrolling):

- Web: `apps/web/src/lib/api-client.ts` — same-origin, Auth.js cookie.
- Mobile: `apps/mobile/src/api/use-api-fetcher.ts` — `EXPO_PUBLIC_API_URL` + Bearer session token.

## Modules

- `api.ts` — `createApiFetcher`, `requestJson`, `ApiError` (status + the server's message).
- `group-data.tsx` — `GroupDataProvider` / `useGroupData`: loads `GET /api/groups/[id]`, polls every 60s while a bet is locked, exposes `error`; optional `onUnavailable` for 403/404.
- `group-thread.ts` — `useGroupThread`: chat load, poll, post, delete, react, report, block, load earlier.
- `leg-picker.ts` — `useLegPicker`: competition → fixture → market → selection, extra market tiers, submit / change.
- `blocked-members.ts` — `useBlockedMembers`: the Account page blocked list and unblock.
- `round-actions.ts` — Bet-tab mutations: `createRound`, `lockRound`, `removeLeg`, `toggleReaction`.

## Checks

`npm run lint`, `npm run typecheck` and `npm test` in this workspace (all run in CI from the root scripts). Lint enforces the Rules of Hooks.
