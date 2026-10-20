# The Swifty Cup 2026 — PRD

## Summary
Mobile-first Expo app for a Ryder-Cup-style golf competition between Team NZ 🇳🇿 and Team World 🌍. Each player picks their own name on first launch (stored on-device). Public users browse rounds, score matches, and view pairings; the organiser (PIN 1926) manages players, pairings and round metadata via a discreet 3-dot menu.

## Stack
- **Frontend**: Expo SDK 57 (expo-router, expo-image, expo-image-picker, expo-image-manipulator, @react-native-vector-icons/ionicons, @tanstack/react-query, react-native-safe-area-context, AsyncStorage).
- **Backend**: FastAPI + Motor (async MongoDB) on `/api/*`.
- **Auth**: PIN → JWT (HS256). Default PIN `1926` (configurable via `/api/admin/change-pin`).
- **Realtime**: WebSocket `/api/ws` broadcasts `match_updated`, `player_updated`, `pairings_changed`, `rounds_changed`, `settings_changed`. Client invalidates React Query cache on any message.
- **Storage**: Emergent Managed Object Storage for player photos (`/api/photos` admin, `/api/photos-self` public self-upload).

## Navigation
### First launch
- `/pick-player` — all 12 players grouped by team; tap your name to save to AsyncStorage (`swifty.me.player_id`).

### Tabs (4)
1. **Rounds** — home. Lists 3 round cards (format, venue, date, status pill `UPCOMING` / `LIVE` / `COMPLETE`, per-round NZ/World points, x/y matches). Tap a card → the match-scoring screen for that round (R1/R2/R3 reused as stack routes).
2. **Leaderboard** — total scores for both teams, round-by-round breakdown, overall leader / cup winner message.
3. **Pairings** — read-only view of all matches by round for the public; after admin PIN, slots become editable with duplicate warnings, confirmation dialog if a touched match has a result, sticky Save bar.
4. **Bio** — the signed-in player's own profile: avatar, upload / replace / remove photo, editable bio, `Switch player` link. Admin edits anyone via 3-dot menu → *Admin: All Bios*.

## Data Model (MongoDB)
- `players`: `{ id, team: NZ|WORLD, name, bio, photo_path, order }`
- `matches`: `{ id, round: 1|2|3, index, nz_player_ids[], world_player_ids[], live_status, result: NZ_WIN|HALVED|WORLD_WIN|null, updated_at }`
- `rounds`: `{ round, format, venue, date }` (status computed from matches)
- `settings`: `{ tournament_name, year, nz_team_name, world_team_name }`
- `config`: `{ _id: "admin", pin }` (optional override)

Seed on first boot: 6 NZ + 6 World placeholder players, 3+3+6 = 12 matches, 3 round docs.

## Public API (no auth)
- `GET /api/state` — snapshot (settings, players, matches, rounds, leaderboard)
- `GET /api/rounds` / `/api/players` / `/api/matches` / `/api/leaderboard` / `/api/settings`
- `PATCH /api/matches/{id}` body `{ live_status?, result? }`
- `PATCH /api/players/{id}/self` body `{ player_id, bio?, photo_path? }` — the on-device player updating their OWN profile
- `POST /api/photos-self` multipart `player_id` + `file`
- `WS /api/ws`

## Admin API (Bearer JWT)
- `POST /api/admin/login` body `{ pin }` → `{ token }`
- `PATCH /api/players/{id}` body `{ name?, bio?, photo_path? }`
- `POST /api/photos` multipart (admin upload)
- `PATCH /api/pairings/{round}` body `{ matches: [{ id, nz_player_ids, world_player_ids }] }`
- `PATCH /api/rounds/{round}` body `{ format?, venue?, date? }`
- `PATCH /api/settings` body partial Settings
- `POST /api/admin/change-pin` body `{ new_pin }`

## Scoring
WIN = 1 pt, HALVED = 0.5 pt each, LOSS = 0. Cup winner declared only after all 12 match results are entered.

## PWA / Installation
`app.json` configured with dark `userInterfaceStyle`, `#07111f` theme, iOS photo-usage descriptions, Android permissions. Web preview installable to iPhone home screen via Safari → Share → Add to Home Screen.

## Admin PIN
Default **1926**; see `/app/memory/test_credentials.md`.

## Iteration 3 (Jun 2026)
- Beige (#f1ede1) + navy (#0b1f3a) theme on every screen; banner fully visible at top, scoreboard sits below it
- Pick-player names sorted alphabetically (World left, NZ right)
- Venues: R1 Tairua (Thu 5 Nov), R2 Mercury Bay (Fri 6 Nov), R3 The Dunes Matarangi (Sat 7 Nov)
- New Players tab (photo, name, team, handicap, bio); handicap editable in Bio + admin All Bios

## Iteration 4 (Jun 2026)
- Home names centred; meta "3 ROUNDS • 2 TEAMS • 1 WINNER"
- Rounds page trophy cabinet: 2022 World, 2023 World, 2024 NZ, 2025 World + large 2026 trophy (shows ? until cup_winner, then auto-updates to winning team)
- Leaderboard tab/title renamed "Board"

## Iteration 5 (Jun 2026)
- Trophy cabinet: emoji-only under past trophies; removed 2026 hint
- Custom photo cropper (drag/pinch/zoom buttons) before upload, used in Bio and admin All Bios
- After picking a name, player lands on Bio tab
- Round detail pages: slim ROUND 1/2/3 switcher under scoreboard
- Result buttons show just 🇳🇿 / HALVED / 🌍

## Iteration 6 (Jun 2026)
- New split-flap green/gold "THE SWIFTY CUP" banner (native port of swifty-cup-banner.html, Bebas Neue + IBM Plex Mono via expo-font) on every page incl. pick-player

## Iteration 7 (Jun 2026)
- Big split-flap banner only on opening (pick-player) screen; all other pages use compact 80px "SWIFTY 26’" bar (gold bottom border) with LIVE pill + menu on the right

## Iteration 8 (Jun 2026) — Scores (Stableford)
- New Scores tab: stableford leaderboard (R2, R3, Total, pending, lowest-first default + Wooden Spoon, best-first toggle, countback back9/6/3/1, pull-to-refresh, live via WS) and tap-through hole-by-hole breakdown (/score-player/[id])
- /score-entry: pick round + player, one hole per screen (big -/+, starts at par, Pick up, pts + shots), swipe/Next/Back, sticky running total, Review card, keep-awake
- Offline-first: per-hole edits in AsyncStorage, pending queue, sync every 8s/on foreground, per-hole last-write-wins on server (POST /api/scores/sync), Synced/Waiting indicator
- Admin /score-admin: handicap method (as entered / course handicap), allowance 100/95, per-player PH override, course editor (par/SI/rating/slope)
- Courses seeded: R2 Mercury Bay (71, 68.7/111), R3 The Dunes (72, 72.2/128)
