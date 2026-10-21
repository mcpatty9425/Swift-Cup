Build "The Swifty Cup 2026" as a mobile-first web app (works in iPhone Safari / Android Chrome, installable via Add to Home Screen as a PWA with app name, icon and full-screen display). It's a Ryder-Cup-style golf trip competition: Team NZ 🇳🇿 vs Team World 🌍, 12 players, 3 rounds, 1 winner. Use NZ flag emoji 🇳🇿 and world emoji 🌍 for the teams everywhere. Big tap targets, high contrast, one-handed use outdoors.

LOOK
- Main pages: beige background (#f1ede1), navy text/buttons (#0b1f3a). Team colours: NZ deep blue (#1e3a8a), World burnt orange (#c05a2a), gold accents.
- Opening screen: big split-flap scoreboard banner (dark green #0B3A2D with faint diagonal stripes, gold #F0C766 flip tiles spelling "THE SWIFTY CUP", "2026 SEASON" above, "NZ VS WORLD" below; fonts Bebas Neue + IBM Plex Mono). I will attach the banner HTML file.
- Every other page: slim 80px green bar with gold flip tiles "SWIFTY 26’" and a gold bottom line; a LIVE pill and a three-dot menu on the right. I will attach the compact banner HTML file.
- Scores section uses deep green background, cream text, gold accents, Bebas Neue headings.

OPENING SCREEN (pick your name, only once per device)
- Big banner, then "RYDER CUP STYLE", then "3 ROUNDS • 2 TEAMS • 1 WINNER", then "SELECT YOUR NAME".
- Two columns of name buttons, names centred, alphabetical: Team World on the left, Team NZ on the right.
- Remember the choice on the device. After picking, go to the Bio page. Next time the app opens on Rounds.

PLAYERS (seed these; handicap = index)
Team NZ: Caleb Marshall 13.3, Wade Mackie 13.1, James Burney 2, Noah Burge 14, Taylor Jones 15, Cam Urgert 12
Team World: Patto 14, Zak Nothling 19, Mike Rankin 13, Harry Stead 23, Ally Pally 30, Thomas Clow 22

TABS: Rounds, Board, Scores, Pairings, Players, Bio

1. ROUNDS (home)
- Team scoreboard under the banner: NZ points | "🇳🇿 LEADS / 🌍 LEADS / ALL SQUARE / CUP WINNER" | World points, plus "x / 12 matches".
- Trophy cabinet: 4 small trophies side by side with year and only the emoji: 2022 🌍, 2023 🌍, 2024 🇳🇿, 2025 🌍 (trophy coloured in team colour). Below, a larger 2026 trophy showing "?" that automatically changes to the winning team once all matches have results.
- 3 round cards: Round 1 Alternate Shot – Tairua – Thursday 5th Nov; Round 2 Best Ball – Mercury Bay – Friday 6th Nov; Round 3 Heads Up – The Dunes Matarangi – Saturday 7th Nov. Each shows status pill (UPCOMING / LIVE / COMPLETE), NZ and World points for that round, and "x/y matches". Tap to open that round.
- Round page: scoreboard, then a slim ROUND 1 / ROUND 2 / ROUND 3 switcher the same width as the scoreboard. R1 and R2 have 3 matches (2 v 2), R3 has 6 matches (1 v 1). Each match card: player photos and names (NZ left, World right), VS, a tap-to-edit live status (e.g. "🇳🇿 2 UP thru 14"), and three big buttons: 🇳🇿 / HALVED / 🌍 (tap again to clear). Anyone can update scores, no login. Win = 1 point, halved = 0.5 each.
- Everything updates live on every phone within seconds.

2. BOARD: team totals, round-by-round breakdown, leader / cup winner message.

3. SCORES (individual stableford for Rounds 2 and 3)
Courses (white tees, editable by admin):
- Round 2 – Mercury Bay Golf Club, Whitianga. Par 71, rating 68.7, slope 111. Par/SI by hole: 1 4/5, 2 3/12, 3 4/17, 4 3/18, 5 5/8, 6 3/14, 7 5/9, 8 4/1, 9 5/16, 10 4/13, 11 5/11, 12 3/4, 13 4/2, 14 3/10, 15 4/3, 16 5/6, 17 4/7, 18 3/15
- Round 3 – The Dunes, Matarangi. Par 72, rating 72.2, slope 128. Par/SI: 1 4/8, 2 4/6, 3 5/16, 4 4/10, 5 3/4, 6 4/2, 7 3/18, 8 4/12, 9 4/14, 10 5/13, 11 3/11, 12 4/9, 13 4/3, 14 5/5, 15 4/1, 16 4/17, 17 5/7, 18 3/15
Admin settings: handicap method "Use handicap as entered" or "Calculate course handicap" (index × slope / 113 + (rating − par), rounded), allowance 100% (default) or 95%. Playing handicap per player per round is calculated and can be overridden by admin.
Score entry (anyone, no login): pick round and name, ONE HOLE PER SCREEN with hole number, par and stroke index large at top; score starts at par with huge − and + buttons and a "Pick up" button (0 points); under the score show stableford points for the hole and shots received. Swipe or Next/Back. Sticky bar "14 pts · 6/18". "Review card" lists all 18 holes (gross + points), tap to fix. Keep screen awake. Auto-save every hole and work OFFLINE: store on the phone and sync when signal returns, with a "Synced / Waiting for signal" indicator. Never lose a score.
Stableford: strokes on hole = floor(PH/18) + (1 if SI <= PH mod 18); net = gross − strokes; points = max(0, 2 + par − net); pick up = 0. Check: PH 14, par on every hole = 50 pts; bogey every hole = 32.
Leaderboard: all 12 players with R2, R3, Total; "pending" if a round isn't entered; pull to refresh and auto-update; default lowest total first with a "Wooden Spoon" badge on last place; toggle to best first; ties by countback (back 9, last 6, last 3, last hole); tap a player for hole-by-hole breakdown.

4. PAIRINGS: everyone can view pairings by round; only admin can edit (dropdown per slot, warning if a player is used twice in a round, confirm if the match already has a result, Save Changes button). Changing pairings never wipes scores.

5. PLAYERS: Team World / Team NZ switch; cards with photo, name, team, handicap and bio (alphabetical).

6. BIO: the signed-in player edits their own photo, handicap and bio; "Switch player" link. Photo upload opens a crop screen (drag, pinch/zoom, + / − buttons, reset) and saves a square photo. Store photos in proper cloud storage, resized for speed.

ADMIN
- No accounts. Admin unlocks with PIN 1926 from the three-dot menu (Admin Login / Logout).
- Admin menu: All Bios (edit anyone's name, bio, handicap, photo), Scores Setup (handicap method, allowance, playing-handicap overrides, course editor), pairings editing, round venue/date editing.
