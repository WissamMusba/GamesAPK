# GAME RECREATION GUIDELINE
## Working Title: Crown Blocks — Premium 8×8 Block Puzzle

> **Purpose:** This document is a production-grade specification for building an original mobile block-placement puzzle inspired by the gameplay qualities visible in the supplied screenshots and by public information about the referenced `com.block.juggle` game.
>
> **Important IP boundary:** Recreate the *gameplay category and user-experience principles*, not copyrighted source code, proprietary assets, logos, characters, exact branding, or a pixel-for-pixel copy of another developer's presentation. Use an original title, logo, icons, block artwork, effects, sounds, and visual identity. The supplied screenshots are a visual-quality reference only.

---

# 1. Product Goal

Build a highly polished, small, fast, offline-first 8×8 block puzzle for Android that feels premium on first launch and remains smooth on 2021-era mid-range phones.

The game must prioritize:

1. Instant startup.
2. Immediate understanding of the board.
3. Extremely responsive touch input.
4. Satisfying placement feedback.
5. Satisfying line-clearing explosions.
6. Three-piece strategic planning.
7. No mandatory time pressure in the core mode.
8. Excellent readability.
9. Small installation size.
10. Low memory consumption.
11. Offline play.
12. Optional monetization that does not interrupt normal puzzle flow excessively.
13. A cosmetic coin economy that can later support block skins and clear effects.
14. A premium-looking menu/UI system that is visually stronger than the supplied reference without copying its branding.

---

# 2. Reference Research Summary

The supplied Google Play URL identifies package `com.block.juggle`. Public app-indexing sources currently associate that package with Block Blast by Hungry Studio and report a very large installed/reviewed user base. Current public listings describe an 8×8 block puzzle with colorful blocks, row/column clearing, combos, offline play, and additional modes/features. Exact proprietary generator weights and exact scoring implementation are not publicly documented, so this specification deliberately distinguishes **observed/public behavior** from **implementation recommendations**.

The reference screenshots show:

- Portrait mobile presentation.
- Blue full-screen game background.
- Large central 8×8 board.
- Dark navy board cells.
- Bright beveled blocks.
- Three available pieces below the board.
- Large white score near the top center.
- Crown/high-score presentation at top left.
- Settings gear at top right.
- Strong yellow/orange promotional text in some reference screens.
- Strong use of cyan, green, orange/red, yellow, blue and purple pieces.
- Subtle shadows and highlights.
- Particle effects during clears.
- A placement preview/ghost area.
- Pieces that can be lifted upward toward the board while the player's finger remains lower on the screen.

Public descriptions also consistently describe the core as placing blocks on an 8×8 board and clearing completed rows or columns. Community/solver research independently confirms the important structural behavior: three pieces are presented at a time, pieces do not rotate in the common ruleset, and placement order can matter because a clear changes the board before the next piece is placed.

**Do not treat third-party scoring websites as authoritative for exact official scoring.** Published formulas disagree with each other and with one another about exact values. Implement scoring as a configurable data-driven system so the values can be tuned after playtesting.

---

# 3. Design Pillars

## 3.1 Relaxing

The core game should be playable without a countdown timer.

## 3.2 Strategic

The player should consider all three available pieces before committing to a placement.

## 3.3 Tactile

Every interaction should communicate immediately through motion, sound, scale, particles and haptics.

## 3.4 Readable

Effects must never make it difficult to understand which cells are occupied.

## 3.5 Premium

The game should feel polished enough that the player assumes a professional studio made it.

## 3.6 Lightweight

Visual quality should come from smart gradients, geometry, animation and compositing rather than enormous image assets.

## 3.7 Fair

Piece generation must never intentionally create frustrating impossible situations merely to push ads or purchases.

---

# 4. Target Platform

## 4.1 Primary

Android phones.

## 4.2 Baseline Device

Design and performance-test against a representative 2021 mid-range Android device:

- 4 GB RAM.
- 1080p-class display.
- 60 Hz display.
- Mid-range ARM CPU.
- Mid-range mobile GPU.
- Android 10–12 class software environment.

## 4.3 Minimum Practical Target

Recommended initial support:

- Android 8.0+.
- ARM64.
- Portrait orientation.
- 60 FPS target.
- 30 FPS graceful fallback on stressed devices.

If broader OS support is later required, add it after the gameplay/performance baseline is stable.

---

# 5. Recommended Engine

## 5.1 Default Recommendation

Use **Unity** for the first production version if the chosen coding model can reliably generate and maintain Unity C# projects.

Reasons:

- Mature Android pipeline.
- Strong 2D/UI tooling.
- Easy touch handling.
- Good animation tooling.
- Addressable/asset-loading options.
- Reliable analytics/ad SDK ecosystem.
- Easy AAB builds.
- Straightforward profiling.

## 5.2 Alternative

Godot is acceptable if:

- The project remains primarily 2D.
- The chosen model is significantly more reliable with Godot.
- Android export is tested early.

## 5.3 Do Not Build

Do not use a heavyweight 3D architecture for this game.

The board is fundamentally a 2D interaction surface with pseudo-3D visual styling.

---

# 6. Core Game Definition

## 6.1 Board

Exactly:

- 8 columns.
- 8 rows.
- 64 cells.

## 6.2 Gravity

None.

Placed blocks stay where the player puts them.

## 6.3 Piece Tray

Three pieces are available at a time.

## 6.4 Rotation

No rotation in the default classic ruleset.

Each piece is supplied in its intended orientation.

## 6.5 Placement

A piece can be placed when every occupied cell maps to an empty board cell.

## 6.6 Clear Trigger

After a valid placement:

1. Occupy the relevant cells.
2. Detect completed rows.
3. Detect completed columns.
4. Mark all cells belonging to completed lines.
5. Play clear feedback.
6. Remove those cells.
7. Update score/combo/objectives.
8. Evaluate the remaining board.
9. If all three current pieces have been consumed, generate the next three.
10. Check game-over feasibility.

## 6.7 Game Over

Game over occurs when none of the remaining available pieces can legally fit.

Do not simply check whether the board looks full.

A board with many empty cells can still be functionally dead if those cells cannot accommodate any current shape.

---

# 7. Coordinate System

Use a deterministic integer board coordinate system.

```text
row: 0..7
column: 0..7
```

Top-left is `(0,0)`.

A piece should be represented as occupied cell offsets relative to its bounding-box origin.

Example 2×2:

```text
11
11
```

Example vertical 3:

```text
1
1
1
```

Example L:

```text
10
10
11
```

Do not use world-space floating-point coordinates for game logic.

World/UI positions are presentation only.

---

# 8. Piece Representation

Each piece should contain:

- Unique ID.
- Shape ID.
- Cell offsets.
- Width.
- Height.
- Cell count.
- Visual color family.
- Theme skin.
- Shadow parameters.
- Allowed modes.
- Difficulty weight.
- Generation weight.
- Minimum/maximum board-density suitability.

Example conceptual data:

```text
PieceDefinition
    id
    shapeId
    cells[]
    width
    height
    cellCount
    colorFamily
    baseScore
    generationWeight
    adventureAllowed
```

---

# 9. Initial Shape Library

Start with a compact shape library.

## 9.1 Single Cell

```text
1
```

## 9.2 Two Horizontal

```text
11
```

## 9.3 Two Vertical

```text
1
1
```

## 9.4 Three Horizontal

```text
111
```

## 9.5 Three Vertical

```text
1
1
1
```

## 9.6 Four Horizontal

```text
1111
```

## 9.7 Four Vertical

```text
1
1
1
1
```

## 9.8 Five Horizontal

```text
11111
```

## 9.9 Five Vertical

```text
1
1
1
1
1
```

## 9.10 2×2 Square

```text
11
11
```

## 9.11 3×3 Square

```text
111
111
111
```

## 9.12 Small L

```text
10
11
```

## 9.13 Mirrored Small L

```text
01
11
```

## 9.14 3-Cell L

```text
10
10
11
```

## 9.15 Mirrored 3-Cell L

```text
01
01
11
```

## 9.16 T

```text
111
010
```

## 9.17 T Variant

```text
010
111
```

## 9.18 Z

```text
110
011
```

## 9.19 S

```text
011
110
```

## 9.20 Corner Shapes

Include 3-cell and 4-cell corner variants.

---

# 10. Piece Generation Philosophy

## 10.1 Do Not Use Naive Uniform Random

A mathematically uniform random shape generator often feels terrible.

It can produce:

- Too many large shapes.
- Repeated identical shapes.
- Trays with three nearly identical pieces.
- Trays where no meaningful placement is possible.
- Long runs of awkward shapes.
- Difficulty spikes caused by luck rather than strategy.

## 10.2 Use Weighted Randomness

Use a weighted candidate pool.

Example starting weights:

```text
1 cell          5
2-cell lines    7
3-cell lines    9
4-cell lines    8
5-cell lines    3
2x2             9
3x3             2
small L         8
large L         6
T               5
S/Z             5
other variants  4
```

These are tuning defaults, not claims about the original game's proprietary algorithm.

## 10.3 Board-Aware Generation

The generator should inspect:

- Empty-cell count.
- Number of legal placements for each candidate.
- Number of current-piece legal placements.
- Number of 3×3 openings.
- Number of 1×1 isolated holes.
- Recent shape history.
- Recent colors.
- Current streak.
- Mode difficulty.
- Adventure objective requirements.

## 10.4 Fairness Filter

Generate a candidate tray.

Evaluate it.

Reject and regenerate if:

- All three pieces have zero legal placements.
- The candidate causes an unreasonable difficulty spike.
- The tray is redundant.
- Adventure objective progress becomes impossible.
- The game is in an early tutorial stage and the shapes are too complex.

The filter should have a maximum regeneration count to avoid CPU spikes.

## 10.5 Do Not Guarantee Infinite Survival

The game should still permit game over.

The purpose is to reduce *bad luck frustration*, not eliminate failure.

---

# 11. Candidate Scoring for Piece Generation

For each candidate piece calculate:

```text
fitScore
+ boardCoverageScore
+ objectiveScore
+ varietyScore
+ difficultyScore
- repetitionPenalty
- deadEndRisk
```

Normalize the result.

Use weighted random selection among high-quality candidates.

Never expose this algorithm to the player.

---

# 12. Three-Piece Tray Rules

Each turn shows exactly three pieces.

A piece disappears from the tray immediately after successful placement.

When all three are consumed:

- Animate the tray.
- Generate three new pieces.
- Stagger their entrance by approximately 60–120 ms.
- Play a very subtle spawn sound.
- Avoid blocking input during the entire transition.

Do not force the player to wait for an unnecessarily long animation.

---

# 13. Piece Ordering

Players may place pieces in any order.

This is important.

Do not force:

```text
Piece 1 → Piece 2 → Piece 3
```

Instead permit:

```text
Piece 2 → Piece 1 → Piece 3
```

etc.

Placement order matters because clearing a row/column immediately changes the board before the next piece.

---

# 14. Touch Interaction

This is one of the highest-priority systems.

The reference screenshot's elevated piece behavior should be recreated as an original polished interaction.

## 14.1 Tap/Grab

When the finger touches a tray piece:

- Detect the selected piece.
- Immediately lift it visually.
- Scale it slightly up.
- Add a soft shadow.
- Move it toward a comfortable touch offset above the finger.
- Do not require the user to drag the piece all the way to the board from its original visual position.

## 14.2 Finger-Offset Placement

The player's finger should remain below the visible piece.

Recommended:

```text
visiblePieceCenterY = fingerY - 90dp
```

Adjust based on screen size.

For larger pieces:

```text
visiblePieceCenterY = fingerY - 105dp
```

For smaller pieces:

```text
visiblePieceCenterY = fingerY - 80dp
```

Clamp the piece so it never leaves the usable screen area.

## 14.3 Why This Matters

The player must be able to see:

- The board.
- The target cells.
- The piece itself.
- The finger.

Without the elevated piece, the finger covers the intended placement area.

## 14.4 Snap-to-Grid

When the piece approaches a legal board location:

- Snap the ghost to the nearest valid grid anchor.
- Highlight occupied destination cells.
- Use a subtle scale/bounce.
- Do not make the snap feel magnetic enough to steal control.

## 14.5 Invalid Placement

If placement is invalid:

- Ghost becomes slightly translucent/red-tinted.
- Do not shake aggressively.
- Play a quiet error tick only on release or after a short dwell.
- Return the piece smoothly to its tray slot.

---

# 15. Drag Feel

The input should feel almost instantaneous.

Target:

- Touch-to-lift latency: under one frame where practical.
- No visible input lag.
- No physics-based dragging.
- No Rigidbody dependency.
- No expensive raycast stack.

Use a deterministic UI/canvas touch system.

---

# 16. Placement Animation

When a piece lands:

1. Piece snaps into the cell.
2. Scale briefly to 1.04.
3. Return to 1.0.
4. Add tiny downward compression.
5. Spawn a 1–3 particle contact burst.
6. Play a soft click/thunk.
7. Resolve clears immediately after placement feedback begins.

Keep the animation under approximately 180 ms.

---

# 17. Board Presentation

The board is the visual centerpiece.

## 17.1 Shape

Square.

## 17.2 Cell Grid

Use subtle dark lines between cells.

Avoid heavy borders.

## 17.3 Board Container

Use:

- Rounded or softly chamfered outer frame.
- Very dark navy interior.
- Subtle inset shadow.
- Minimal bevel.

## 17.4 Empty Cells

Empty cells should be visible but quiet.

They should never compete with occupied blocks.

---

# 18. Reference Screenshot Proportions

The supplied 960×1536 portrait screenshots show approximately:

- Large blue background.
- Board centered horizontally.
- Board occupying roughly 70–75% of the screen width.
- Score above the board.
- Piece tray below the board.
- Bottom promotional area below the tray.

Use responsive layout rather than hard-coded pixels.

Recommended portrait structure:

```text
Top safe area       7%
Header              9%
Score              11%
Board              48–52%
Piece tray         11–13%
Footer / CTA        8–12%
```

Exact values should be derived dynamically from available height.

---

# 19. Responsive Layout

Support:

- 16:9.
- 18:9.
- 19.5:9.
- 20:9.
- Tall modern Android screens.
- Shorter 2021 devices.

Do not stretch the board.

Keep the board square.

Use a maximum board width:

```text
min(
    availableWidth - horizontalMargins,
    availableHeight * boardHeightRatio
)
```

---

# 20. Safe Areas

Respect:

- Notches.
- Punch-hole cameras.
- Navigation bars.
- Gesture navigation.
- Status bar overlap.

The board must never be obscured by system UI.

---

# 21. Color Direction

The supplied screenshots use a blue/purple-blue environment.

Use an original palette inspired by that visual category.

Recommended starting palette:

```text
Background        #4658A9
Background Deep   #34458E
Board              #222C55
Grid               #1C2548
White Text         #F7FAFF
Gold               #FFC928
Cyan               #27D4E9
Green              #25D64A
Orange             #FF651B
Purple             #9B4DEB
Blue               #3579F6
Red                #F13D3D
```

Treat these as tuning references, not immutable requirements.

---

# 22. Block Visual Design

Blocks should have a pseudo-3D beveled appearance.

Each block can be built from:

1. Base rectangle.
2. Bright top/left bevel.
3. Dark bottom/right bevel.
4. Subtle internal gradient.
5. Soft drop shadow.
6. Tiny specular highlight.

Do not use a unique large PNG for every block.

Prefer a reusable procedural/UI material or a small atlas.

---

# 23. Block Bevel

The bevel should be visible but not exaggerated.

Recommended:

- 8–12% of cell size.
- Bright upper-left edge.
- Dark lower-right edge.
- Slightly rounded corners if the visual language supports it.

---

# 24. Block Shadow

Use a cheap soft shadow.

Do not use expensive real-time lighting.

A small precomputed shadow or shader effect is preferable.

---

# 25. Block Highlight

When placed:

- Brighten 8–12%.
- Scale 1.04.
- Return to normal.
- Highlight duration: 70–120 ms.

---

# 26. Block Skins

Architecture must support cosmetic skins later.

Skin data should define:

```text
skinId
displayName
baseMaterial
highlightMaterial
shadowMaterial
particleTheme
clearEffect
rarity
price
```

The default skin must always be free.

---

# 27. Color Assignment

Color should communicate visual variety, not gameplay ownership.

Rows and columns clear regardless of color.

Do not accidentally turn the game into a match-colors game.

Use color families to make pieces visually distinct.

---

# 28. Score UI

The score should be the most prominent text element.

Reference-inspired hierarchy:

```text
Small high-score indicator
Large current score
Board
```

Use a bold rounded display font.

Avoid excessively thin fonts.

---

# 29. Score Animation

When score increases:

- Number rolls/ticks upward.
- Small scale punch.
- Optional glow.
- Duration 150–300 ms.

For large combo rewards:

- Larger scale punch.
- Gold/cyan accent.
- Particle burst.

---

# 30. Best Score / Crown

Instead of copying the reference crown exactly, create an original trophy/crown icon.

Display:

```text
[Trophy Icon] 1932
```

or:

```text
[Small Crown] BEST 1932
```

Use a compact top-left presentation.

---

# 31. Settings Button

Top-right gear.

Requirements:

- Large enough touch target.
- At least ~44dp equivalent.
- Light color against blue.
- Subtle idle animation optional.
- No constant spinning.

Tap:

```text
Settings modal
```

---

# 32. Settings Menu

Include:

- Sound.
- Music.
- Haptics.
- Notifications.
- Reduced effects.
- High contrast.
- Language.
- Restore purchases.
- Privacy.
- Terms.
- Support.
- Version number.

Keep settings lightweight.

---

# 33. Pause Menu

Classic mode can use a pause button if desired.

Pause overlay:

- Continue.
- Restart.
- Settings.
- Exit to menu.

Do not put ads inside the active puzzle board.

---

# 34. Game Start

Target launch-to-interaction:

**as close to 1–2 seconds as practical on the baseline device.**

Do not preload unnecessary future content.

The classic game should require almost no external assets.

---

# 35. Main Menu

The main menu should look premium and original.

Recommended hierarchy:

```text
Logo
Subtitle
Play
Adventure
Daily Challenge
Store
Settings
```

The Play button should be the strongest call to action.

---

# 36. Main Menu Background

Use a lightweight animated background.

Example:

- Blue gradient.
- Tiny floating particles.
- A few slowly moving block silhouettes.
- Very subtle parallax.

Do not use a full-screen video.

---

# 37. Menu Logo

Create an original logo.

Design direction:

- Friendly.
- Rounded.
- Bright.
- Slight pseudo-3D.
- One distinctive trophy/crown motif if desired.

Do not reproduce the reference logo typography or exact arrangement.

---

# 38. Button Style

Buttons:

- Rounded rectangle.
- Strong contrast.
- Slight top highlight.
- Bottom shadow.
- 1–2 px inner border.
- Press animation.

Press:

```text
scale 1.00 → 0.96 → 1.00
```

Duration:

```text
80–140 ms
```

---

# 39. Main Game Loop

The complete loop:

```text
Launch
↓
Main Menu
↓
Choose Classic / Adventure / Daily
↓
Generate Board
↓
Generate 3 Pieces
↓
Player selects piece
↓
Piece lifts
↓
Player drags
↓
Ghost preview
↓
Valid placement
↓
Placement animation
↓
Line detection
↓
Clear animation
↓
Score/combo update
↓
Objective update
↓
Check remaining pieces
↓
Generate next tray when appropriate
↓
Continue
↓
Game over / Level complete
↓
Results
↓
Reward / Replay / Next
```

---

# 40. Line Detection

After every placement:

```pseudo
completedRows = []
completedColumns = []

for row in 0..7:
    if every cell occupied:
        completedRows.add(row)

for column in 0..7:
    if every cell occupied:
        completedColumns.add(column)
```

Then:

```pseudo
clearSet = union(completedRows, completedColumns)
```

A cell that belongs to both a completed row and column must be removed only once.

---

# 41. Clear Timing

Recommended sequence:

```text
0 ms      placement completes
20 ms     completed cells highlight
60 ms     cells pulse
100 ms    blast begins
140 ms    cells disappear
200 ms    particles finish first burst
250 ms    board settles visually
```

Do not introduce unnecessary waits.

---

# 42. Clear Animation

This is one of the most important polish systems.

When a line clears:

- Brief white/cyan flash.
- Blocks compress inward slightly.
- Each cell emits a small square particle.
- Particles travel outward.
- Cells scale down.
- Alpha fades.
- Optional line sweep travels across the row/column.
- Score popup appears.

---

# 43. Double Clear

If two or more lines clear simultaneously:

- Use stronger flash.
- Larger particle burst.
- Bigger score popup.
- Add a combo label.

Example:

```text
DOUBLE BLAST!
+240
```

Do not use exact reference text.

---

# 44. Multi-Line Clear

For 3+ simultaneous lines:

- Increase particle count modestly.
- Increase sound pitch/impact.
- Increase score number scale.
- Add camera/UI micro-shake.

Avoid excessive screen shake.

---

# 45. Full Board Clear

If the board is completely cleared:

- Freeze gameplay for approximately 100 ms.
- White/cyan flash.
- Large burst.
- Confetti or geometric particles.
- Special sound.
- Big reward.
- Restore input quickly.

---

# 46. Combo System

Implement configurable combo rules.

Recommended original rules:

- A placement that clears one or more lines continues the combo.
- A placement that clears no line resets the combo.
- Consecutive clearing placements increase combo level.
- Combo bonus is additive, not an uncontrollable multiplier.

Example:

```text
combo 1 = +0
combo 2 = +20
combo 3 = +40
combo 4 = +70
combo 5 = +100
combo 6+ = +130
```

These values should be data-driven and playtested.

---

# 47. Streak Presentation

Show a small streak indicator only when useful.

Example:

```text
🔥 4 STREAK
```

Animation:

- Slide in.
- Tiny bounce.
- Fade or hold.
- Update number.

Do not keep it permanently huge on screen.

---

# 48. Score Configuration

Create a `ScoreConfig` asset.

Parameters:

```text
placementBase
lineBase
multiLineBonus
comboBonusCurve
fullBoardBonus
adventureObjectiveBonus
dailyBonus
```

Never hard-code these values throughout gameplay scripts.

---

# 49. Game State Machine

Use explicit states:

```text
Boot
MainMenu
StartingGame
PlayerInput
PieceHeld
PieceDragging
ResolvingPlacement
ResolvingClear
GeneratingPieces
LevelComplete
GameOver
Results
Paused
```

Do not rely on scattered booleans.

---

# 50. Board Data Model

Use a compact 8×8 representation.

Preferred:

```text
byte[64]
```

where:

```text
0 = empty
1..N = occupied/color/type
```

For logic, occupancy can be a bitboard.

An 8×8 board can fit naturally into a 64-bit integer.

Use bit operations for:

- Row completion.
- Column completion.
- Occupancy.
- Legal placement tests.

---

# 51. Performance: Bitboard Option

For a highly optimized implementation:

```text
boardRows[8] : 8-bit occupancy masks
```

Then a completed row is:

```text
boardRows[r] == 0b11111111
```

Columns can be evaluated with precomputed masks or bitwise transforms.

This is extremely cheap on mobile.

---

# 52. Piece Collision

Never use physics colliders for logical placement.

Logical collision:

```pseudo
for cell in piece.cells:
    boardIndex = anchor + cell.offset
    if outside board:
        invalid
    if occupied:
        invalid
```

Physics should not decide whether a piece fits.

---

# 53. Visual Board vs Logic Board

Keep them separate.

```text
BoardModel
    authoritative game state

BoardView
    visual cells

PieceModel
    shape data

PieceView
    animated visual representation
```

This prevents animation from corrupting gameplay logic.

---

# 54. Object Pooling

Pool:

- Block views.
- Particles.
- Score popups.
- Combo labels.
- Clear effects.
- Floating coins.
- Menu particles.

Do not instantiate/destroy dozens of objects every clear.

---

# 55. Particle Budget

Baseline target:

- 50–120 particles during a normal clear.
- 150–250 for a large clear.
- Avoid thousands.

Use tiny meshes or sprites.

Particles should be short-lived.

---

# 56. Shader Budget

Keep shaders simple.

Preferred:

- Unlit.
- Simple UI.
- One/two texture samples.
- Optional vertex color.
- No expensive screen-space effects.

Avoid:

- Real-time reflections.
- Multiple full-screen blur passes.
- Complex distortion.
- Expensive bloom.
- Real-time shadows.

---

# 57. Lighting

Do not use dynamic 3D lights.

Fake lighting with:

- Gradients.
- Bevel geometry.
- Vertex colors.
- Simple shader highlights.

This provides the visual appearance at much lower cost.

---

# 58. Texture Budget

Use texture atlases.

Target:

- UI atlas: 1024×1024 maximum where practical.
- Block atlas: 512×512 or procedural.
- Effects atlas: 512×512.
- Avoid many unique textures.

Use compressed formats appropriate to Android.

Do not import every screenshot as an in-game asset.

---

# 59. App Size Goal

Initial target:

**under 25 MB compressed AAB/APK-equivalent content if practical.**

Stretch target:

**under 15–20 MB** for the core offline game.

Do not sacrifice required quality merely to hit an arbitrary number.

---

# 60. Asset Rules

Never ship:

- Original screenshots.
- Reference promotional images.
- Huge uncompressed PNG collections.
- Duplicate sprites.
- Unused fonts.
- Unused audio.
- Source project files.

Generate or compress everything intentionally.

---

# 61. Audio Design

Use a tiny sound library.

Required:

- Piece pickup.
- Piece drag.
- Placement.
- Invalid placement.
- Single clear.
- Multi-clear.
- Combo.
- Button click.
- Level success.
- Game over.
- Reward.
- Coin collection.

Keep most effects short.

---

# 62. Audio Compression

Use compressed mobile-friendly audio.

Avoid long uncompressed WAV files.

Music should use looping compressed tracks.

---

# 63. Haptics

Optional but recommended.

Use:

- Light tap on placement.
- Medium impact on clear.
- Stronger impact on multi-clear.
- Celebration on full-board clear.

Respect the user's haptic setting.

---

# 64. Accessibility

Include:

- Reduced effects.
- Reduced haptics.
- High-contrast mode.
- Text scaling where practical.
- Color-independent UI communication.
- Clear button states.

Do not make success depend only on color.

---

# 65. Classic Mode

Classic mode is the primary endless mode.

Rules:

- Empty board.
- Three pieces.
- Place indefinitely.
- Clear rows/columns.
- Score continuously.
- Game ends when no current piece fits.
- Save personal best locally.

---

# 66. Classic Mode Restart

Restart should be instant.

Do not reload the entire Unity scene if avoidable.

Reset:

- Board model.
- Score.
- Combo.
- Tray.
- Particles.
- Objective state.
- Random seed state.

---

# 67. Seeded Randomness

Use a deterministic seed for:

- Daily challenges.
- Debugging.
- Replays.
- Level generation.
- QA.

Classic endless mode can use a random seed generated at game start.

---

# 68. Adventure Mode

Adventure mode should provide finite levels with visual variety.

Important:

Do not claim to reproduce every proprietary level of the reference app.

Instead create an original progression system that delivers the same *category* of increasing challenge.

---

# 69. Adventure Level Structure

Each level contains:

```text
levelId
themeId
startingBoard
pieceGenerationProfile
objectiveType
objectiveTarget
moveLimit
difficulty
rewardCoins
completionStars
```

---

# 70. Adventure Objective Types

Start with:

1. Reach score.
2. Clear X lines.
3. Clear X rows.
4. Clear X columns.
5. Clear X total cells.
6. Achieve X combo.
7. Clear X lines in one move.
8. Complete level within X placements.
9. Finish with at least X empty cells.
10. Clear marked target cells.
11. Collect embedded gems.
12. Clear a target color only if color-specific gameplay is explicitly added as a separate mechanic.
13. Remove blockers.
14. Complete a shaped target.
15. Survive X placements.

---

# 71. Adventure Board Layouts

Use handcrafted initial board masks.

Each level should define:

- Occupied cells.
- Block colors.
- Blocker cells if applicable.
- Objective cells.
- Starting empty zones.

Handcraft the first 50–100 levels.

After that, combine authored templates with procedural variations.

---

# 72. Difficulty Curve

The progression should not simply increase occupied-cell count.

Increase difficulty through:

- More awkward starting gaps.
- Larger required shapes.
- More constrained objectives.
- Higher score requirements.
- Limited moves.
- More complex target patterns.
- Reduced safe 3×3 regions.
- More blockers later.

---

# 73. Levels 1–5

## Level 1 — Learn Placement

Goal:

- Place simple pieces.
- Clear one line.

Use:

- 1×2.
- 1×3.
- 2×2.

Teach no advanced mechanic.

## Level 2 — First Clear

Goal:

- Clear 2 lines.

Use generous empty space.

## Level 3 — Vertical Thinking

Goal:

- Clear one row and one column.

Introduce vertical pieces.

## Level 4 — Piece Order

Give three pieces where the best result requires placing the second shown piece first.

## Level 5 — First Combo

Require one double-line clear.

---

# 74. Levels 6–10

Increase:

- L shapes.
- T shapes.
- Larger bars.
- Small constrained gaps.

Level 10 should feel like the first "real puzzle."

Reward:

- Small coin bonus.
- New cosmetic preview.

---

# 75. Levels 11–20

Introduce:

- 3×3 pieces.
- Narrow corridors.
- Multi-line setup.
- Larger starting structures.

Do not make every level harder than the previous one.

Use relief levels between difficult levels.

---

# 76. Levels 21–30

Introduce:

- Move-limited objectives.
- Target-cell objectives.
- More deliberate starting patterns.
- Higher combo expectations.

---

# 77. Levels 31–40

Introduce:

- Multiple simultaneous objectives.
- Higher-density boards.
- More awkward shapes.
- Intentional order puzzles.

---

# 78. Levels 41–50

Introduce:

- Advanced line-crossing setups.
- 3×3 survival requirements.
- Limited-move challenges.
- Higher reward tiers.

---

# 79. Levels 51–75

Introduce:

- Themed board patterns.
- More complex blocker layouts.
- Multi-stage objectives.
- Occasional "expert" levels.

---

# 80. Levels 76–100

Use:

- Mixed objectives.
- Higher-density starting boards.
- Rare shape combinations.
- Advanced multi-line solutions.
- Larger reward payouts.

---

# 81. Post-100 Progression

Do not endlessly hand-author thousands of levels.

Use:

```text
authored templates
+
procedural parameter variations
+
seeded validation
+
difficulty rating
```

Every generated level must be solvable.

---

# 82. Level Validation

Before shipping a level, run an automated solver.

The validator should:

1. Load the starting board.
2. Load the generation profile.
3. Generate candidate piece sequences.
4. Search legal placements.
5. Determine whether the objective can be achieved.
6. Reject impossible levels.
7. Estimate difficulty.

This can run in editor tooling and offline build pipelines.

---

# 83. Daily Challenge

Daily Challenge should use a deterministic date seed.

Example:

```text
seed = hash(YYYY-MM-DD + secretSalt)
```

Do not use the local clock alone.

The same date should produce the same challenge for all players in the same rules version.

---

# 84. Daily Challenge UI

Show:

```text
TODAY
Best Score
Personal Best
Play
```

Optional:

- Streak.
- Daily reward.
- Share result.

Avoid requiring login.

---

# 85. Daily Reward

Example:

```text
Day 1: 20 coins
Day 2: 25 coins
Day 3: 30 coins
Day 4: 35 coins
Day 5: 50 coins
Day 6: 60 coins
Day 7: 100 coins
```

Do not make the economy dependent on daily attendance.

---

# 86. Coin Economy

Introduce coins as a cosmetic currency.

Coins should not be required to play the core game.

Primary sources:

- Level completion.
- Daily challenge.
- Achievement milestones.
- Optional rewarded ad.
- Occasional event rewards.

---

# 87. Coin Sinks

Spend coins on:

- Block skins.
- Board themes.
- Clear effects.
- Particle themes.
- Score popup themes.
- Piece tray themes.
- Sound packs, optionally.

Do not sell competitive power by default.

---

# 88. Cosmetic Store

Store layout:

```text
Featured
Blocks
Effects
Boards
Trails
Owned
```

Each item:

- Preview.
- Name.
- Price.
- Rarity.
- Equip button.

---

# 89. Skin Rarity

Use:

```text
Common
Rare
Epic
Legendary
```

Rarity changes visual quality/complexity, not gameplay power.

---

# 90. Rewarded Ads

Rewarded ads should be strictly opt-in.

Good rewards:

- +50 coins.
- Double level reward.
- Extra daily reward.
- One cosmetic trial.
- Optional post-game bonus.
- One revive in a mode where revives make sense.

Never automatically start a rewarded ad.

---

# 91. Rewarded Ad Placement

Recommended opportunities:

### After Level Completion

```text
Normal Reward: 50 coins
Watch Ad: 100 coins
```

### After Game Over

```text
Continue
Watch Ad
No Thanks
```

If implementing revive:

- Restore a controlled board state.
- Do not simply delete random blocks.
- Limit to one revive per run.

### Store

Optional:

```text
Watch Ad → +30 coins
```

Use a cooldown.

---

# 92. Interstitial Ads

Use interstitial ads only at natural breaks.

Good locations:

- After game-over result screen.
- Between adventure levels.
- After several classic runs.

Bad locations:

- During dragging.
- During a clear animation.
- Immediately after every placement.
- During active puzzle solving.
- Immediately after the app opens.

---

# 93. Interstitial Frequency Cap

Initial recommendation:

```text
Minimum 120–180 seconds between interstitials
AND
minimum 2 meaningful game sessions/rounds between ads
```

For Adventure:

```text
No more than one interstitial after a completed level group,
not every level.
```

Tune using retention and revenue data.

---

# 94. Banner Ads

Banner ads should not cover the board.

Preferred locations:

- Main menu bottom.
- Store bottom.
- Results screen bottom.
- Optional daily screen.

Avoid permanent banners on the core gameplay board if they materially reduce the board size.

If a gameplay banner is required for monetization, reserve its space before calculating the board size.

---

# 95. Ad SDK Architecture

Create an abstraction:

```text
IAdService
    Initialize()
    IsRewardedReady()
    ShowRewarded()
    IsInterstitialReady()
    ShowInterstitial()
    ShowBanner()
    HideBanner()
```

Do not scatter SDK calls throughout gameplay code.

---

# 96. Test Ads

During development:

- Always use official test ad units.
- Never click production ads during testing.
- Keep test mode enabled in development builds.

Production ad IDs should be configured separately.

---

# 97. Consent and Privacy

Implement the consent flow required by the ad/analytics providers and target jurisdictions.

Do not collect unnecessary personal data.

The game should function offline for the core puzzle.

---

# 98. Offline Architecture

Core gameplay must work without:

- Login.
- Cloud account.
- Internet.
- Ad network.
- Remote config.

If an ad is unavailable:

- Continue normally.
- Never block gameplay.
- Never show a broken ad button.

---

# 99. Save System

Save locally:

- Best score.
- Coins.
- Unlocked skins.
- Equipped skin.
- Adventure progress.
- Daily challenge completion.
- Settings.
- Ad reward cooldown timestamps.
- Tutorial completion.

Use versioned save data.

---

# 100. Save Corruption

If save data is corrupt:

1. Attempt backup recovery.
2. Validate schema.
3. Fall back to safe defaults.
4. Never crash the game.

---

# 101. Tutorial

First launch should take under 30 seconds.

Tutorial steps:

1. Highlight a piece.
2. Lift it automatically.
3. Show the elevated finger interaction.
4. Show a ghost placement.
5. Let the player place it.
6. Demonstrate a line clear.
7. Show the next three pieces.
8. Tell the player to think ahead.

Do not display a giant text wall.

---

# 102. Tutorial Finger Interaction

This is especially important because it is one of the supplied screenshots' strongest UX cues.

Show:

```text
Finger at lower screen
      ↓
Piece floats above finger
      ↓
Board remains visible
```

The player should immediately understand why the piece is elevated.

---

# 103. Board Ghost

When dragging:

- Show destination outline.
- Show occupied destination cells.
- Highlight clearable rows/columns.
- Fade invalid cells.

Do not over-highlight the whole board.

---

# 104. Ghost Colors

Valid:

- White/cyan translucent.

Invalid:

- Red/pink translucent.

Objective target:

- Gold pulse.

---

# 105. Placement Assist

Optional:

- Snap to nearest cell.
- Slight magnetism near legal positions.

Never auto-place.

---

# 106. Game Over Screen

Do not make game over feel punitive.

Show:

```text
GAME OVER

Score
Best
Lines Cleared
Best Combo
Coins Earned

Play Again
Home
```

Optional:

```text
Watch Ad → Continue
```

if the mode supports it.

---

# 107. Results Animation

Score should count upward quickly.

Example sequence:

```text
Score
+ lines
+ combo
+ level reward
+ coins
```

Use short sequential reveals.

Total result animation:

**under ~1.5 seconds.**

Allow skip/tap-to-finish.

---

# 108. Level Completion

Show:

- Success animation.
- Score.
- Stars.
- Coins.
- Next button.
- Replay.

Avoid a long celebration that prevents fast players from continuing.

---

# 109. Star Rating

Three-star system:

```text
1 star = level completed
2 stars = secondary target
3 stars = mastery target
```

This provides replayability without forcing monetization.

---

# 110. Store UX

The store should feel like a collectible gallery.

Each cosmetic card should include:

- Large visual preview.
- Price.
- Ownership state.
- Equipped state.

Do not use tiny text.

---

# 111. Coin Animation

When earning coins:

- Coin icon flies toward top currency display.
- 250–500 ms.
- Small sparkle.
- Counter increments.

Use pooled UI objects.

---

# 112. Monetization Philosophy

Monetization should enhance rather than interrupt.

The player should be able to:

- Launch.
- Play.
- Lose.
- Replay.

without being forced to watch an ad after every action.

A healthy game should make the player voluntarily choose rewarded ads because the reward feels worthwhile.

---

# 113. Optional Ad Removal

Later add:

```text
Remove Ads
```

This should remove:

- Banner ads.
- Interstitial ads.

Rewarded ads can remain optional if legally/platform appropriate, but the purchase should be clearly described.

---

# 114. Analytics Events

Use a lightweight analytics abstraction.

Events:

```text
app_open
tutorial_started
tutorial_completed
game_started
piece_placed
line_cleared
combo_reached
game_over
level_started
level_completed
level_failed
daily_started
daily_completed
store_opened
item_previewed
item_purchased
rewarded_available
rewarded_started
rewarded_completed
interstitial_shown
interstitial_skipped
```

Never log sensitive personal data.

---

# 115. Performance Metrics

Track:

- FPS.
- Frame time.
- GC allocations.
- Memory.
- Load time.
- Crash rate.
- ANR rate.
- Ad latency.
- Scene transition time.

---

# 116. Runtime Allocation Rules

During active gameplay:

**Avoid per-frame allocations.**

Do not create:

- New lists.
- New strings.
- New LINQ enumerations.
- New particles.
- New GameObjects.

inside Update loops.

---

# 117. Garbage Collection

Target:

- Near-zero GC during normal dragging.
- Near-zero GC during normal placement.
- Small controlled allocations only at level transitions.

Use object pools.

---

# 118. Draw Calls

Aim for:

- Under ~100 draw calls for the gameplay screen.
- Prefer significantly lower where possible.

The actual budget should be measured on the target device.

---

# 119. Frame Rate

Target:

```text
60 FPS normal
30 FPS fallback
```

The game should never rely on high FPS for game logic.

Use delta-time for presentation only.

---

# 120. Battery

Avoid:

- Continuous expensive Update calls.
- Full-screen post-processing.
- Real-time lights.
- Constant particle storms.
- High-frequency vibration.

When the app is backgrounded:

- Pause gameplay.
- Stop animation loops.
- Stop audio if appropriate.

---

# 121. Thermal Management

After several minutes:

- Monitor performance.
- Reduce decorative particles on low-end devices.
- Reduce background animation.
- Never reduce board readability.

---

# 122. Dynamic Quality

Quality levels:

### Low

- Reduced particles.
- No background floating blocks.
- Minimal shadows.
- Simplified clear effects.

### Medium

- Normal particles.
- Normal block bevels.
- Basic background animation.

### High

- Full particles.
- Extra sparkles.
- More elaborate clear effects.

Gameplay logic is identical.

---

# 123. Low Memory Mode

If memory pressure is detected:

- Release unused menu assets.
- Reduce particle pool.
- Avoid loading cosmetic previews not visible on screen.
- Keep core gameplay assets resident.

---

# 124. Loading Strategy

Core gameplay should load first.

Load later:

- Store cosmetics.
- Adventure theme assets.
- Optional music.
- Additional effect packs.

Do not delay the first game because a store asset is loading.

---

# 125. Scene Strategy

Suggested scenes:

```text
Bootstrap
MainMenu
Game
Store
```

Avoid one scene per Adventure level.

Levels should be data.

---

# 126. Folder Structure

```text
Assets/
    Art/
        Blocks/
        UI/
        Icons/
        Effects/
        Backgrounds/
    Audio/
        Music/
        SFX/
    Data/
        Pieces/
        Levels/
        Skins/
        Config/
    Prefabs/
        Blocks/
        UI/
        Effects/
    Scenes/
    Scripts/
        Core/
        Board/
        Pieces/
        UI/
        Ads/
        Economy/
        Save/
        Audio/
        Analytics/
    Materials/
    Fonts/
```

---

# 127. Script Architecture

Suggested core classes:

```text
GameBootstrap
GameManager
GameStateMachine
BoardModel
BoardView
BoardController
PieceDefinition
PieceModel
PieceView
PieceTrayController
PieceGenerator
PlacementValidator
ClearResolver
ScoreManager
ComboManager
LevelManager
DailyChallengeManager
EconomyManager
StoreManager
SaveManager
AudioManager
HapticsManager
AdManager
AnalyticsManager
SettingsManager
UIManager
```

---

# 128. Dependency Rules

Gameplay must not directly depend on:

- Ad SDK.
- Analytics SDK.
- Store SDK.

Instead:

```text
Gameplay
    ↓
Service interfaces
    ↓
Platform implementations
```

This keeps the game testable.

---

# 129. Unit Tests

Write automated tests for:

- Piece fits.
- Piece outside board.
- Occupied-cell collision.
- Row clear.
- Column clear.
- Simultaneous row/column clear.
- Multiple lines.
- Piece removal.
- Game-over detection.
- Save/load.
- Coin addition.
- Level objective completion.
- Daily seed.
- Generator validation.

---

# 130. Board Test Cases

Test:

```text
empty board
one occupied cell
full row
full column
full row + column crossing
two rows
two columns
row + two columns
full board
almost full board
isolated holes
3x3-only opening
no legal placements
```

---

# 131. Touch Test Cases

Test:

- Tiny piece.
- Large piece.
- Finger at bottom.
- Finger near screen edge.
- Fast drag.
- Slow drag.
- Diagonal drag.
- Invalid release.
- Release outside board.
- Multi-touch.
- Touch cancellation.
- Screen rotation disabled.

---

# 132. UI Test Cases

Verify:

- 16:9.
- 18:9.
- 20:9.
- Punch-hole camera.
- Gesture navigation.
- Three-button navigation.
- Small font scaling.
- Large font scaling.

---

# 133. Ad Test Cases

Verify:

- No internet.
- Rewarded unavailable.
- Interstitial unavailable.
- User closes ad.
- User finishes rewarded ad.
- Ad fails to load.
- Ad loads slowly.
- App backgrounded during ad.
- App killed during reward flow.

Never award a reward based merely on "ad started."

Award it only after the SDK reports successful completion.

---

# 134. Reward Security

Coins must not be awarded by client-side UI alone.

At minimum:

- Validate reward callback.
- Protect against duplicate callbacks.
- Use unique reward transaction/session IDs.
- Ignore repeated completion events.

For a simple offline game, keep the system lightweight, but never make reward duplication trivial.

---

# 135. Anti-Abuse

Do not implement aggressive anti-cheat for a casual offline game.

But protect:

- Coin counters.
- Reward callbacks.
- Purchases.
- Save data versions.

---

# 136. Store Purchase Architecture

Even if purchases are added later, create:

```text
IStoreService
```

with:

```text
Initialize
GetProducts
Purchase
Restore
```

Do not hard-code store SDK calls into UI buttons.

---

# 137. Cosmetic Preview

Allow players to preview a skin before spending coins.

Preview:

- Place a sample block.
- Show clear animation.
- Show particle effect.
- Show score popup.

Then:

```text
BUY
```

---

# 138. Cosmetic Unlock Feedback

After purchase:

```text
UNLOCKED!
```

Then:

- Item pulses.
- Coin counter animates.
- Equip button becomes active.

---

# 139. Daily Store Rotation

Later feature.

Rotate featured cosmetics every 24 hours using server time when available.

Offline fallback:

- Use local rotation.
- Never make an item permanently unavailable due to offline mode.

---

# 140. Themes

Themes can alter:

- Background.
- Board tint.
- Block materials.
- Clear particles.
- Sound effects.

Do not alter the underlying board dimensions.

---

# 141. Example Theme Families

Original themes:

- Royal Neon.
- Ocean Glass.
- Candy Prism.
- Sunset Arcade.
- Aurora.
- Midnight.
- Emerald Palace.
- Cyber Blocks.

Do not reproduce another game's exact promotional theme.

---

# 142. Special Clear Effects

Cosmetic-only effects:

- Starburst.
- Confetti.
- Pixel burst.
- Firework.
- Lightning.
- Bubble pop.
- Crystal shatter.
- Spark shower.

They must not obscure the board.

---

# 143. Board Clear Pipeline

Use this event chain:

```text
PlacementConfirmed
    ↓
BoardUpdated
    ↓
LinesDetected
    ↓
ClearStarted
    ↓
ClearVFX
    ↓
CellsRemoved
    ↓
ScoreUpdated
    ↓
ComboUpdated
    ↓
ObjectivesUpdated
    ↓
BoardReady
```

---

# 144. Animation Timing Principle

Prefer many short animations over a few long animations.

Bad:

```text
2-second clear animation
```

Good:

```text
100 ms anticipation
120 ms blast
150 ms particles
100 ms score feedback
```

Total perceived response remains fast.

---

# 145. Screen Shake

Use tiny UI/camera shake only for major events.

Recommended maximum:

```text
2–4 px equivalent
```

Never shake during ordinary placement.

Provide Reduced Effects setting.

---

# 146. Background Animation

Animate at low frequency.

Examples:

- Slowly drifting particles.
- Subtle gradient movement.
- Occasional sparkle.

Do not animate every background element independently.

---

# 147. Menu Transition

Use:

```text
fade + scale
```

rather than loading screens.

Transition duration:

```text
120–220 ms
```

---

# 148. Typography

Use one main rounded display font and one utility font if necessary.

Avoid shipping many fonts.

Use:

- Heavy display weight for score.
- Bold for buttons.
- Regular for settings.

Use dynamic font atlas generation carefully.

---

# 149. Text Localization

Do not bake text into images.

Support string keys:

```text
PLAY
ADVENTURE
DAILY
STORE
SETTINGS
GAME_OVER
RETRY
NEXT
```

This keeps localization possible.

---

# 150. Localization Languages

Initial release:

- English.

Architecture should allow later:

- Spanish.
- Portuguese.
- French.
- German.
- Arabic.
- Japanese.
- Korean.
- Hindi.
- Indonesian.

---

# 151. Right-to-Left Support

Prepare UI anchoring for RTL languages.

Do not hard-code left/right assumptions into game logic.

---

# 152. App Icon

Create an original icon.

Suggested:

- One glossy block.
- Small crown/trophy accent.
- Blue/purple background.
- High contrast.

Do not copy the reference app icon.

---

# 153. Splash Screen

Keep it short.

Show:

```text
Original Logo
```

on a simple background.

Avoid a long animated splash.

---

# 154. Build Configurations

Create:

```text
Development
Internal
Release
```

Development:

- Test ads.
- Debug logging.
- Profiler hooks.

Internal:

- Test ads or controlled staging configuration.
- Crash reporting.

Release:

- Production IDs.
- Production analytics.
- Debug disabled.

---

# 155. Debug Tools

Create a hidden developer panel.

Features:

- Set score.
- Fill board.
- Clear board.
- Spawn any piece.
- Set seed.
- Jump to level.
- Give coins.
- Trigger clear.
- Trigger combo.
- Test ads.
- Test save/load.

Never expose it in production builds.

---

# 156. Piece Generator Debugging

Display:

```text
Seed
Current board density
Candidate count
Selected pieces
Legal placement count
```

This will make balancing much easier.

---

# 157. Level Editor

Create a simple editor tool allowing:

- Click cells to fill.
- Select cell color.
- Add objective.
- Set target.
- Preview pieces.
- Test level.
- Run solver validation.
- Export level JSON/ScriptableObject.

---

# 158. Automated Level Difficulty

Calculate approximate difficulty from:

```text
starting occupancy
average legal placements
minimum safe placements
objective complexity
largest required shape
move limit
solution depth
```

Assign:

```text
1–10 difficulty
```

---

# 159. Level Generation Pipeline

```text
Template
↓
Randomized variation
↓
Objective assignment
↓
Piece profile
↓
Solver validation
↓
Difficulty estimation
↓
Human QA
↓
Ship
```

---

# 160. Fairness Rule

Never create a level that is impossible unless the UI explicitly labels it as a puzzle challenge and it has been intentionally designed that way.

Never rely on players watching an ad to overcome a level that the generator secretly made impossible.

---

# 161. Economy Balancing

Start conservatively.

Example:

```text
Normal level completion: 25–50 coins
3-star level: +15–30
Daily: 20–100
Rewarded ad: 25–75
Common skin: 250
Rare skin: 500
Epic skin: 1000
Legendary effect: 2000+
```

These are prototype values.

Tune using actual player behavior.

---

# 162. Rewarded Ad Economy Safety

Do not let rewarded ads create unlimited inflation.

Use:

- Daily cap.
- Soft cooldown.
- Diminishing rewards if necessary.

Example:

```text
First rewarded coin ad: 50
Second: 40
Third: 30
Then daily cap reached
```

---

# 163. Interstitial UX

When an interstitial is due:

1. Finish current gameplay.
2. Show results.
3. Let the player see the result.
4. Only then present the ad.
5. Return to a meaningful destination.

Never interrupt a puzzle decision.

---

# 164. Banner UX

If a banner is active:

- Reserve its area.
- Never overlap buttons.
- Never shift the board after the ad appears.
- Use adaptive banner sizing where supported.
- Hide it during full-screen gameplay if layout quality would suffer.

---

# 165. Revenue Optimization Without Annoyance

Primary monetization hierarchy:

1. Rewarded ads.
2. Optional remove-ads purchase.
3. Cosmetic coin economy.
4. Cosmetic purchases later.

Do not make interstitial frequency the primary revenue strategy.

---

# 166. Retention Features

Future additions:

- Daily challenge.
- Weekly challenge.
- Achievements.
- Cosmetic collections.
- Seasonal themes.
- Streak rewards.
- Personal best history.

Avoid feature bloat in version 1.

---

# 167. Achievements

Examples:

```text
First Clear
Double Blast
Triple Blast
10K Score
50K Score
100K Score
10 Combo
25 Combo
100 Lines
10 Games
First 3-Star Level
```

---

# 168. Personal Records

Track:

- Best score.
- Best combo.
- Most lines in one move.
- Highest daily score.
- Longest run.
- Most coins earned.

---

# 169. Share Result

Optional later feature.

Share an image such as:

```text
CROWN BLOCKS
Score: 54,870
Best Combo: 12
```

Use original branding.

Do not include private data.

---

# 170. Notifications

Notifications should be optional.

Good:

- Daily challenge available.
- Daily reward ready.

Bad:

- Constant reminders.
- Manipulative urgency.
- Notifications immediately after losing.

---

# 171. First-Session Experience

The first session should achieve:

```text
Launch
→ Play within seconds
→ First clear within first minute
→ Understand three-piece planning
→ See polished clear animation
→ Finish a run
→ See optional rewarded reward
```

Do not force the store or ads into the tutorial.

---

# 172. Visual Polish Checklist

Before release verify:

- Every block has consistent bevel direction.
- Shadows are consistent.
- Score typography is aligned.
- Board is perfectly square.
- Piece tray is evenly spaced.
- Touch targets are large.
- Ghost preview is readable.
- Clear effects are satisfying.
- No particles remain stuck.
- No animation clips through UI.
- No frame hitch on line clear.
- No visible texture filtering artifacts.

---

# 173. Touch Polish Checklist

Verify:

- Piece rises above finger.
- Finger never blocks target.
- Piece follows naturally.
- Piece does not lag.
- Invalid placement is clear.
- Valid placement snaps correctly.
- Release feels instant.
- Piece returns smoothly if invalid.
- Multi-touch does not duplicate pieces.
- Selecting a second piece cancels the first correctly.

---

# 174. Screenshot-Matching Strategy

Use the supplied screenshots as **composition references**, not as assets.

Match the broad visual relationships:

```text
blue background
↓
header
↓
large score
↓
large centered board
↓
three-piece tray
↓
optional promotional/footer region
```

Improve where possible:

- More modern typography.
- Cleaner spacing.
- Better accessibility.
- More polished transitions.
- More restrained effects.
- Better responsive layout.

---

# 175. Screenshot Analysis Notes

The supplied images are 960×1536 portrait captures.

The board is approximately square and centered, with the main blue background surrounding it.

The board uses a dark navy interior with subtle cell divisions.

The pieces have:

- Bright saturated colors.
- Strong beveled edges.
- Dark lower edges.
- Bright upper edges.
- Soft shadows.

The score is centered above the board and visually dominant.

The top-left record indicator uses a gold trophy/crown motif.

The settings control is placed at the top-right.

The piece tray is positioned below the board with generous spacing.

The bottom promotional text uses large warm yellow typography.

The implementation should preserve this hierarchy while using an original brand identity.

---

# 176. Promotional Footer

Instead of copying the reference phrases, use original rotating copy.

Examples:

```text
Think. Place. Blast.
One Move Ahead.
Clear Your Way.
Relax. Plan. Repeat.
Build the Perfect Board.
```

Rotate occasionally.

Do not display a large CTA during active puzzle play if it distracts from the board.

---

# 177. Store Promotional Copy

Examples:

```text
New skins available!
Customize your blast.
Make every clear yours.
```

Keep it short.

---

# 178. Error Handling

Never show technical errors to normal players.

If a noncritical system fails:

```text
Continue gameplay.
```

Examples:

- Analytics unavailable.
- Ad unavailable.
- Cosmetic preview failed.
- Daily data unavailable.

---

# 179. Network Failure

If network disappears:

- Core game continues.
- Hide unavailable ad buttons.
- Store shows cached content.
- Daily challenge uses cached seed if already downloaded.
- Do not freeze the board.

---

# 180. Crash Recovery

If the game crashes or is killed during a run:

Save lightweight recovery state at logical checkpoints.

On restart:

```text
Resume previous game?
```

Optional.

Do not resume if the state is corrupted.

---

# 181. QA Device Matrix

At minimum test:

### Low

2020/2021 budget Android.

### Baseline

2021 mid-range Android, 4 GB RAM.

### High

Modern flagship Android.

Also test:

- 60 Hz.
- 90 Hz.
- 120 Hz.

The game must not depend on refresh rate.

---

# 182. Performance Acceptance Criteria

Release candidate should satisfy:

- No noticeable input lag.
- Stable 60 FPS on baseline during ordinary play.
- Stable 30+ FPS under heavy effects.
- No repeated GC spikes during dragging.
- No memory leak after 30 minutes.
- No major frame spike when clearing 4+ lines.
- Main menu opens reliably.
- Game starts quickly.
- App remains responsive after repeated restarts.

---

# 183. Memory Acceptance Criteria

Target:

- Low runtime memory.
- No loading of all cosmetic assets at startup.
- No unbounded particle pools.
- No duplicated textures.
- No unused high-resolution images.

Measure on real devices.

---

# 184. APK/AAB Acceptance Criteria

Target:

```text
Core game content: <25 MB
Preferred: <20 MB
```

Do not include development assets.

Verify release build size rather than editor/project size.

---

# 185. Battery Acceptance Criteria

A 15–20 minute puzzle session should not cause unusually high drain compared with similar 2D puzzle games.

Avoid keeping expensive effects alive when idle.

---

# 186. Store Listing Strategy

Use original screenshots.

Do not use another game's screenshots.

Show:

1. Main menu.
2. Core board.
3. Clear effect.
4. Adventure level.
5. Cosmetic store.
6. Daily challenge.

---

# 187. Store Description Strategy

Emphasize:

- 8×8 strategic puzzle.
- Three pieces.
- No timer in classic mode.
- Offline core gameplay.
- Satisfying clears.
- Daily challenge.
- Cosmetic customization.
- Optional rewards.

Avoid claims that cannot be verified.

---

# 188. Branding

Working title:

**Crown Blocks**

Alternative internal names:

- Royal Grid.
- Prism Blocks.
- Crown Blast.
- Block Royale.

Final brand must be checked for trademark/store conflicts before publication.

---

# 189. Original Art Direction

The game should be:

```text
Glossy
Colorful
Friendly
Clean
Premium
Readable
Slightly toy-like
```

Avoid directly cloning:

- Logo.
- Font treatment.
- Exact icon shapes.
- Exact background.
- Exact screenshots.
- Exact promotional text.

---

# 190. Development Order

Build in this order.

## Phase 1 — Core

- 8×8 board.
- Piece definitions.
- Touch placement.
- Collision.
- Row/column clearing.
- Three-piece tray.
- Game over.
- Score.

## Phase 2 — Feel

- Elevated drag.
- Ghost.
- Placement animation.
- Clear effects.
- Particles.
- Haptics.
- Audio.

## Phase 3 — UI

- Main menu.
- Settings.
- Results.
- Responsive layout.

## Phase 4 — Content

- Adventure.
- Daily.
- Achievements.

## Phase 5 — Economy

- Coins.
- Store.
- Skins.

## Phase 6 — Monetization

- Rewarded.
- Interstitial.
- Banner.
- Remove ads.

## Phase 7 — Optimization

- Profiling.
- Memory.
- Asset compression.
- Device testing.

---

# 191. Do Not Build Everything at Once

The coding model should not generate the entire project in one enormous untested pass.

Use vertical slices.

First prove:

```text
Board
+
One piece
+
Touch
+
Placement
+
One clear
```

Then add systems.

---

# 192. Vertical Slice 1

Acceptance test:

- App opens.
- Board appears.
- One piece can be selected.
- Piece floats above finger.
- Valid placement works.
- Invalid placement returns to tray.
- One line clears.
- Score changes.

---

# 193. Vertical Slice 2

Add:

- Three-piece tray.
- Piece generation.
- Game over.
- Best score.
- Restart.

---

# 194. Vertical Slice 3

Add:

- Premium visuals.
- Bevels.
- Shadows.
- Clear particles.
- Sound.
- Haptics.
- Combo.

---

# 195. Vertical Slice 4

Add:

- Main menu.
- Settings.
- Results.
- Save system.

---

# 196. Vertical Slice 5

Add:

- Adventure.
- Daily challenge.
- Coins.
- Store.

---

# 197. Vertical Slice 6

Add:

- Ads.
- Analytics.
- Purchases.
- Privacy/consent.

---

# 198. AI Coding Model Instructions

The chosen coding model must behave like a senior mobile-game engineer.

It must:

- Inspect existing files before editing.
- Avoid duplicate classes.
- Preserve working code.
- Build after meaningful changes.
- Fix compile errors immediately.
- Prefer simple architecture.
- Avoid unnecessary dependencies.
- Avoid speculative SDK integrations until the core works.
- Keep gameplay deterministic for testing.
- Explain assumptions.
- Never pretend proprietary behavior is known when it is not.

---

# 199. AI Coding Model: Performance Rules

The model must assume the baseline device is a 2021 mid-range Android phone.

Therefore:

- Avoid per-frame allocations.
- Avoid unnecessary coroutines.
- Avoid physics.
- Avoid expensive LINQ in gameplay.
- Pool transient objects.
- Use simple shaders.
- Keep textures compressed.
- Keep scenes small.
- Keep logic data-oriented where useful.
- Profile before adding expensive visual effects.

---

# 200. AI Coding Model: UI Rules

The UI must be:

- Responsive.
- Portrait-first.
- Safe-area aware.
- Touch-friendly.
- Visually consistent.
- Original.
- High quality.

Never hard-code the screenshot's exact pixel coordinates.

---

# 201. AI Coding Model: Touch Rules

The model must specifically implement the elevated drag behavior:

```text
finger remains below
piece is visually raised above finger
piece follows finger
ghost snaps to board
release confirms
```

This is a core UX requirement.

---

# 202. AI Coding Model: Piece Generator Rules

The model must:

1. Generate candidates from a weighted shape library.
2. Inspect current board state.
3. Ensure reasonable legal placement opportunities.
4. Avoid excessive repetition.
5. Preserve challenge.
6. Keep generation deterministic when a seed is supplied.
7. Validate Adventure levels.

Do not use an unfiltered `Random.Range()` call to select all pieces.

---

# 203. AI Coding Model: Level Rules

The model must never fabricate claims such as:

> "This is exactly how the original game's level 173 works."

Instead write:

> "This is our original level design inspired by the reference's progression pattern."

Every shipped level must be solver-validated.

---

# 204. AI Coding Model: Ads Rules

The model must:

- Keep ad code behind an interface.
- Use test IDs in development.
- Use production IDs only in release configuration.
- Never show an interstitial during active gameplay.
- Never block the game if an ad fails.
- Award rewarded-ad rewards only on successful completion.
- Prevent duplicate reward callbacks.
- Respect consent/privacy requirements.

---

# 205. AI Coding Model: Monetization Rules

Never implement:

- Fake reward buttons.
- Forced ad clicks.
- Misleading buttons.
- Ads disguised as gameplay.
- Ads triggered by touching empty UI areas.
- Endless forced interstitial chains.

Monetization must remain platform-compliant and player-friendly.

---

# 206. AI Coding Model: Testing Rules

For every major system, produce tests.

Minimum:

```text
Board tests
Piece tests
Clear tests
Generator tests
Save tests
Economy tests
Level tests
Ad callback tests
```

---

# 207. AI Coding Model: Build Rules

After creating or modifying a subsystem:

1. Compile.
2. Fix errors.
3. Run relevant tests.
4. Test on device/emulator.
5. Only then proceed.

Do not stack hundreds of untested changes.

---

# 208. AI Coding Model: Documentation Rules

Document:

- Public classes.
- Data formats.
- Generator rules.
- Save schema.
- Ad integration.
- Economy values.
- Build configuration.

Keep comments focused on *why*, not obvious syntax.

---

# 209. Recommended Initial Constants

```text
BOARD_SIZE = 8
PIECES_PER_TRAY = 3

TARGET_FPS = 60

PIECE_LIFT_Y = 90dp
PIECE_DRAG_SCALE = 1.05

PLACEMENT_ANIMATION_MS = 140
CLEAR_ANIMATION_MS = 180

MAX_PARTICLES_NORMAL = 120
MAX_PARTICLES_BIG_CLEAR = 250

INTERSTITIAL_MIN_INTERVAL = 150–180 seconds
```

All values must be configurable.

---

# 210. Recommended First Release Scope

Version 1.0:

- Classic endless mode.
- 8×8 board.
- 3-piece tray.
- No rotation.
- Elevated drag.
- Ghost placement.
- Row/column clearing.
- Score.
- Combo.
- Best score.
- Main menu.
- Settings.
- Local save.
- Basic coins.
- 10–20 cosmetics.
- Rewarded ads.
- Conservative interstitial ads.
- Optional banner on menu/results.
- Basic achievements.

Do not ship 500 complicated systems in version 1.

---

# 211. Version 1.1

Add:

- Adventure mode.
- 50+ levels.
- Daily challenge.
- More skins.
- More effects.
- Better statistics.

---

# 212. Version 1.2

Add:

- 100+ levels.
- Weekly challenge.
- More cosmetics.
- Optional ad-removal purchase.
- More advanced analytics.

---

# 213. Version 2.0

Potential:

- Seasonal themes.
- Events.
- Cloud save.
- Leaderboards.
- More board variants.

Only add these if retention justifies complexity.

---

# 214. What Makes the Game Feel "AAA"

AAA quality here does **not** mean millions of polygons.

It means:

- Every touch has feedback.
- Every animation has timing.
- Every screen has hierarchy.
- Every button feels responsive.
- Every effect has purpose.
- No visual element looks accidental.
- No transition feels broken.
- No loading screen feels unnecessary.
- No UI element collides.
- The game remembers preferences.
- Performance remains stable.

---

# 215. The Most Important Polish Moments

Spend disproportionate effort on:

1. Picking up a piece.
2. Moving the piece.
3. Snapping the piece.
4. Placing the piece.
5. Clearing a line.
6. Clearing two lines.
7. Combo continuation.
8. Game-over presentation.
9. Level completion.
10. Earning coins.
11. Purchasing a skin.
12. Returning to the game after an ad.

These moments define perceived quality.

---

# 216. Clear Effect Reference Direction

The supplied screenshots show blocks visually blasting away from completed areas.

Our implementation should create an original effect with:

- Small square fragments.
- Bright central flash.
- Directional burst.
- Short-lived glow.
- Soft particles.
- Score pop.

Avoid a generic "delete instantly" behavior.

---

# 217. Block Destruction

For a normal clear:

```text
scale 1.0
→ 1.08
→ 0.82
→ 0
```

At the same time:

```text
alpha 1
→ 1
→ 0
```

Do not simply disable the GameObject without visual feedback.

---

# 218. Clear Direction

For a horizontal clear:

- Particles can travel primarily left/right.

For a vertical clear:

- Particles can travel primarily up/down.

For crossing clears:

- Combine both directions.

This makes the clear feel spatially connected to the line that was completed.

---

# 219. Score Popups

Normal:

```text
+80
```

Double:

```text
+240
DOUBLE!
```

Large:

```text
+640
MEGA BLAST!
```

These are original examples; final scoring must be configured.

---

# 220. Combo UI

Use a small floating badge near the board.

Example:

```text
COMBO ×4
```

or:

```text
4 IN A ROW!
```

Do not copy another game's exact typography.

---

# 221. Sound Layering

A multi-line clear can combine:

```text
placement
+
line sweep
+
impact
+
particle sparkle
+
score tick
+
combo chime
```

But cap volume and avoid audio clipping.

---

# 222. Music

Music should be:

- Calm.
- Light.
- Loopable.
- Low CPU.
- Low memory.

Gameplay should remain enjoyable with music off.

---

# 223. Menu Music

Use a slightly brighter variation.

Crossfade between menu/gameplay if practical, but keep the system simple.

---

# 224. Accessibility: Motion

Reduced Effects should:

- Disable screen shake.
- Reduce particles.
- Reduce exaggerated scale effects.
- Preserve functional feedback.

Do not remove all visual confirmation.

---

# 225. Accessibility: Color

Do not rely solely on color to communicate:

- Valid placement.
- Invalid placement.
- Objectives.
- Selected items.

Use outlines, icons or animation as secondary signals.

---

# 226. Accessibility: Touch

Use forgiving placement zones.

The player should not need pixel-perfect precision.

Allow a small anchor tolerance.

---

# 227. Store Economy UX

Never hide the price.

Show:

```text
500 coins
```

before purchase.

After purchase:

```text
Owned
Equip
```

---

# 228. Rewarded Coin Button

Example:

```text
WATCH AD
+50 COINS
```

Only show if the ad is currently available.

If unavailable:

- Disable button.
- Explain nothing unless needed.

---

# 229. Banner Strategy

Recommended initial deployment:

### Main Menu

Small banner at bottom.

### Store

Banner at bottom if it does not interfere.

### Results

Optional banner.

### Gameplay

Prefer no banner.

This protects the core gameplay experience and board size.

---

# 230. Interstitial Strategy

Recommended initial deployment:

```text
After 2–4 completed/failed meaningful rounds
```

with a time cap.

Do not show immediately after the first game.

New users should receive a generous ad-free onboarding period.

---

# 231. New User Ad Protection

For the first session:

- No interstitial.
- No forced banner during gameplay.
- Rewarded ad optional.

This allows the player to understand the product before monetization begins.

---

# 232. Ads and Retention

Track:

```text
retention vs interstitial frequency
rewarded completion rate
ARPDAU
session length
games per session
game-over frequency
store conversion
```

Do not optimize solely for ad impressions.

---

# 233. Economy Experimentation

Make all economy values remote-configurable later.

For version 1, local constants are fine.

Future remote parameters:

```text
coinRewardLevel
coinRewardAd
skinPrices
interstitialCooldown
dailyReward
```

---

# 234. Generator Experimentation

Allow generator versions:

```text
GEN_V1
GEN_V2
GEN_V3
```

This makes balancing experiments safer.

Save the generator version with a run/level seed.

---

# 235. Reproducibility

If a QA tester reports:

> "Level 47 generated an impossible tray."

The team should be able to reproduce it with:

```text
Level ID
Seed
Generator Version
Rules Version
```

---

# 236. Rules Versioning

Use:

```text
RULES_VERSION = 1
GENERATOR_VERSION = 1
SCORING_VERSION = 1
```

Increment when mechanics change.

This protects saved progression and analytics.

---

# 237. Originality Requirements

The final product must use:

- Original logo.
- Original title.
- Original icons.
- Original block artwork.
- Original sound effects/music.
- Original promotional text.
- Original store assets.

The *interaction pattern* can be inspired by the genre and the supplied reference.

---

# 238. Research Confidence Labels

When documenting mechanics from external research, classify each item:

### Confirmed

Directly visible in supplied screenshots or consistently documented by multiple independent sources.

### Strongly Supported

Consistent across current public descriptions and gameplay references.

### Uncertain

Exact proprietary behavior is not publicly documented.

### Our Design Decision

A deliberate implementation choice for the new game.

This prevents the coding model from turning speculation into fake facts.

---

# 239. Confirmed/Strongly Supported Reference Mechanics

High-confidence:

- 8×8 board.
- Three pieces in the common core loop.
- Rows and columns clear.
- No gravity.
- No rotation in the common ruleset.
- Piece placement is strategic.
- Offline-friendly core play.
- Large colorful blocks.
- Score-driven classic play.
- Additional progression/challenge features exist in current public descriptions.
- The supplied screenshots show the elevated piece drag behavior and line-clear visual effects.

---

# 240. Uncertain Reference Mechanics

Do not claim exact knowledge of:

- Proprietary piece weights.
- Exact future-piece algorithm.
- Exact score formula.
- Exact combo formula.
- Exact Adventure level layouts.
- Exact ad frequency.
- Exact internal difficulty algorithm.
- Exact monetization tuning.

These should be measured from controlled playtesting if exact compatibility is ever legally and technically appropriate.

---

# 241. Our Recommended Generator

Use:

```text
Weighted Candidate Generation
+
Board Feasibility Evaluation
+
Variety Rules
+
Difficulty Target
+
Objective Constraints
+
Seeded Randomness
```

This gives a polished experience without pretending to reproduce proprietary code.

---

# 242. Our Recommended Scoring

Use a simple, tunable system:

```text
Placement:
+1 per occupied cell

Line:
+80 per cleared line

Simultaneous line bonus:
data-driven

Consecutive clear combo:
data-driven

Full-board clear:
special bonus
```

Then tune against your own desired feel.

Do not label these values as the official reference game's exact formula.

---

# 243. Why Data-Driven Scoring Matters

If playtesting reveals:

- Scores grow too slowly.
- Combos dominate too much.
- Large pieces are overpowered.
- Single clears feel worthless.

You can change one configuration asset instead of rewriting gameplay.

---

# 244. Why Data-Driven Piece Generation Matters

If playtesting reveals:

- Too many 3×3 blocks.
- Too many lines.
- Too many awkward L pieces.
- Too many repeated pieces.

Change weights.

Do not rewrite the generator.

---

# 245. Why Data-Driven Levels Matter

A level should be content, not code.

This makes it possible to:

- Add 100 levels.
- Rebalance objectives.
- Change rewards.
- Test seeds.
- Reorder difficulty.

without rebuilding gameplay logic.

---

# 246. Production Checklist

Before beta:

- [ ] Core gameplay complete.
- [ ] Touch feels excellent.
- [ ] Elevated drag works.
- [ ] Ghost preview works.
- [ ] Clear animation polished.
- [ ] Audio implemented.
- [ ] Haptics implemented.
- [ ] Save works.
- [ ] Main menu complete.
- [ ] Results complete.
- [ ] Settings complete.
- [ ] Classic mode stable.
- [ ] Generator validated.
- [ ] No obvious impossible early-game trays.
- [ ] Device testing complete.
- [ ] Memory checked.
- [ ] FPS checked.

---

# 247. Monetization Checklist

Before production ads:

- [ ] Consent/privacy implemented.
- [ ] Test ads verified.
- [ ] Reward callbacks verified.
- [ ] Duplicate rewards prevented.
- [ ] Interstitial cooldown implemented.
- [ ] No gameplay interruption.
- [ ] Banner layout tested.
- [ ] Offline fallback works.
- [ ] Ad failure does not block play.
- [ ] Rewarded ads remain optional.
- [ ] Remove-ads purchase architecture prepared.

---

# 248. Store Checklist

- [ ] Original icon.
- [ ] Original logo.
- [ ] Original screenshots.
- [ ] Original promotional copy.
- [ ] Accurate feature list.
- [ ] Privacy policy.
- [ ] Support contact.
- [ ] Age/content rating.
- [ ] Data safety declaration.
- [ ] Ads disclosure.
- [ ] In-app purchase disclosure.

---

# 249. Final Quality Bar

The finished game should pass this simple test:

> A player should be able to launch the game, understand the puzzle without reading a manual, pick up a piece with one hand, keep their finger comfortably low while seeing the piece above it, place it accurately, watch a satisfying row/column blast, hear a clean sound, see the score react, and immediately understand what to do next.

If that loop feels excellent, the game is on the right track.

---

# 250. FINAL MASTER INSTRUCTION FOR THE CODING MODEL

Use this entire document as the project specification.

Build the game as an **original, production-quality 8×8 mobile block puzzle** inspired by the broad qualities of the supplied reference.

Prioritize the following in order:

1. Correct gameplay.
2. Excellent touch feel.
3. Elevated piece drag.
4. Clear board readability.
5. Satisfying clear animations.
6. Stable 60 FPS on 2021 mid-range Android.
7. Small application size.
8. Clean architecture.
9. Robust save system.
10. Original premium UI.
11. Adventure/daily content.
12. Cosmetic coin economy.
13. Rewarded ads.
14. Conservative interstitial ads.
15. Optional banners outside core gameplay.

Do not copy proprietary code or assets.

Do not fabricate undocumented facts about the reference game.

When a mechanic is uncertain, make it configurable and state the assumption.

Do not optimize the project for screenshots at the expense of real-device performance.

Do not create unnecessary dependencies.

Do not make the game require an internet connection for core play.

Do not interrupt active gameplay with ads.

Do not use huge assets merely to make the game look expensive.

Make it look expensive through **composition, timing, typography, gradients, bevels, animation, sound, particle discipline and responsiveness**.

The final result should feel like a polished commercial mobile game while remaining technically small and efficient.

---

# APPENDIX A — RESEARCH SOURCES

The following sources were consulted for the reference-game research and rules cross-checking:

1. Google Play listing supplied by the user:
   `https://play.google.com/store/apps/details?id=com.block.juggle`

2. Public app-indexing information for package `com.block.juggle`, including current publisher/version signals and store metadata.

3. Public descriptions and independent gameplay/rules references describing the 8×8 board, three-piece tray, row/column clearing and no-rotation rules.

4. Independent solver documentation showing why placement order matters and how legal placements can be evaluated.

5. Public scoring references were compared but **not treated as authoritative**, because published formulas conflict.

The key implementation principle is therefore:

**Use the supplied screenshots for visual/UX reference, public sources for broad mechanics, and original engineering decisions for anything proprietary or undocumented.**

---

# APPENDIX B — SOURCE NOTES

## Google Play

The supplied store page describes the game as an 8×8 block puzzle with strategic placement, line clearing, combos, offline play and additional challenge/progression features.

## Independent Rule References

Independent solver and gameplay references consistently describe the common core as:

- 8×8.
- Three pieces.
- No falling gravity.
- No rotation.
- Rows/columns clear.
- Game ends when available pieces cannot fit.

## Scoring

Do not copy an unverified formula. Multiple public sites publish conflicting numbers. Keep the scoring configuration adjustable.

## Generator

No reliable public source exposes the original proprietary piece-generation algorithm. Therefore the recommended generator in this document is an original board-aware weighted generator designed to reproduce the *feel* of fair strategic play, not the original source algorithm.

---

# APPENDIX C — FIRST BUILD ACCEPTANCE TEST

The first playable build is considered successful only when all of these work:

- [ ] 8×8 board appears.
- [ ] Three pieces appear.
- [ ] Player can tap/drag any piece.
- [ ] Selected piece rises above finger.
- [ ] Piece follows finger smoothly.
- [ ] Valid placement previews correctly.
- [ ] Invalid placement is rejected.
- [ ] Piece locks into board.
- [ ] Completed rows clear.
- [ ] Completed columns clear.
- [ ] Simultaneous row/column clear works.
- [ ] Score updates.
- [ ] Next piece can be selected.
- [ ] All three pieces can be placed in arbitrary order.
- [ ] New three-piece tray appears.
- [ ] Game-over detection works.
- [ ] Restart works.
- [ ] No obvious frame hitch occurs during normal placement.
- [ ] No physics engine is required for core gameplay.
- [ ] No ad SDK is required for the first core prototype.

Only after this passes should the team move to monetization and large content systems.

---

# APPENDIX D — GOLDEN RULES

**Rule 1:** The board is the hero.

**Rule 2:** The player's finger should never hide the piece being placed.

**Rule 3:** Every placement should feel physical.

**Rule 4:** Every clear should feel rewarding.

**Rule 5:** Every ad should be optional or appear at a natural break.

**Rule 6:** Never let monetization sabotage the core puzzle.

**Rule 7:** Never sacrifice 60-FPS responsiveness for decorative effects.

**Rule 8:** Never make the game dependent on network connectivity.

**Rule 9:** Never represent speculation as knowledge of proprietary internals.

**Rule 10:** Build the simple game loop first, then polish it until every interaction feels intentional.

---

# END OF GUIDELINE
