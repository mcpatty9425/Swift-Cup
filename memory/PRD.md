# The Swifty Cup 2026 — PRD

## Summary
Mobile-first (Expo React Native) Ryder-Cup-style golf competition app for Team NZ 🇳🇿 vs Team World 🌍. Public users browse teams and update live scores; the organiser (PIN 1926) manages players and pairings.

## Stack
- **Frontend**: Expo SDK 57 (expo-router, expo-image, expo-image-picker, expo-image-manipulator, @react-native-vector-icons/ionicons, @tanstack/react-query, react-native-safe-area-context)
- **Backend**: FastAPI + Motor (async MongoDB) on `/api/*`
- **Auth**: PIN → JWT (HS256). PIN default `1926`, overridable via `/api/admin/change-pin`.
- **Realtime**: WebSocket `/api/ws` broadcasts `match_updated`, `player_updated`, `pairings_changed`, `settings_changed` events. Client invalidates React Query cache on any message.
- **Storage**: Emergent Managed Object Storage for player photos (`/api/photos` upload, `/api/photos/{path}` fetch).

## Data Model (MongoDB)
- `players`: `{ id, team: "NZ"|"WORLD", name, bio, photo_path, order }`
- `matches`: `{ id, round: 1|2|3, index, nz_player_ids[], world_player_ids[], live_status, result: "NZ_WIN"|"HALVED"|"WORLD_WIN"|null, updated_at }`
- `settings`: `{ tournament_name, year, nz_team_name, world_team_name }`
- `config`: `{ _id: "admin", pin }` (optional override)

Seeded on first boot: 6 placeholder NZ players, 6 World, 3+3+6 = 12 matches.

## Rounds
- **R1 Alternate Shot** — 3 matches, 2v2
- **R2 Best Ball** — 3 matches, 2v2
- **R3 Heads Up** — 6 matches, 1v1
- Points: WIN=1, HALVED=0.5 each, LOSS=0. Cup winner declared only when all 12 matches have a result.

## Public API (no auth)
- `GET /api/state` — full snapshot (settings + players + matches + leaderboard)
- `GET /api/players` / `GET /api/matches` / `GET /api/leaderboard` / `GET /api/settings`
- `PATCH /api/matches/{id}` body: `{ live_status?, result? }`
- `WS /api/ws`

## Admin API (Bearer JWT)
- `POST /api/admin/login` body `{ pin }` → `{ token }`
- `PATCH /api/players/{id}` body `{ name?, bio?, photo_path? }`
- `POST /api/photos` multipart `player_id` + `file`
- `PATCH /api/pairings/{round}` body `{ matches: [{ id, nz_player_ids, world_player_ids }] }`
- `PATCH /api/settings` body partial Settings
- `POST /api/admin/change-pin` body `{ new_pin }`

## Screens
- **Teams** (`/teams`) — hero banner + scoreboard + NZ/World segmented list of player cards
- **R1 / R2 / R3** — match cards with 2 or 1 players per side, VS divider, tap-to-edit live status, three big result buttons (🇳🇿 WIN / HALVED / 🌍 WIN)
- **Admin: Bios** — list players, bottom sheet to edit name/bio, upload/replace/remove photo
- **Admin: Pairings** — round segmented control, slots with dropdown picker, duplicate warning (red border), confirmation dialog if a touched match already has a result, sticky Save bar

## PWA / Installation
- `app.json` configured with proper name, dark `userInterfaceStyle`, `#07111f` theme, iOS photo-usage descriptions, Android permissions.
- Web preview is installable to iPhone home screen via Safari → Share → Add to Home Screen.

## Admin PIN
- Default **1926**; change via `/api/admin/change-pin` (see test_credentials.md).

## Known Tradeoffs
- Admin role is PIN-based (per user request) rather than full email/password Supabase Auth.
- Photos are stored via Emergent Object Storage; the backend proxies reads at `/api/photos/{path}` so the key never ships in the app.
