# TAG! E2E Test Infrastructure Specification

## Overview
The TAG! E2E test infrastructure provides an automated, opaque-box verification system for the vanilla JavaScript client engine (`tag/js/`), signaling server (`tag-server/`), and platform integration builds (`PokiGames/`). The test harness runs directly in Node.js without requiring external browser drivers (e.g. Selenium/Puppeteer), ensuring sub-second execution speeds, zero network flakiness, and deterministic verification across all game modes and network states.

## Architecture

```
tests/e2e/
├── harness.js                  # Core test registry, assertion engine, and DOM/sandbox mocks
├── runner.js                   # Unified CLI runner with structured diagnostics and filtering
├── tier1_feature_coverage.js   # Tier 1: Feature Coverage (>=5 test cases per feature for F1-F15)
├── tier2_boundary_corner.js    # Tier 2: Boundary & Corner Cases (>=5 test cases per feature for F1-F15)
├── tier3_cross_feature.js      # Tier 3: Cross-Feature Combinations (pairwise feature interactions)
└── tier4_real_world.js         # Tier 4: Real-World Scenarios (end-to-end match lifecycles)
```

### 1. Sandboxed Execution Engine (`harness.js`)
The harness provides sandboxed `vm.Context` instances through `createGameSandbox()`, simulating a production browser environment:
- **DOM / Window Simulation**: Full mocks for `window`, `document`, `location`, `navigator`, `localStorage`, `sessionStorage`, `performance`, `addEventListener`, `removeEventListener`, `fetch`, `Blob`, `URLSearchParams`.
- **Canvas 2D Rendering Mock (`g`)**: Intercepts and records draw calls (`fillRect`, `beginPath`, `arc`, `fillText`, etc.) without requiring headless GPU contexts.
- **Engine State Factories**: Mocks for `match`, `settings`, `menu`, `PALETTE`, `MAPS`, `THEMES`, `PAD`, `pressed`, `isTouch`, `LOCAL_TOUCH`, `GESTURE_SPLIT`, and camera `cam`.
- **Netplay Simulation**: Mocks WebRTC peer connections, ping tables, slot rosters, spectator queues, and packet handling via `netOnData`.
- **Script Isolation & Lexical Bridging**: `loadGameScript(context, file)` executes target game files in isolated contexts and bridges top-level variables (`CAREER`, `BOMB_MODE`, `crownState`, `ctfState`, `infectionState`, `NET`) into the sandbox scope.

### 2. Syntax & Secret Scanning Oracles
- **`checkSyntax(filePath)`**: Executes `node --check` against source files to detect syntax errors, unclosed comments, or invalid tokens with process exit code verification.
- **`scanFilesForPattern(targets, regex)`**: Recursively searches source trees (`tag/`, `PokiGames/`, `tag-server/`) to verify total elimination of hardcoded secrets (such as Discord webhook URLs).

## The 4-Tier Test Strategy

| Tier | Focus | Test Count | Description |
|---|---|---|---|
| **Tier 1** | Feature Coverage | 77 tests | >= 5 test cases per feature for Features 1-15, mapped to R1-R5 requirements. |
| **Tier 2** | Boundary & Corner Cases | 75 tests | Extreme inputs, empty strings, missing fields, rapid repeated inputs, and boundary values. |
| **Tier 3** | Cross-Feature Interactions | 15 tests | Pairwise interactions between game modes, network host authority, UI, and career stats. |
| **Tier 4** | Real-World Match Lifecycles | 5 scenarios | Complete end-to-end workflows from lobby setup to game execution, voting, and rematch. |
| **Total** | Full Suite | **172 tests** | Comprehensive regression and acceptance harness. |

## Running the Tests

The entire test suite is executable via a single command:

```bash
node tests/e2e/runner.js
```

### CLI Options and Filtering

```bash
# Run only Tier 1 feature coverage tests
node tests/e2e/runner.js --tier=1

# Run only tests for a specific feature (Features 1 through 15)
node tests/e2e/runner.js --feature=5

# Run tests matching a specific pattern (case-insensitive regex)
node tests/e2e/runner.js --filter="bomb"

# Combine tier and feature filters
node tests/e2e/runner.js --tier=2 --feature=12

# Verbose mode with error stack traces
node tests/e2e/runner.js --verbose

# Machine-readable JSON output for CI/CD integration
node tests/e2e/runner.js --json

# Bail immediately on the first failure
node tests/e2e/runner.js --bail
```

## Failure Diagnosis & Reporting

The test runner provides clean, structured output:
1. **Per-Test Progress**: `PASS` / `FAIL` status line with tier/feature tag, description, and execution time in milliseconds.
2. **Tier Breakdown**: Pass rates and percentages for Tiers 1 through 4.
3. **Feature Coverage Table**: Status matrix for all 15 features across Tiers 1 and 2 (`PASS`, `PARTIAL`, `PENDING`).
4. **Diagnostic Details**: Verbatim failure messages, assertion diffs, and stack traces for all failing tests.
5. **Exit Code**: Returns exit code `0` when 100% of tests pass, or `1` if any test fails, while ensuring the runner itself never crashes.
