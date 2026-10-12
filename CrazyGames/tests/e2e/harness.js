/**
 * TAG! E2E Test Harness
 * Comprehensive opaque-box test runner framework, DOM/browser simulation,
 * and game engine sandboxing for Node.js.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const child_process = require('child_process');
const assert = require('assert');

// Root directory of the repository
const REPO_ROOT = path.resolve(__dirname, '../..');

/**
 * Test Registry & Execution Engine
 */
class TestSuiteRegistry {
  constructor() {
    this.tests = [];
    this.currentSuite = '';
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.describe = this.describe.bind(this);
    this.test = this.test.bind(this);
    this.it = this.it.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.clear = this.clear.bind(this);
  }

  describe(name, fn) {
    const prevSuite = this.currentSuite;
    this.currentSuite = prevSuite ? `${prevSuite} > ${name}` : name;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn, meta = {}) {
    const fullName = this.currentSuite ? `${this.currentSuite} > ${name}` : name;
    this.tests.push({
      name: fullName,
      fn,
      meta: {
        tier: meta.tier || 1,
        feature: meta.feature || null,
        ...meta
      }
    });
  }

  it(name, fn, meta = {}) {
    this.test(name, fn, meta);
  }

  beforeAll(fn) { this.beforeAllHooks.push(fn); }
  afterAll(fn) { this.afterAllHooks.push(fn); }
  beforeEach(fn) { this.beforeEachHooks.push(fn); }
  afterEach(fn) { this.afterEachHooks.push(fn); }

  clear() {
    this.tests = [];
    this.currentSuite = '';
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
  }
}

const registry = new TestSuiteRegistry();

/**
 * Assertion Library
 */
function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected, `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      return this;
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected, `Expected deep equality: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
      return this;
    },
    toBeTruthy() {
      assert.ok(actual, `Expected truthy value, got ${actual}`);
      return this;
    },
    toBeFalsy() {
      assert.ok(!actual, `Expected falsy value, got ${actual}`);
      return this;
    },
    toBeNull() {
      assert.strictEqual(actual, null, `Expected null, got ${actual}`);
      return this;
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined, `Expected undefined, got ${actual}`);
      return this;
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined, `Expected defined value, got undefined`);
      return this;
    },
    toContain(item) {
      if (Array.isArray(actual)) {
        assert.ok(actual.includes(item), `Expected array to contain ${JSON.stringify(item)}: ${JSON.stringify(actual)}`);
      } else if (typeof actual === 'string') {
        assert.ok(actual.includes(item), `Expected string to contain ${JSON.stringify(item)}: "${actual}"`);
      } else if (actual instanceof Set) {
        assert.ok(actual.has(item), `Expected Set to contain ${JSON.stringify(item)}`);
      } else if (typeof actual === 'object' && actual !== null) {
        assert.ok(item in actual, `Expected object to have key ${item}`);
      } else {
        throw new Error(`Unsupported type for toContain: ${typeof actual}`);
      }
      return this;
    },
    toBeGreaterThan(n) {
      assert.ok(actual > n, `Expected ${actual} > ${n}`);
      return this;
    },
    toBeLessThan(n) {
      assert.ok(actual < n, `Expected ${actual} < ${n}`);
      return this;
    },
    toBeGreaterThanOrEqual(n) {
      assert.ok(actual >= n, `Expected ${actual} >= ${n}`);
      return this;
    },
    toBeLessThanOrEqual(n) {
      assert.ok(actual <= n, `Expected ${actual} <= ${n}`);
      return this;
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert.ok(diff < tolerance, `Expected ${actual} to be close to ${expected} (diff: ${diff}, tol: ${tolerance})`);
      return this;
    },
    toThrow(errorPattern) {
      assert.ok(typeof actual === 'function', 'Actual value must be a function for toThrow()');
      let threw = false;
      let caughtErr = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        caughtErr = err;
      }
      assert.ok(threw, 'Expected function to throw, but it did not throw');
      if (errorPattern) {
        const msg = (caughtErr && caughtErr.message) || String(caughtErr);
        if (errorPattern instanceof RegExp) {
          assert.match(msg, errorPattern);
        } else if (typeof errorPattern === 'string') {
          assert.ok(msg.includes(errorPattern), `Expected error message "${msg}" to contain "${errorPattern}"`);
        }
      }
      return this;
    },
    not: {
      toBe(expected) {
        assert.notStrictEqual(actual, expected, `Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
        return this;
      },
      toEqual(expected) {
        assert.notDeepStrictEqual(actual, expected, `Expected values NOT to be deeply equal`);
        return this;
      },
      toContain(item) {
        if (Array.isArray(actual)) {
          assert.ok(!actual.includes(item), `Expected array NOT to contain ${JSON.stringify(item)}`);
        } else if (typeof actual === 'string') {
          assert.ok(!actual.includes(item), `Expected string NOT to contain ${JSON.stringify(item)}`);
        } else if (actual instanceof Set) {
          assert.ok(!actual.has(item), `Expected Set NOT to contain ${JSON.stringify(item)}`);
        }
        return this;
      },
      toThrow() {
        assert.ok(typeof actual === 'function', 'Actual value must be a function');
        try {
          actual();
        } catch (err) {
          throw new Error(`Expected function NOT to throw, but threw: ${err.message}`);
        }
        return this;
      }
    }
  };
}

/**
 * Syntax Verification Helper
 * Executes node --check on a script file
 */
function checkSyntax(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    return { valid: false, error: `File not found: ${fullPath}`, code: 1 };
  }
  const res = child_process.spawnSync(process.execPath, ['--check', fullPath], {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return {
    valid: res.status === 0,
    error: (res.stderr || res.stdout || '').trim(),
    code: res.status
  };
}

/**
 * Secret Scanner Helper
 * Recursively scans directory or array of files for regex pattern
 */
function scanFilesForPattern(targets, regex, extensions = ['.js', '.html', '.json']) {
  const matches = [];
  const filesToScan = [];

  function collectFiles(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (path.basename(p) === 'node_modules' || path.basename(p) === '.git') return;
      for (const child of fs.readdirSync(p)) {
        collectFiles(path.join(p, child));
      }
    } else if (stat.isFile()) {
      if (extensions.some(ext => p.endsWith(ext))) {
        filesToScan.push(p);
      }
    }
  }

  const targetArray = Array.isArray(targets) ? targets : [targets];
  for (const t of targetArray) {
    const full = path.isAbsolute(t) ? t : path.join(REPO_ROOT, t);
    if (fs.existsSync(full)) {
      collectFiles(full);
    }
  }

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        matches.push({
          file: path.relative(REPO_ROOT, file),
          line: i + 1,
          lineContent: lines[i].trim()
        });
      }
    }
  }

  return matches;
}

/**
 * Mock In-Memory Storage
 */
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(i) { return Array.from(this.store.keys())[i] || null; }
}

/**
 * Mock 2D Canvas Context
 */
function createMockCanvasContext() {
  const drawCalls = [];
  const ctx = {
    drawCalls,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '16px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: () => drawCalls.push({ type: 'save' }),
    restore: () => drawCalls.push({ type: 'restore' }),
    beginPath: () => drawCalls.push({ type: 'beginPath' }),
    closePath: () => drawCalls.push({ type: 'closePath' }),
    moveTo: (x, y) => drawCalls.push({ type: 'moveTo', x, y }),
    lineTo: (x, y) => drawCalls.push({ type: 'lineTo', x, y }),
    arc: (x, y, r, s, e) => drawCalls.push({ type: 'arc', x, y, r, s, e }),
    rect: (x, y, w, h) => drawCalls.push({ type: 'rect', x, y, w, h }),
    strokeRect: (x, y, w, h) => drawCalls.push({ type: 'strokeRect', x, y, w, h }),
    fillRect: (x, y, w, h) => drawCalls.push({ type: 'fillRect', x, y, w, h }),
    stroke: () => drawCalls.push({ type: 'stroke' }),
    fill: () => drawCalls.push({ type: 'fill' }),
    measureText: (text) => ({ width: (String(text).length || 0) * 8 }),
    fillText: (text, x, y) => drawCalls.push({ type: 'fillText', text, x, y }),
    strokeText: (text, x, y) => drawCalls.push({ type: 'strokeText', text, x, y }),
    clearRect: (x, y, w, h) => drawCalls.push({ type: 'clearRect', x, y, w, h }),
    setTransform: () => {},
    translate: (x, y) => drawCalls.push({ type: 'translate', x, y }),
    scale: (x, y) => drawCalls.push({ type: 'scale', x, y }),
    rotate: (a) => drawCalls.push({ type: 'rotate', a }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  };
  return ctx;
}

/**
 * Isolated Game Sandbox Factory
 * Initializes VM context with all required browser globals and engine structures
 */
function createGameSandbox(options = {}) {
  const localStorage = new MockStorage();
  const sessionStorage = new MockStorage();
  const mockCtx = createMockCanvasContext();
  const zones = [];
  const toastMessages = [];
  const sfxEvents = [];

  const sandbox = {
    // Standard Global Objects
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,

    // Browser / DOM Mocks
    localStorage,
    sessionStorage,
    performance: {
      now: () => Date.now()
    },
    document: {
      fullscreenElement: null,
      webkitFullscreenElement: null,
      mozFullScreenElement: null,
      msFullscreenElement: null,
      webkitIsFullScreen: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      getElementById: (id) => ({
        id,
        innerHTML: '',
        style: {},
        appendChild: () => {},
        scrollTop: 0,
        scrollHeight: 100
      }),
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        getContext: () => mockCtx,
        appendChild: () => {},
        setAttribute: () => {}
      })
    },
    location: {
      hostname: 'localhost',
      origin: 'http://localhost',
      search: '',
      href: 'http://localhost'
    },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    Blob: class Blob { constructor() {} },
    URLSearchParams: URLSearchParams,
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: {
      userAgent: 'Node-E2E-Harness',
      maxTouchPoints: options.isTouch ? 5 : 0
    },

    // Engine Core & Lifecycle Objects
    match: null,
    parts: [],
    CG: { gameplayStart: () => {}, gameplayStop: () => {}, happytime: () => {} },
    VOICE: { enabled: false, peers: new Map(), muted: false },
    SESSION_METRICS: {
      startTime: Date.now(),
      matchesStarted: 0,
      matchesCompleted: 0,
      rageQuits: 0,
      normalQuits: 0,
      humanWins: 0,
      botWins: 0,
      modesPlayed: {},
      botDifficulty: 'hard',
      avgFps: 60
    },
    inputFor: () => ({ up: false, down: false, left: false, right: false, jump: false }),
    updateParts: () => {},
    updateCam: () => {},
    cam: { x: 0, y: 0, zoom: 1 },
    physUpdate: () => {},
    myVoterId: () => 'local_0',
    quitToMenu: () => { sandbox.screen = 'menu'; },
    startMatch: () => {},
    telemetrySendSessionPing: () => {},
    telemetryTrackMatchEnded: () => {},
    ensureUniqueLocalColors: () => {},
    LOCAL_TOUCH: {
      showTutorial: false,
      p1: { joyId: null, active: false, left: false, right: false, offX: 0, visOffX: 0, spX: 0, sldId: null, sldV: 0, jumpHeld: false, jumpEdge: false, downHeld: false },
      p2: { joyId: null, active: false, left: false, right: false, offX: 0, visOffX: 0, spX: 0, sldId: null, sldV: 0, jumpHeld: false, jumpEdge: false, downHeld: false }
    },
    GESTURE_SPLIT: { showTutorial: false },

    // Engine Canvas & Dimensions
    CW: 960,
    CH: 540,
    W: 2400,
    H: 1400,
    WALL: 80,
    INK: '#1e293b',
    g: mockCtx,
    isTouch: !!options.isTouch,

    // UI Click Zones
    zone: (x, y, w, h, opts) => {
      zones.push({ x, y, w, h, opts, fn: opts ? opts.fn : null });
    },
    getZones: () => zones,
    clearZones: () => { zones.length = 0; },

    // Palette & Maps & Themes
    PALETTE: [
      { c: '#ff4757', n: 'Crimson' },
      { c: '#2ed573', n: 'Emerald' },
      { c: '#1e90ff', n: 'Sapphire' },
      { c: '#ffa502', n: 'Amber' },
      { c: '#9b59b6', n: 'Amethyst' },
      { c: '#1abc9c', n: 'Turquoise' },
      { c: '#e84393', n: 'Pink' },
      { c: '#fdcb6e', n: 'Gold' },
      { c: '#6c5ce7', n: 'Iris' },
      { c: '#00cec9', n: 'Cyan' }
    ],
    MAPS: [
      { name: 'Classic', solids: [{ x: 0, y: 1300, w: 2400, h: 100, t: 'solid' }] },
      { name: 'Sky Islands', solids: [{ x: 0, y: 1300, w: 2400, h: 100, t: 'solid' }] },
      { name: 'Pillar City', solids: [{ x: 0, y: 1300, w: 2400, h: 100, t: 'solid' }] }
    ],
    THEMES: [
      { name: 'Sunset', bg1: '#ff7e5f', bg2: '#feb47b' },
      { name: 'Ocean', bg1: '#2b5876', bg2: '#4e4376' }
    ],
    currentThemeIdx: 0,
    matchIndex: 1,
    lastStartIT: 0,
    MAXP: 10,

    // Audio & Feedback Stubs
    muted: false,
    sfx: (name) => sfxEvents.push(name),
    getSfxEvents: () => sfxEvents,
    toggleSound: () => { sandbox.muted = !sandbox.muted; },
    toggleFullscreen: () => {},
    togglePause: () => {
      if (sandbox.match) {
        sandbox.match.state = (sandbox.match.state === 'paused') ? 'playing' : 'paused';
      }
    },
    confetti: () => {},
    dust: () => {},
    ringP: () => {},
    tagBurst: () => {},
    toast: (msg) => toastMessages.push(msg),
    netToast: (msg) => toastMessages.push(msg),
    getToasts: () => toastMessages,

    // Drawing Helper Stubs
    rr: (ctx, x, y, w, h, r) => mockCtx.drawCalls.push({ type: 'rr', x, y, w, h, r }),
    pill: (x, y, w, h, bg, border) => mockCtx.drawCalls.push({ type: 'pill', x, y, w, h, bg, border }),
    txt: (text, x, y, font, color, align) => mockCtx.drawCalls.push({ type: 'txt', text, x, y }),
    ptxt: (text, x, y, font, color) => mockCtx.drawCalls.push({ type: 'ptxt', text, x, y }),
    FN: (sz, weight) => `${weight || 400} ${sz}px sans-serif`,
    FT: (sz) => `bold ${sz}px sans-serif`,
    fmtTime: (sec) => {
      const s = Math.max(0, Math.ceil(sec));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${m}:${rem < 10 ? '0' : ''}${rem}`;
    },
    rand: (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),

    // Geometric Collision Helpers
    hitRect: (r1, r2) => {
      if (!r1 || !r2) return false;
      return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    },
    hitRectInclusive: (r1, r2) => {
      if (!r1 || !r2) return false;
      return r1.x <= r2.x + r2.w && r1.x + r1.w >= r2.x && r1.y <= r2.y + r2.h && r1.y + r1.h >= r2.y;
    },

    // Player Factory & Level Builder Stubs
    makePlayer: (idx, slot, colIdx) => ({
      slot: slot !== undefined ? slot : idx,
      colIdx: colIdx !== undefined ? colIdx : idx,
      team: slot % 2,
      x: 200 + idx * 100,
      y: 1200,
      w: 46,
      h: 46,
      vx: 0,
      vy: 0,
      grounded: true,
      isEliminated: false,
      isFrozen: false,
      isInfected: false,
      isPatientZero: false,
      isLoneSurvivor: false,
      shieldT: 0,
      crownPoints: 0,
      tags: 0,
      survivalT: 0
    }),
    buildLevel: () => {},
    activeSlots: () => {
      const act = [];
      for (let s = 0; s < sandbox.menu.slotColor.length; s++) {
        if (sandbox.menu.slotColor[s] >= 0) act.push(s);
      }
      return act;
    },

    // Engine Input States
    PAD: [{}, {}, {}, {}],
    pressed: new Set(),
    anyPressed: (keys) => keys.some(k => sandbox.pressed.has(k)),

    // Engine Global Settings & Menu
    screen: 'menu',
    settings: {
      map: 0,
      gameMode: 'party',
      time: 60,
      teams: false,
      doubleJump: true,
      collision: false,
      ctfTargetCaptures: 3,
      hunterRed: 0,
      hunterBlue: 1
    },
    menu: {
      tab: 'solo',
      mode: 'main',
      row: 0,
      slotColor: [0, 1, -1, -1, -1, -1, -1, -1, -1, -1],
      slotTeam: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      botOn: false,
      mapVote: null
    },

    // Netplay State Mock
    NET: {
      role: null, // null (offline), 'host', or 'guest'
      isHost: false,
      mySlot: 0,
      myId: 'local_host',
      conns: new Map(),
      peerSlots: new Map([['local_host', 0]]),
      hostInputs: new Map([[0, { owner: 'local_host' }]]),
      pings: new Map(),
      spectators: [],
      slotsCtrl: [0, 1],
      slotsReady: [1, 1],
      slotsName: ['Host', 'Guest1'],
      botSlots: [],
      lobbyLocked: false,
      teamsLocked: false
    },

    // Interface Contract Implementations (matching PROJECT.md)
    isModeHost: () => {
      if (typeof sandbox.NET === 'undefined' || !sandbox.NET || sandbox.NET.role === null) return true;
      return !!sandbox.NET.isHost;
    },

    // Bot navigation helpers
    botWallAhead: () => null,
    botCeilAbove: () => null,
    botFullyOnDrop: () => false,
    botGroundAhead: () => true,
    botReset: () => {}
  };

  // Circular root references
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.root = sandbox;

  const context = vm.createContext(sandbox);
  return context;
}

/**
 * Script Evaluator Helper
 * Reads and executes script file inside sandbox context, returning execution result and any errors
 */
function loadGameScript(context, relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: new Error(`Script file not found: ${fullPath}`) };
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  const bridge = `
;try{ if(typeof CAREER !== 'undefined' && !globalThis.CAREER) globalThis.CAREER = CAREER; }catch(e){}
;try{ if(typeof BOMB_MODE !== 'undefined' && !globalThis.BOMB_MODE) globalThis.BOMB_MODE = BOMB_MODE; }catch(e){}
;try{ if(typeof crownState !== 'undefined' && !globalThis.crownState) globalThis.crownState = crownState; }catch(e){}
;try{ if(typeof ctfState !== 'undefined' && !globalThis.ctfState) globalThis.ctfState = ctfState; }catch(e){}
;try{ if(typeof infectionState !== 'undefined' && !globalThis.infectionState) globalThis.infectionState = infectionState; }catch(e){}
;try{ if(typeof NET !== 'undefined' && globalThis.NET && globalThis.NET !== NET) {
  for(const k of Object.keys(globalThis.NET)){
    try{ NET[k] = globalThis.NET[k]; }catch(ee){}
  }
  globalThis.NET = NET;
} }catch(e){}
`;
  try {
    const script = new vm.Script(code + '\n' + bridge, { filename: path.basename(fullPath) });
    script.runInContext(context);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err };
  }
}

module.exports = {
  registry,
  expect,
  checkSyntax,
  scanFilesForPattern,
  createGameSandbox,
  loadGameScript,
  REPO_ROOT
};
