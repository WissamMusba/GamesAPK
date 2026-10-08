# Poki Games — SDK & Developer Integration Documentation

This document is the complete guide and technical reference for integrating HTML5 games with **Poki** using the **Poki SDK (v2)**. It covers the full API lifecycle, ad implementations, audio management, technical QA requirements, and a plug-and-play JavaScript integration bridge.

---

## 1. Overview & Platform Architecture

**Poki** is a curated global web-gaming platform reaching over 60+ million monthly active players across desktop, tablet, and mobile devices.

### Core Principles
1. **Instant Loading**: Games must load fast without external server dependencies.
2. **Seamless Ad Flow**: Interstitial ads (`commercialBreak`) only trigger at natural breaks (e.g. death, between levels, pause menus) and never interrupt active gameplay.
3. **AdBlock Resilience**: If a player uses an ad blocker or if ad network requests fail, the game **must continue to run 100% normally**.
4. **Multiplatform by Design**: Games must support responsive canvas scaling and adapt to keyboard, mouse, and touch inputs.

---

## 2. SDK Installation & Loading

Include the official Poki SDK v2 script tag inside the `<head>` of your game's `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Game Title</title>

  <!-- Poki SDK v2 -->
  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="game.js"></script>
</body>
</html>
```

> [!NOTE]
> When developing and testing locally, the Poki SDK automatically operates in a test/mock mode so you can verify callbacks without live ads.

---

## 3. Core Lifecycle & API Reference

### 3.1 SDK Initialization (`PokiSDK.init`)
Must be invoked as early as possible. `init()` returns a JavaScript `Promise`.

```javascript
PokiSDK.init().then(() => {
  console.log("Poki SDK initialized successfully");
  // Proceed with asset loading and game initialization
  loadGameAssets();
}).catch(() => {
  console.warn("Poki SDK initialization failed (likely AdBlocker). Load game anyway.");
  // ALWAYS continue to the game even if init rejects!
  loadGameAssets();
});
```

---

### 3.2 Loading Tracking (`gameLoadingProgress` & `gameLoadingFinished`)

Poki tracks loading conversions to ensure player retention.

* **`PokiSDK.gameLoadingProgress({ percentageDone })`** (Optional): Call while loading assets (audio, images, models). `percentageDone` is a float from `0.0` to `1.0`.
* **`PokiSDK.gameLoadingFinished()`** (**MANDATORY**): Call once your game assets are completely loaded and the main title/menu screen is displayed.

```javascript
// During asset loading:
PokiSDK.gameLoadingProgress({ percentageDone: 0.65 });

// Once ready on the main menu:
function onAllAssetsLoaded() {
  PokiSDK.gameLoadingFinished();
  showMainMenu();
}
```

---

### 3.3 Gameplay State Tracking (`gameplayStart` & `gameplayStop`)

These events inform Poki's analytics when the player is actively engaged.

| Method | When to Call | Examples |
| :--- | :--- | :--- |
| `PokiSDK.gameplayStart()` | Player begins active gameplay. | Clicking "Play" / "Start Match", unpausing the game, respawning after game over. |
| `PokiSDK.gameplayStop()` | Player leaves or pauses active gameplay. | Opening pause menu, player dies / round ends, level completed, returning to main menu. |

> [!IMPORTANT]
> **Strict Pairing Rule:**
> - Never fire two `gameplayStart()` events without an intervening `gameplayStop()`.
> - Never fire `gameplayStart()` on initial page load or on the title screen. It must only trigger upon the player's direct interaction.

---

### 3.4 Interstitial Video Ads (`PokiSDK.commercialBreak`)

Triggered at natural stopping points. Poki manages internal frequency capping and cooldown timers; **not every call displays an ad**.

```javascript
function triggerNaturalBreak(onDone) {
  // 1. Inform Poki gameplay is halted
  PokiSDK.gameplayStop();

  // 2. Mute game audio and pause physics/input
  pauseGameLoop();
  muteAllAudio();

  // 3. Request commercial break
  PokiSDK.commercialBreak(() => {
    // This callback fires right before the ad starts playing
    muteAllAudio();
  }).then(() => {
    // Fired once ad finishes, is skipped, or fails/blocked
    unmuteAllAudio();
    resumeGameLoop();
    if (typeof onDone === 'function') onDone();
  });
}
```

---

### 3.5 Rewarded Video Ads (`PokiSDK.rewardedBreak`)

Opt-in video ads where players voluntarily watch an ad for an in-game reward (e.g. extra coins, revives, bonus skins).

* Calling `rewardedBreak()` **resets** the commercial ad timer, preventing an interstitial ad from showing immediately afterward.

```javascript
function showRewardedReviveButton() {
  PokiSDK.gameplayStop();
  muteAllAudio();

  PokiSDK.rewardedBreak().then((success) => {
    unmuteAllAudio();

    if (success) {
      console.log("Player watched full ad — grant reward!");
      grantReviveReward();
    } else {
      console.log("Player skipped ad or ad was unavailable — no reward.");
    }

    // Resume or return to menu
    PokiSDK.gameplayStart();
  });
}
```

---

### 3.6 Debug Mode (`PokiSDK.setDebug`)

Enable detailed console logs while developing and troubleshooting:

```javascript
// Enable verbose debug logging during development
PokiSDK.setDebug(true);
```

---

### 3.7 Custom Tracking & Shareable URLs

* **Shareable URLs**: Generates custom link parameters for viral sharing / room codes.
  ```javascript
  PokiSDK.shareableURL({ roomCode: 'ROOM123', mode: 'ctf' }).then((url) => {
    console.log("Shareable room link:", url);
  });
  ```
* **AdBlock Detection**:
  ```javascript
  const adBlocked = PokiSDK.isAdBlocked();
  ```

---

## 4. Technical QA Checklist & Platform Guidelines

To pass the official Poki QA review, games must adhere to these strict requirements:

| Category | Requirement | Why it's Required |
| :--- | :--- | :--- |
| **Storage Safety** | Wrap all `localStorage` and `sessionStorage` in `try/catch` blocks. | Browser Incognito/Private modes throw `SecurityError` when accessing `localStorage`. |
| **No External Links** | Remove all outgoing hyperlinks, social buttons (Twitter, Discord, etc.), or external portfolio links. | Players must stay within the Poki portal ecosystem. |
| **No Custom Pre-rolls** | Do not implement your own video ads, banner networks, or external ad scripts. | Poki handles all monetization exclusively via their SDK. |
| **Self-Contained Bundle** | All assets (fonts, audio, textures, libraries) must be bundled locally. No runtime CDNs or external asset fetches. | Offline reliability and security sandboxing. |
| **Responsive 16:9** | Canvas must resize dynamically to window boundaries. Mobile touch controls must activate automatically on touch devices. | Consistent user experience across phones, tablets, Chromebooks, and PCs. |
| **Audio Isolation** | Game audio must completely mute during ad breaks and unmute on finish. | Overlapping game audio and ad audio causes QA rejection. |
| **AdBlock Immunity** | The game must never freeze, get stuck on black screens, or refuse to start if ads fail. | Millions of players use ad blockers; gameplay must remain fully functional. |

---

## 5. Drop-in JavaScript Integration Bridge (`PokiBridge`)

Here is a production-ready, bulletproof wrapper module ready to drop into any HTML5 game:

```javascript
/**
 * PokiBridge — Robust Wrapper for Poki SDK v2
 */
const PokiBridge = {
  initialized: false,
  isPlaying: false,
  isMuted: false,

  // Initialize SDK
  init: function(onReady) {
    if (typeof PokiSDK === 'undefined') {
      console.warn('[PokiBridge] PokiSDK script not found. Running in standalone mode.');
      if (onReady) onReady();
      return;
    }

    PokiSDK.init().then(() => {
      PokiBridge.initialized = true;
      console.log('[PokiBridge] Initialized successfully.');
      if (onReady) onReady();
    }).catch(() => {
      PokiBridge.initialized = true;
      console.warn('[PokiBridge] Init failed (ad blocker active). Running game normally.');
      if (onReady) onReady();
    });
  },

  // Signal loading finished
  loadingFinished: function() {
    if (typeof PokiSDK !== 'undefined') {
      PokiSDK.gameLoadingFinished();
    }
  },

  // Start active gameplay
  gameplayStart: function() {
    if (!PokiBridge.isPlaying && typeof PokiSDK !== 'undefined') {
      PokiSDK.gameplayStart();
      PokiBridge.isPlaying = true;
      console.log('[PokiBridge] gameplayStart');
    }
  },

  // Stop active gameplay
  gameplayStop: function() {
    if (PokiBridge.isPlaying && typeof PokiSDK !== 'undefined') {
      PokiSDK.gameplayStop();
      PokiBridge.isPlaying = false;
      console.log('[PokiBridge] gameplayStop');
    }
  },

  // Interstitial ad break
  commercialBreak: function(onComplete) {
    PokiBridge.gameplayStop();

    // Mute game audio
    const previousMuteState = PokiBridge.isMuted;
    PokiBridge.muteAudio(true);

    if (typeof PokiSDK !== 'undefined') {
      PokiSDK.commercialBreak(() => {
        PokiBridge.muteAudio(true);
      }).then(() => {
        PokiBridge.muteAudio(previousMuteState);
        if (onComplete) onComplete();
      });
    } else {
      PokiBridge.muteAudio(previousMuteState);
      if (onComplete) onComplete();
    }
  },

  // Rewarded ad break
  rewardedBreak: function(onResult) {
    PokiBridge.gameplayStop();

    const previousMuteState = PokiBridge.isMuted;
    PokiBridge.muteAudio(true);

    if (typeof PokiSDK !== 'undefined') {
      PokiSDK.rewardedBreak().then((success) => {
        PokiBridge.muteAudio(previousMuteState);
        if (onResult) onResult(success);
      });
    } else {
      PokiBridge.muteAudio(previousMuteState);
      if (onResult) onResult(true); // Default to true in offline/test environment
    }
  },

  // Audio mute helper
  muteAudio: function(mute) {
    PokiBridge.isMuted = mute;
    // Connect to your game's audio manager here:
    // e.g., if (window.Howler) Howler.mute(mute);
    // e.g., if (window.audioCtx) mute ? audioCtx.suspend() : audioCtx.resume();
  },

  // Safe localStorage wrapper for incognito mode
  storage: {
    get: function(key, fallback) {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }
  }
};
```

---

## 6. Testing with Poki Inspector & Submission Roadmap

### 6.1 Using the Poki Inspector
1. Go to the **[Poki for Developers Portal](https://developers.poki.com)**.
2. Open the **Poki Inspector** tool and drag-and-drop your zipped game build.
3. Review the **Event Log**:
   - Ensure `gameLoadingFinished()` triggers when menus load.
   - Click "Play" and verify `gameplayStart()` fires.
   - Pause or die and verify `gameplayStop()` fires followed by `commercialBreak()`.
   - Ensure no double events fire in succession.
4. Scan the on-screen **QR Code** using a smartphone to verify mobile touch layout and scaling.

### 6.2 Submission & Release Pipeline
1. **Submission**: Submit build ZIP, game description, and gameplay video through the developer portal.
2. **QA Review**: Poki QA tests the build against the technical guidelines.
3. **Soft Release**: If approved, the game is launched to a small test audience on specific category pages to measure play duration, retention, and monetization.
4. **Global Release**: High-performing games get featured on the Poki homepage and international portals.
