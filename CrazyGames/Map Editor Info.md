# 🗺️ 2D Map Editor & Level System Architecture Guide
> **Complete Blueprint for Building Web Canvas Map Editors, Custom Level Bridges, and Extensible Platform Mechanics**

---

## 📑 Table of Contents
1. [Overview & Core Philosophy](#1-overview--core-philosophy)
2. [System Architecture](#2-system-architecture)
3. [How Level Storage & Original Map Preservation Works](#3-how-level-storage--original-map-preservation-works)
4. [Editor Anatomy & Mechanics (Under the Hood)](#4-editor-anatomy--mechanics-under-the-hood)
   - [Camera & Coordinate Systems](#41-camera--coordinate-systems)
   - [Entity Selection & Resizing Engine](#42-entity-selection--resizing-engine)
   - [Reactive Inspector & Dynamic Data Binding](#43-reactive-inspector--dynamic-data-binding)
   - [In-Editor Realtime Playtest Sandbox](#44-in-editor-realtime-playtest-sandbox)
   - [Visual Connection Links & Hazards](#45-visual-connection-links--hazards)
5. [Export & Import Pipelines](#5-export--import-pipelines)
6. [Step-by-Step Guide: Adapting This Editor to Another Game](#6-step-by-step-guide-adapting-this-editor-to-another-game)
   - [Step 1: Define Your Data Schema](#step-1-define-your-data-schema)
   - [Step 2: Add Custom Platform Types & Behaviors](#step-2-add-custom-platform-types--behaviors)
   - [Step 3: Build the Editor Canvas & Camera](#step-3-build-the-editor-canvas--camera)
   - [Step 4: Build the Inspector UI](#step-4-build-the-inspector-ui)
   - [Step 5: Bridge the Editor to Your Main Game](#step-5-bridge-the-editor-to-your-main-game)
7. [Reusable Code Templates](#7-reusable-code-templates)

---

## 1. Overview & Core Philosophy

This level editor system was created to provide a **standalone, zero-dependency, browser-native toolset** for designing, editing, playtesting, and exporting game levels directly inside the browser.

### Key Highlights
* **Zero External Dependencies**: Pure Vanilla JavaScript and HTML5 Canvas 2D. No Node build steps required at runtime.
* **Instant In-Editor Playtesting**: Seamlessly switch between building and playing (`▶ TEST LEVEL`) without reloading the page or losing state.
* **Non-Destructive Level Management**: Built-in default/original game levels are hardcoded and permanent. Custom user levels reside in `localStorage` or JSON files, allowing users to create, fork, test, export, or reset levels without risking original assets.
* **Bi-directional Bridge**: Levels designed in `editor.html` automatically sync to `index.html` via `localStorage`, and can also be exported as clean JavaScript code or JSON files.

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PROJECT ARCHITECTURE                          │
└────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────┐         ┌───────────────────────────┐
 │        editor.html        │         │        index.html         │
 │     (Level Designer)      │         │       (Main Game)         │
 └─────────────┬─────────────┘         └─────────────┬─────────────┘
               │                                     │
               │ Writes / Reads                      │ Reads & Syncs
               ▼                                     ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                   BROWSER LOCALSTORAGE                          │
 │         Key: 'crimson_ronin_editor_levels_v1'                   │
 └─────────────────────────────────────────────────────────────────┘
               ▲
               │ Export / Import
               ▼
 ┌───────────────────────────┐         ┌───────────────────────────┐
 │        JSON Files         │         │     JavaScript Code       │
 │   (.json Level Packs)     │         │   (LEVELS / TUTORIAL_LVL) │
 └───────────────────────────┘         └───────────────────────────┘
```

### Component Breakdown
1. **Game Engine (`index.html`)**: The production game loop with full audio, sprite textures, particles, and CrazyGames SDK integrations.
2. **Level Editor (`editor.html`)**: The visual CAD-style tool with grid snapping, draggable entities, 8-point resize handles, real-time connection wires, camera controls, and the inspector sidebar.
3. **Bridge Function (`syncCustomLevelsFromStorage()`)**: A shared synchronization function that runs at game start and level loading. If custom levels exist in `localStorage`, it translates them into the runtime platform format; if not, it gracefully uses the original built-in levels.

---

## 3. How Level Storage & Original Map Preservation Works

One of the most important design patterns is **Preserving Original Levels while Enabling Full User Customization**.

### The Storage Strategy
1. **Original Levels**: Defined as constant JavaScript arrays inside `index.html` (e.g. `const TUTORIAL_LEVEL = {...}; const DEFAULT_LEVELS = [...]`).
2. **Editor Initialization**: When `editor.html` loads for the first time:
   - It checks `localStorage.getItem('crimson_ronin_editor_levels_v1')`.
   - If empty, it loads the default level data embedded in `<script id="default-levels-data">`.
   - Any user edits are saved to `localStorage`.
3. **Live Syncing into the Main Game**:
   Inside `index.html`, whenever a level loads (`loadLevel(i)`), `syncCustomLevelsFromStorage()` is executed:
   ```javascript
   function syncCustomLevelsFromStorage() {
     try {
       const saved = localStorage.getItem('crimson_ronin_editor_levels_v1');
       if (!saved) return; // Keep original hardcoded levels
       const parsed = JSON.parse(saved);
       if (!Array.isArray(parsed) || parsed.length === 0) return;

       // Convert editor format to runtime game format
       const customLevels = parsed.map(convertEditorLevel);
       const tutLevel = customLevels.find(l => l.isTutorial) || customLevels[0];
       const normalLevels = customLevels.filter(l => !l.isTutorial);

       // Override in-memory level arrays
       if (tutLevel) TUTORIAL_LEVEL = tutLevel;
       if (normalLevels.length > 0) LEVELS = normalLevels;
     } catch (err) {
       console.warn('Using default built-in levels:', err);
     }
   }
   ```
4. **Resetting to Defaults**:
   Users can click **`⚙ MANAGE SAVES` ➔ `Reset to Default Maps`** at any time. This clears the custom `localStorage` key and restores the original authored maps immediately.

---

## 4. Editor Anatomy & Mechanics (Under the Hood)

### 4.1 Camera & Coordinate Systems
The editor canvas operates across two coordinate spaces:
* **Screen Space**: Pixels on the screen `(clientX, clientY)`.
* **World Space**: Coordinates inside the game world `(worldX, worldY)`.

```javascript
// Screen to World Conversion
function screenToWorld(sx, sy) {
  return {
    x: (sx - camera.x) / camera.zoom,
    y: (sy - camera.y) / camera.zoom
  };
}

// World to Screen Conversion
function worldToScreen(wx, wy) {
  return {
    x: wx * camera.zoom + camera.x,
    y: wy * camera.zoom + camera.y
  };
}
```

#### Canvas Rendering Loop
```javascript
function renderEditor() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply Camera Transform
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // 1. Draw Grid
  drawGrid();

  // 2. Draw World Entities (Platforms, Hazards, Items, Spawn, Exit)
  drawWorldEntities();

  // 3. Draw Selection Boxes, Resize Handles & Connection Links
  drawSelectedEntityHandles();

  ctx.restore();
}
```

---

### 4.2 Entity Selection & Resizing Engine

#### 1. Hit Detection
When the user clicks on the canvas, `getHitEntity(worldX, worldY)` searches entities in reverse rendering order (top to bottom):
```javascript
function getHitEntity(wx, wy) {
  const lvl = getCurrentLevel();
  // Check selection handles first
  if (selectedEntity) {
    const handle = getHitResizeHandle(selectedEntity, wx, wy);
    if (handle) return { handle, entity: selectedEntity };
  }
  // Check platforms, plates, spikes, guards, etc.
  for (let i = lvl.platforms.length - 1; i >= 0; i--) {
    const p = lvl.platforms[i];
    if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) {
      return { entity: p, type: 'platform', index: i };
    }
  }
  // ... check other entity types
  return null;
}
```

#### 2. 8-Point Bounding Box Handles
Platforms and tutorial trigger zones support 8-point resizing:
* Corners: `nw`, `ne`, `sw`, `se`
* Edges: `n`, `s`, `e`, `w`

When dragging a handle with grid snapping:
```javascript
function snap(val, grid = 10) {
  return Math.round(val / grid) * grid;
}
```

---

### 4.3 Reactive Inspector & Dynamic Data Binding

The Inspector sidebar dynamically reconstructs its form controls whenever `selectedEntity` changes:
1. `renderInspector()` checks `selectedEntityType`.
2. Generates HTML input elements populated with current entity values.
3. Attaches input event listeners (`input`, `change`) that mutate the active entity and call `renderEditor()` in real-time.

```javascript
function renderInspector() {
  const container = document.getElementById('inspector-content');
  if (!selectedEntity) {
    container.innerHTML = `<div class="empty-state">Select an entity to edit properties</div>`;
    return;
  }
  if (selectedEntityType === 'platform') {
    container.innerHTML = `
      <div class="prop-row">
        <span class="prop-label">Platform Type:</span>
        <select id="prop-plat-type">
          <option value="solid" ${ent.platType === 'solid' ? 'selected' : ''}>Solid Stone</option>
          <option value="crumble" ${ent.platType === 'crumble' ? 'selected' : ''}>Crumbling Platform</option>
          <option value="ash" ${ent.platType === 'ash' ? 'selected' : ''}>Slow Ash Surface</option>
        </select>
      </div>
      <div class="prop-check-row">
        <input type="checkbox" id="prop-plat-init-hidden" ${ent.initiallyHidden ? 'checked' : ''}>
        <label for="prop-plat-init-hidden">Initially Hidden / Requires Trigger</label>
      </div>
    `;
    // Bind listeners
    document.getElementById('prop-plat-type').addEventListener('change', (e) => {
      selectedEntity.platType = e.target.value;
      renderEditor();
    });
    document.getElementById('prop-plat-init-hidden').addEventListener('change', (e) => {
      selectedEntity.initiallyHidden = e.target.checked;
      renderEditor();
    });
  }
}
```

---

### 4.4 In-Editor Realtime Playtest Sandbox

Instead of needing to export or reload, pressing **`▶ TEST LEVEL` (or `P` / `ESC`)** boots an isolated physics engine inside the editor canvas:

1. **State Isolation**: Clones level data using `JSON.parse(JSON.stringify(lvl))` so edits are never corrupted during test runs.
2. **Platform State Simulation**:
   - `ps.vState`: `'solid'` | `'gone'` | `'shake'`
   - `ps.spawnTimer`: Countdown for timed platforms created by pressure plates.
   - `ps.reappearTimer`: Countdown for collapsed platforms.
3. **Collision & Mechanics Execution**:
   - If `platState[idx].vState === 'gone'`, collision checks are skipped.
   - When player lands on an armed pressure plate, triggers custom trap spikes, platform spawn, or platform vanish events based on settings.
4. **Smooth Camera Tracking**: Follows player position with lerp damping (`camera.x += (targetCamX - camera.x) * 0.12`).

---

### 4.5 Visual Connection Links & Hazards

To make complex logic visual and intuitive, the editor renders interactive HUD graphics:
* **Plate ➔ Platform Link**: A cyan/red dashed line connecting the pressure plate to its target platform with live tag `SPAWN (4s)` or `VANISH (3s)`.
* **Plate ➔ Trap Spike Link**: A red dashed line to custom spike coordinates showing the exact 3-tooth spike thrust preview box.
* **Patrol Paths**: Blue dashed range lines with draggable `[PATROL MIN]` and `[PATROL MAX]` handles.
* **Watchtower Sweeps**: Visual spotlight sweep arcs.

---


### 4.6 Ground Platform Selection & Level Expansion
* **Direct Ground Selection**: In Select mode, clicking the floor selects the **Main Ground Floor**.
* **Level Resizing**: Drag the right edge of the ground floor or use the Inspector's **`➕ Extend +500px`** / **`➖ Shrink -500px`** buttons to quickly expand the level (e.g. to add extra tutorial segments or challenge corridors).

### 4.7 Smart Host-Bound Plates & Retrigger Cooldown
* **Auto-Hiding Plates on Invisible Platforms**: Any pressure plate placed on top of an initially hidden platform automatically becomes hidden and non-interactable. When the platform materializes, the plate emerges with it.
* **Configurable Retrigger Delay**: Prevent rapid click-spam with a custom retrigger cooldown (default `1.0s`, editable in the Plate Inspector).

## 5. Export & Import Pipelines

The editor supports three export/import modes:

### 1. Single-Level JavaScript Code Export
Exports a single level formatted as a clean, ready-to-use JavaScript variable:
```javascript
// --- Level 1: Dojo Infiltration ---
const LEVEL_1 = {
  name: "Dojo Infiltration",
  w: 2400,
  spawnX: 80,
  spawnY: 564,
  plats: [
    { x: 200, y: 480, w: 220, h: 20, t: "n" },
    { x: 500, y: 420, w: 180, h: 20, t: "n", initiallyHidden: true }
  ],
  plates: [
    {
      x: 280,
      y: 480,
      w: 38,
      platTrigger: true,
      platAction: "spawn",
      targetPlatX: 500,
      targetPlatY: 420,
      platDuration: 4.0
    }
  ],
  spikes: [],
  guards: [],
  keys: [{ x: 590, y: 370 }],
  doorX: 1800
};
```

### 2. Multi-Level JavaScript Code Export
Exports the entire level pack including `TUTORIAL_LEVEL` and `LEVELS = [...]` to drop directly into game engine scripts.

### 3. JSON File Export & Import
* **Export**: Downloads `crimson_ronin_custom_levels.json` containing the full level array.
* **Import**: Loads a `.json` file or pasted text, validates schema, and repopulates the level list.

---

## 6. Step-by-Step Guide: Adapting This Editor to Another Game

To build a similar level editor for a different game with different platform types (e.g. Ice, Bouncy, Moving, Conveyor, One-Way), follow this step-by-step roadmap:

### Step 1: Define Your Data Schema
Define what properties an entity has. For example, for custom platform types:
```javascript
const platformSchema = {
  x: 100,
  y: 300,
  w: 160,
  h: 24,
  platType: 'solid',       // 'solid' | 'ice' | 'bounce' | 'moving' | 'conveyor' | 'oneway' | 'crumble'
  friction: 0.98,          // Ice: 0.995 (slippery)
  restitution: 0.0,       // Bounce: 1.4 (spring jump)
  conveyorSpeed: 0,       // Conveyor belt velocity (e.g. +150px/s)
  movePath: { minX: 100, maxX: 300, speed: 60 }, // Moving platform
  initiallyHidden: false  // Requires trigger/switch to spawn
};
```

### Step 2: Add Custom Platform Types & Behaviors
In your platform drawing routine (`drawPlatform`) and physics engine:
```javascript
function drawPlatform(p) {
  ctx.save();
  if (p.platType === 'ice') {
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#0984e3';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  } else if (p.platType === 'bounce') {
    ctx.fillStyle = '#fdcb6e';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Draw spring coils...
  } else if (p.platType === 'conveyor') {
    ctx.fillStyle = '#636e72';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Draw animated direction arrows...
  }
  ctx.restore();
}
```

In physics/collision resolution:
```javascript
if (p.platType === 'ice') {
  player.vx *= p.friction || 0.99; // Low friction sliding
} else if (p.platType === 'bounce') {
  player.vy = -(player.jumpForce * (p.restitution || 1.4)); // Spring boost
} else if (p.platType === 'conveyor') {
  player.x += (p.conveyorSpeed || 100) * dt; // Belt push
}
```

### Step 3: Build the Editor Canvas & Camera
Implement the camera transformation matrix:
* Middle click or Space + Left Click to pan.
* Mouse wheel to zoom centered on cursor.
* Grid snap helper `snap(val, gridSize)`.

### Step 4: Build the Inspector UI
Add dropdowns and numeric sliders for all new mechanics:
* Friction, Restitution, Moving Platform Endpoints, Timer Delays.
* One-click alignment buttons like **`📐 Snap to Platform`**.

### Step 5: Bridge the Editor to Your Main Game
Implement the `localStorage` bridge and single/all level code exporter.

---

## 7. Reusable Code Templates

### 7.1 Reusable Screen ↔ World Coordinate Helper
```javascript
class EditorCamera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
  }
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.x) / this.zoom,
      y: (sy - this.y) / this.zoom
    };
  }
  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.x,
      y: wy * this.zoom + this.y
    };
  }
  zoomAt(screenX, screenY, factor) {
    const prevZoom = this.zoom;
    this.zoom = Math.min(2.5, Math.max(0.25, this.zoom * factor));
    this.x = screenX - (screenX - this.x) * (this.zoom / prevZoom);
    this.y = screenY - (screenY - this.y) * (this.zoom / prevZoom);
  }
}
```

### 7.2 Reusable Entity Snap-to-Platform Helper
```javascript
function snapEntityToPlatformBelow(entity, platforms, groundY = 610) {
  const ex = entity.x !== undefined ? entity.x : entity.trigger?.x || 0;
  let bestPlat = null;
  let minDistance = Infinity;

  platforms.forEach(p => {
    if (ex >= p.x - 10 && ex <= p.x + p.w + 10) {
      const curY = entity.y !== undefined ? entity.y : groundY;
      const dist = p.y - curY;
      if (dist >= -20 && dist < minDistance) {
        minDistance = dist;
        bestPlat = p;
      }
    }
  });

  if (bestPlat) {
    entity.y = bestPlat.y;
    return bestPlat;
  }
  entity.y = groundY;
  return null;
}
```

### 7.3 Reusable LocalStorage Game Bridge Template
```javascript
function loadGameLevels(storageKey, defaultLevels) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultLevels;
    const custom = JSON.parse(raw);
    if (Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
  } catch (err) {
    console.warn('Failed to load custom levels from storage, falling back to defaults:', err);
  }
  return defaultLevels;
}
```

---

## 8. Summary Checklist for New Editors
- [x] **Standalone HTML**: Runs without build servers or external dependencies.
- [x] **Data-Driven**: Level formats cleanly serialize into JSON and readable JS code.
- [x] **Preserved Originals**: Default game maps remain untouched; custom maps live in storage.
- [x] **Visual Clarity**: Visual links for wires, patrol paths, and hazard zones.
- [x] **Realtime Sandbox**: In-editor playtesting for rapid trial-and-error iteration.
- [x] **Tutorial Trigger Modes**: Supports both `⚡ Automatic` (instant modal pause) and `📜 Optional [E] Prompt` (noticeable in-game badge without gameplay interruption).
- [x] **Export Flexibility**: Single level vs all levels export with instant copy to clipboard.
