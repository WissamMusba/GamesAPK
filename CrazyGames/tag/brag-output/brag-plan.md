# BRAG PLAN — TAG!

## The game (one sentence)
TAG! is a free browser tag game: 2–4 players on one keyboard, up to 10 online, with bots that hunt you.

- **Who / what for:** friends sharing a keyboard, casual browser/portal players, anyone who wants instant multiplayer with zero setup.
- **Sets it apart:** real online rooms (6-letter codes + invite links) in a canvas tag game; bot AI with hunt/flee roles; 6 playable modes (party, bomb, crown, CTF, infection, hunter); map editor; runs anywhere.
- **Funniest / most impressive claim:** the bots are better at tag than your friends.
- **Visual hook:** giant "TAG!" slam → real chase footage with the IT arrow.
- **Show:** the actual menu (mode chips, player cards) + real gameplay (bots mid-chase).
- **Tone:** `default` — punchy, playful, clean. The game's own voice (emoji, chunky type, "SMUGGLERS CATACOMBS").
- **Share caption:** "TAG! — 2-4 player couch tag + online rooms, 6 modes, and bots that hunt. you're it. 🏷️"

## Storyboard (20s, 1920×1080, 30fps = 600 frames)

Music: bundled `happy-beats-business-moves-vol-1` (120 BPM), sliced 3.02s → 23.02s.
Scene cuts sit on the track's beat grid (0.5s spacing): 2.5 / 6.0 / 10.0 / 14.0s.

| # | Time | Scene | Visual | Text | SFX |
|---|------|-------|--------|------|-----|
| 1 | 0.0–2.5 | HOOK | #0b0f16 bg + vignette. "TAG!" slams scale 3→1 w/ overshoot (0.35–0.6s), settles. Subline slides up at 0.9s. | TAG! / YOU'RE IT. | heavy thump @0.45s, click @0.9s |
| 2 | 2.5–6.0 | REVEAL | Real menu screenshot full-bleed, slow zoom 1.00→1.08. Dip-through-bg transition (8f). Caption chip pops @3.1s. | 2–4 PLAYER COUCH TAG | soft whoosh @2.5s, click @3.1s |
| 3 | 6.0–10.0 | HIGHLIGHT 1 | Real gameplay (4-bot chase) slow pan L→R. Dip transition. Caption @6.6s. | BOTS THAT HUNT YOU | whoosh @6.0s, click @6.6s |
| 4 | 10.0–14.0 | HIGHLIGHT 2 | Real gameplay (arena + pads) slow zoom toward action. Dip transition. Caption @10.6s. | 6 MODES • ONLINE ROOMS | whoosh @10.0s, click @10.6s |
| 5 | 14.0–20.0 | OUTRO | #0b0f16 bg. "TAG!" gently pulsing. Lines land @14.6s and @16.2s, hold to end. | GRAB 3 FRIENDS. RUN. / PLAY FREE IN YOUR BROWSER | bell payoff @14.6s, soft tick @16.2s |

## Creative checks
- Short: 20.0s. Readable: every caption holds ≥3s. Specific: real menu copy ("SMUGGLERS CATACOMBS" visible in reveal zoom), real HUD, real mode count. Show the thing: 3 of 5 scenes are raw game footage. Hook first 2s. No invented claims (6 modes = party/bomb/crown/ctf/infection/hunter; "up to 10 online" per MAXP — kept out of captions, mentioned in share copy only… actually share copy says 2-4 + online rooms, safe).
- Poster: strongest settled frame — gameplay chase w/ caption OR outro title. Decide after still review.

## Build
`work/build_video.py` (PIL + numpy + imageio-ffmpeg) → silent mp4 → ffmpeg mux (music slice + fades + SFX mix, AAC) → `brag.mp4`. Poster = chosen settled frame → `brag.jpg`, baked as frame 0 (replace, not prepend). `share-copy.txt` written.
