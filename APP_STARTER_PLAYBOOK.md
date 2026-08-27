# APP STARTER PLAYBOOK — Universal Game Starter Guide

> **Read this BEFORE starting any new app.**
> This is the distilled, engine-agnostic guide for building any mobile game (Sudoku, Word, Puzzle, Arcade, etc.) from scratch — using the lessons from **Crown Blocks (Godot 4.7.2)** and generalized so an Agent can pick any stack and still ship clean.
>
> **Companion doc:** Every game has its own `GAME_RECREATION_GUIDELINE.md` (the *what* to build). This Playbook is the *how* to build it.
> **Written:** 2026-08-27 · **Source project:** `BlockBlast` · **Reference builds:** Crown Blocks, ZenGrid Sudoku
> **Stack-tested:** Godot 4.7.2 (primary), Flutter (alternative)

---

## 0) HOW AN AGENT STARTS A NEW GAME

When you are assigned a new game, do this in order — no shortcuts:

1.  Read `APP_STARTER_PLAYBOOK.md` (this file) — the universal process.
2.  Read the game's `*_RECREATION_GUIDELINE.md` — the product spec (board rules, UI, monetization, slices).
3.  Create `PROGRESS.md` in the new game folder on **Day 1** (see §10).
4.  Pick the stack (§1) and lock the toolchain (§2).
5.  Build **Vertical Slice 1** only, then run the full test pipeline (§5) before touching Slice 2.

If either doc is missing, STOP and ask the user — do not guess.

---

## 1) CHOOSING THE STACK

Pick one. Do not mix-and-match mid-project.

| Stack | Best For | APK Size | Why / When |
|---|---|---|---|
| **Godot 4.7.2 (GDScript, non-.NET) — RECOMMENDED** | Puzzles, Grid, Card, Word, Arcade (no heavy 3D) | ~33 MB (R8, arm64) | Proven here. Fastest iteration. One accent, clean Controls + `_draw()`. Reuses all assets below. |
| **Flutter** | Utility-heavy apps, Forms, Content apps | ~15-18 MB | Native widgets, excellent text rendering, official AdMob package. Pays off if <20 MB is a hard requirement. |
| **Unity** | 3D, Physics, Heavy animation, Cross-platform AAA | ~45-80 MB | Overkill for turn-based logic games. Licensing + size cost. Avoid unless the spec demands physics/3D. |
| **Kotlin + Compose (Native Android)** | System-text-heavy, Ultra-light (<12 MB) | ~10 MB | Best text rendering, but you rebuild every piece of game infra from scratch. |

**Decision shortcut:**
- Sudoku / Word / Grid puzzles → **Godot**.
- <20 MB hard limit → **Flutter or Godot + aggressive R8 + asset diet**.
- Need 3D/physics → **Unity**.

---

## 2) LOCKED TOOLCHAIN — GODOT PATH (Proven Together)

These versions shipped together without conflict. Bump one → re-test all.

| Component | Version | Where |
|---|---|---|
| **Godot** | 4.7.2 stable (GDScript, NOT .NET) | winget / godotengine.org |
| **Java** | 21.0.10 (Android Studio's JBR) | `C:\Program Files\Android\Android Studio\jbr` |
| **Android SDK** | As installed by Android Studio | `%LOCALAPPDATA%\Android\Sdk` |
| **Gradle** | Whatever ships in `android_source.zip` for YOUR Godot version | `res://android/build` — never hand-upgrade for first build |
| **Gradle JVM heap** | `-Xmx4G -XX:MaxMetaspaceSize=1G` | `android/build/gradle.properties` (8G OOMs on 16GB RAM) |
| **minSdk / targetSdk** | 24 / 35 | `export_presets.cfg` |
| **AdMob (Godot)** | Poing Studios v5.0.0 | github.com/poingstudios/godot-admob-plugin |
| **AdMob native SDK** | Bundled inside Poing AARs | Never add separately |

**Flutter-only lock** (if the next app is Flutter): Gradle `8.14`, AGP `8.11.1`, Kotlin `2.2.20`, `google_mobile_ads: ^6.0.0`, JVM target 17, compileSdk 36.

### Android Build Template — The #1 Hurdle
- Install by **unzipping** `android_source.zip` from `%APPDATA%\Godot\export_templates\<version>\` into `<project>\android\build` (same as editor's "Install Android Build Template").
- Godot appends `/build` to `gradle_build_directory`. Leave it **EMPTY** in `export_presets.cfg` (empty = `res://android/build`). Writing `res://android/build` yourself → `res://android/build/build` → "template not installed" forever.
- Create `android/.build_version` (in `android/`, NOT inside `build/`) containing `4.7.2.stable`. Wrong content/folder → same error.
- Enable `gradle_build/use_gradle_build=true`.
- Required: `textures/vram_compression/import_etc2_astc=true` under `[rendering]` — as a full-path key, NOT a `[textures]` section. Without it, export fails. Copy exactly from `BlockBlast/project.godot`.

---

## 3) ADMOB — TEST IDS + SETUP (Copy-Paste)

### Official TEST IDs (always start here)
| Format | ID |
|---|---|
| App ID (manifest) | `ca-app-pub-3940256099942544~3347511713` |
| Banner | `ca-app-pub-3940256099942544/6300978111` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

### Godot Setup (Poing v5)
1. Download `poing-godot-admob-v5.0.0.zip` + `android-template-v<version>.zip`.
2. Extract `addons/admob` into project; merge template zip into `android/build`.
3. Enable: `[editor_plugins] enabled=PackedStringArray("res://addons/admob/plugin.cfg")`
4. Add to `android/build/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="com.google.android.gms.permission.AD_ID" />
   ```
5. Export preset: `use_gradle_build=true`, min 24 / target 35.

### The Crash That Gets You
`IllegalStateException: MobileAds.initialize must be called before...`
Google's init is **ASYNC**. Loading any ad before `on_initialization_complete` = instant crash.
```gdscript
var l := OnInitializationCompleteListener.new()
l.on_initialization_complete = func(_s): _initialized = true; _load_ads()
MobileAds.initialize(l)
```
- Never use a timed fallback. Gate every ad call on `_initialized`.
- Each format is its own singleton: `PoingGodotAdMob`, `PoingGodotAdMobAdView`, etc.
- `AdView.new()` does NOT request — you must `load_ad()` + `show()` in the loaded callback.
- Rewarded rewards ONLY in `on_user_earned_reward`. Add re-entry guard (double-tap = double-grant).
- Retry failed loads 3×, 8s apart. Desktop = styled placeholder behind `OS.get_name() == "Android"` check.

### Ad Pacing (Start Conservative, Tune With Data)
- Interstitial: every **3** games, min **180s** gap, never mid-puzzle/launch/pause. No interstitial in first session.
- Rewarded: strictly opt-in (hint / extra life / 2x coins).
- Banner: menus + results only. Never on active puzzle board.
- Consent/UMP before EEA/UK ads.

---

## 4) GODOT / GDSCRIPT HURDLES

**Language / Parser**
- **TABS always.** One space = parse error.
- Never infer from untyped Arrays: `for off in cells: var r := off.y` FAILS. Use `var r: int = off.y` or `for off: Vector2i in cells:`.
- `abs()` → Variant; use `absf()`/`absi()` when inferring.
- New `class_name` scripts need `godot --headless --path . --import` before other scripts see them.
- A parse error in any autoload/class_name chain breaks every scene using it — error appears far from cause.

**UI / Rendering**
- Control + ShaderMaterial but no `_draw()` → renders NOTHING. Draw a white rect for the shader.
- `Node2D` has no `mouse_filter`.
- Full-rect root Control with `STOP` eats all touch → set to `IGNORE` when handling raw touch.
- `PRESET_CENTER` anchors TOP-LEFT at center → use `CenterContainer` wrapper for modals.
- `draw_rect()` has no radius → use `StyleBoxFlat`.
- `pivot_offset` is LOCAL — adding to position shifts half the size.

**Input & Layout**
- `emulate_touch_from_mouse = true` for desktop testing.
- Gameplay touch in `_unhandled_input`, not `_input`.
- `Input.parse_input_event()` takes **window** coords: `get_viewport().get_final_transform() * canvas_pos`.
- Viewport **720×1280**, stretch `canvas_items`, `keep`, portrait. Build UI in code; keep `.tscn` as single-node stubs.
- Reserve banner space (64px) BEFORE layout; verify with screenshot.

---

## 5) TESTING PIPELINE — Run All Four Before Every APK

Skipping the last one shipped two invisible-render bugs in Crown Blocks.

1.  **Logic (headless, fast)** — `godot --headless --path . -s res://tests/run_tests.gd` — board model, generator, solver, save, seeds.
2.  **Smoke (headless, drives real scene)** — Instantiates game scene, plays N moves via same methods input would. Catches desyncs.
3.  **Input-pipeline (headless)** — Fires real `InputEventScreenTouch/Drag` via `Input.parse_input_event()` → assert pickup→ghost→place. Catches "GUI consumed my touch." Remember window coords.
4.  **Screenshot (WINDOWED — headless sees no pixels)** — Loads menu/game, plays moves, saves `get_viewport().get_texture().get_image().save_png(...)`. LOOK at the PNG.

**Debugging device:** `adb install -r app.apk` → `adb logcat -c` → launch → `adb logcat -d -b crash` — the FATAL trace names the exact line.

---

## 6) BUILD / SIZE / GITHUB

- **Debug APKs are fat (~93 MB with AdMob).** Release with R8: in `android/build/build.gradle` release `minifyEnabled true; shrinkResources true` + keep-rules for `org.godotengine.**`, plugin packages, `com.google.android.gms.ads.**` → **~33 MB**.
- **Release signing for testing:** Point preset's release keystore at debug keystore. Keys use **UNDERSCORES**: `keystore/release="C:/.../debug.keystore"`, `keystore/release_user="androiddebugkey"`, `keystore/release_password="android"` (slash-style is silently ignored).
- **GitHub limits:** 100 MB/file, warn at 50 MB. Keep ONE apk per game: `GamesAPK/<Game>/<Game>.apk` via fresh temp clone + `git reset --soft origin/main`. Or use Releases (2GB/file).
- **Export filter:** `export_filter="filtered"` + `exclude_filter="tools/*, shots/*, tests/*, *.md"` — never ship dev files.
- **Git Bash `$TEMP` = `/tmp`** → native Python can't open; convert with `cygpath -w`.
- **Godot `.tpz` extraction:** Verify top-level folder before moving.

---

## 7) UI PLAYBOOK (What "Good" Looks Like)

- **Palette discipline:** One accent (gold/indigo) for score/CTA only; board dark navy, quiet grid. Never reuse reward color for tiles.
- **Tile art:** Procedural shader (flat center + 4 bevel faces, thin dark rim). Zero textures. Simple + sharp > glossy.
- **Every touch gets feedback:** lift + scale + snap tick + ghost (valid white / invalid red / clear gold) + pop-in wobble + blast + particles + score punch. Coalesce haptics (40ms).
- **Modals:** Full-rect dim + `CenterContainer` + `PanelContainer`, fade+scale 0.92→1.0 (120-220ms).
- **Buttons:** Rounded `StyleBoxFlat`, press scale 0.96, focus disabled for touch.
- **Fonts:** One rounded display (e.g., Fredoka 500/700), heavy for big numbers, regular for settings. Shadow on large text.
- **Menu:** Logo → stats row → big PLAY → secondary buttons (≤5 rows) → banner above 1216px.
- **Settings:** sound / music / vibration / reduced effects — persisted and actually honored everywhere.
- **Adapt to any game:** Swap palette + bevel shader + celebration kit; keep spacing (8dp base, 16-24 section, 12-18 radius), press feel, and responsive board math.

---

## 8) REUSABLE ASSETS (Copy From BlockBlast)

| Asset | Path | Reuse For |
|---|---|---|
| Atomic save (versioned + backup) | `scripts/autoload/save_manager.gd` | Every app |
| Ad service (test IDs, gating, retries, fallback) | `scripts/autoload/ad_manager.gd` | Every app with ads |
| Haptics (coalesced) | `scripts/autoload/haptics_manager.gd` | Every app |
| Audio pool | `scripts/autoload/audio_manager.gd` | Every app |
| Widget kit (buttons/labels/toggles/modals) | `scripts/ui/widgets.gd` | Every app |
| Palette discipline | `scripts/ui/palette.gd` | Every app |
| Bevel shader | `shaders/block.gdshader` | Any grid game |
| Cosmetics store | `cosmetics_manager.gd`, `store.gd` | Any app with skins |
| Test harnesses (4 layers) | `tests/` | Every app |
| Icon generator (all Android sizes) | `tools/gen_icons.py` | Every app |
| SFX synthesizer | `tools/gen_audio.py` | Every app |

Adapt, don't rewrite: copy, rename palette constants for the new game's theme, keep the same atomic-save + backup + validation pattern.

---

## 9) ADDING A NEW GAME — SPEC PATTERN

Every new game ships a `GAME_RECREATION_GUIDELINE.md` (the spec). It must define:

- **Core data:** Board model + piece/word/grid rules (e.g., Sudoku needs generator + solver; Wordscapes needs word list + crossword layout as JSON).
- **Difficulty:** By technique / word length / level data — not raw clue count alone. Solver doubles as grader.
- **Economy surface:** What rewarded ads unlock (hint / undo / extra life) + what never requires an ad.
- **Reuse map:** Which assets from §8 apply directly.
- **Hurdles to expect:** CPU work (generation) → background thread or pre-generated batch; dictionary size vs APK budget; physics = avoid.

**Two examples already distilled:**
- *Wordscapes-style:* Letter tray + validated dictionary (public SCOWL/ENABLE, ~50k common words, compressed). Levels are authored data, not random.
- *Sudoku (ZenGrid):* Generator + backtracking solver (unique solution mandatory) + bit-mask performance + background generation.

For *any* other game: apply the same template — define core data, difficulty, economy, reuse, and hurdles before writing code.

---

## 10) PROGRESS.md — REQUIRED ON EVERY GAME

An Agent that starts a game **must create** `PROGRESS.md` in the game root on Day 1 and keep it alive every session. A new Agent should be able to resume in minutes from this file alone.

**Create it now** (copy this template):

```markdown
# <Game Name> — PROGRESS

> Living document. Update every session.
> Spec: GAME_RECREATION_GUIDELINE.md · Process: APP_STARTER_PLAYBOOK.md
> Engine: Godot 4.7.2 (or chosen stack) · Viewport 720x1280

## Status

| Slice | Scope | State |
|---|---|---|
| 1 | Board/setup + core loop + save | not started |
| 2 | Generator/content + difficulty | not started |
| 3 | Hints/help + overlays | not started |
| 4 | Themes/store/coins | not started |
| 5 | Ads + monetization | not started |

## Gotchas Learned
- (append every bug + fix with date)

## Decisions Log
- (why this palette / why this piece set / why this pacing)

## Feedback Log
- (player n=1 feedback — ship analytics before tuning)

## Reusable Notes
- (what to copy to next game)
```

Also maintain per-milestone `HARSH_REVIEW.md`s: what shipped, what debt remains, what pipeline caught.

## 11) NEW-APP CHECKLIST (Print This)

- [ ] Playbook + game guideline read; `PROGRESS.md` created
- [ ] Godot 4.7.2 + Android template + `.build_version` correct + `import_etc2_astc` enabled
- [ ] `--import` after adding any new file, before tests
- [ ] 4-layer test pipeline set up BEFORE polish
- [ ] At least one verified screenshot render
- [ ] AdMob v5 + test IDs + permissions + init-gating + pacing defaults
- [ ] Atomic save from Day 1 (versioned, backup, validation)
- [ ] Release build with R8; verify size <50 MB
- [ ] One APK per game in `GamesAPK/<Game>/<Game>.apk`
- [ ] `PROGRESS.md` + `HARSH_REVIEW.md` updated
- [ ] Analytics before tuning; consent before EEA ads

---

*Distilled from 5 releases, 3 hostile audits, 1 crash reproduction, and every bug in PROGRESS.md “GOTCHAS” + HARSH_REVIEW.md.*
*This playbook is engine-agnostic in process — Godot sections are the proven example, not the limit. Follow the same vertical-slice, verified-render, gated-ads pattern on any stack.*
