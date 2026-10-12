#!/usr/bin/env node
/**
 * TAG! E2E Test Suite Runner
 * Usage:
 *   node tests/e2e/runner.js [options]
 *
 * Options:
 *   --tier=<1|2|3|4>    Run only tests for specified tier
 *   --feature=<1..15>   Run only tests for specified feature
 *   --filter=<pattern>  Filter tests by name pattern (regex)
 *   --verbose           Print verbose logs and stack traces
 *   --json              Emit machine-readable JSON results
 *   --bail              Stop on first failure
 */

const path = require('path');
const { registry } = require('./harness');

// Parse CLI flags
const args = process.argv.slice(2);
const options = {
  tier: null,
  feature: null,
  filter: null,
  verbose: false,
  json: false,
  bail: false
};

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    options.tier = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--feature=')) {
    options.feature = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--filter=')) {
    options.filter = new RegExp(arg.split('=')[1], 'i');
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--json') {
    options.json = true;
  } else if (arg === '--bail') {
    options.bail = true;
  }
}

// Load test suites
require('./tier1_feature_coverage');
require('./tier2_boundary_corner');
require('./tier3_cross_feature');
require('./tier4_real_world');

const FEATURE_NAMES = {
  1: 'Syntax Fixes Across Codebase',
  2: 'Game Mode Runtime Exports & Init',
  3: 'Mode Selection Fallback Prevention',
  4: 'Infection Mode Unlocking & Wiring',
  5: 'Discord Webhook Secret Elimination',
  6: 'Netplay Peer Identity Validation',
  7: 'Signaling Server Room Closure Auth',
  8: 'Post-Match Map Vote Hotkeys',
  9: 'Pause Menu Navigation Wrapping',
  10: 'Touch Slot Clamping Removal',
  11: 'Infection HUD Control Overlay',
  12: 'Host Authority in Bomb Tag',
  13: 'Host Authority in Capture the Flag',
  14: 'Bot AI Autonomous Roaming',
  15: 'Career Stats Recording Idempotency'
};

async function run() {
  const allTests = registry.tests;
  const filteredTests = allTests.filter(t => {
    if (options.tier && t.meta.tier !== options.tier) return false;
    if (options.feature && t.meta.feature !== options.feature) return false;
    if (options.filter && !options.filter.test(t.name)) return false;
    return true;
  });

  if (!options.json) {
    console.log('='.repeat(80));
    console.log(' TAG! Comprehensive E2E Test Runner');
    console.log(` Discovered: ${allTests.length} tests | Selected: ${filteredTests.length} tests`);
    if (options.tier) console.log(` Filter: Tier ${options.tier}`);
    if (options.feature) console.log(` Filter: Feature ${options.feature} (${FEATURE_NAMES[options.feature] || ''})`);
    if (options.filter) console.log(` Filter: Pattern /${options.filter.source}/i`);
    console.log('='.repeat(80));
    console.log();
  }

  const results = [];
  const startTime = Date.now();

  for (const hook of registry.beforeAllHooks) {
    try { await hook(); } catch (err) { console.error('Error in beforeAll hook:', err); }
  }

  for (const t of filteredTests) {
    for (const hook of registry.beforeEachHooks) {
      try { await hook(); } catch (err) { /* ignore */ }
    }

    const tStart = Date.now();
    let passed = false;
    let error = null;

    try {
      const res = t.fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
      passed = true;
    } catch (err) {
      passed = false;
      error = err;
    }
    const duration = Date.now() - tStart;

    results.push({
      name: t.name,
      meta: t.meta,
      passed,
      duration,
      error: error ? { message: error.message, stack: error.stack } : null
    });

    if (!options.json) {
      const tag = `[T${t.meta.tier || '?'}${t.meta.feature ? ` F${t.meta.feature}` : ''}]`;
      const statusStr = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(` ${statusStr} ${tag.padEnd(8)} ${t.name} (${duration}ms)`);
      if (!passed && options.verbose) {
        console.log(`      \x1b[33mError: ${error.message}\x1b[0m`);
        if (error.stack) {
          const firstStack = error.stack.split('\n').slice(1, 3).join('\n');
          console.log(`      ${firstStack}`);
        }
      }
    }

    for (const hook of registry.afterEachHooks) {
      try { await hook(); } catch (err) { /* ignore */ }
    }

    if (!passed && options.bail) {
      break;
    }
  }

  for (const hook of registry.afterAllHooks) {
    try { await hook(); } catch (err) { console.error('Error in afterAll hook:', err); }
  }

  const totalDuration = Date.now() - startTime;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  if (options.json) {
    console.log(JSON.stringify({
      summary: {
        total: results.length,
        passed: passedCount,
        failed: failedCount,
        durationMs: totalDuration
      },
      results
    }, null, 2));
    process.exitCode = failedCount > 0 ? 1 : 0;
    return;
  }

  // Tier Breakdown
  console.log();
  console.log('-'.repeat(80));
  console.log(' TIER BREAKDOWN');
  console.log('-'.repeat(80));
  for (let tier = 1; tier <= 4; tier++) {
    const tierResults = results.filter(r => r.meta.tier === tier);
    if (tierResults.length === 0) continue;
    const tierPassed = tierResults.filter(r => r.passed).length;
    const pct = Math.round((tierPassed / tierResults.length) * 100);
    const color = tierPassed === tierResults.length ? '\x1b[32m' : '\x1b[33m';
    console.log(` Tier ${tier}: ${color}${tierPassed}/${tierResults.length} passed (${pct}%)\x1b[0m`);
  }

  // Feature Coverage Table
  console.log();
  console.log('-'.repeat(80));
  console.log(' FEATURE COVERAGE BREAKDOWN (Features 1 - 15)');
  console.log('-'.repeat(80));
  console.log(' Feature | Name                                   | T1 (Pass/Tot) | T2 (Pass/Tot) | Status');
  console.log('-'.repeat(80));
  for (let f = 1; f <= 15; f++) {
    const t1F = results.filter(r => r.meta.tier === 1 && r.meta.feature === f);
    const t2F = results.filter(r => r.meta.tier === 2 && r.meta.feature === f);

    const t1Pass = t1F.filter(r => r.passed).length;
    const t2Pass = t2F.filter(r => r.passed).length;

    const fName = (FEATURE_NAMES[f] || '').slice(0, 38).padEnd(38);
    const t1Col = `${t1Pass}/${t1F.length}`.padEnd(13);
    const t2Col = `${t2Pass}/${t2F.length}`.padEnd(13);

    const allPassed = (t1Pass === t1F.length) && (t2Pass === t2F.length) && (t1F.length + t2F.length > 0);
    const statusLabel = allPassed ? '\x1b[32mPASS\x1b[0m' : (t1Pass + t2Pass > 0 ? '\x1b[33mPARTIAL\x1b[0m' : '\x1b[31mPENDING\x1b[0m');

    console.log(` F${String(f).padEnd(6)} | ${fName} | ${t1Col} | ${t2Col} | ${statusLabel}`);
  }

  // Failed Tests Diagnostic Summary
  if (failedCount > 0) {
    console.log();
    console.log('-'.repeat(80));
    console.log(` DIAGNOSTIC: ${failedCount} FAILING TEST(S) DETAILS`);
    console.log('-'.repeat(80));
    let failIdx = 1;
    for (const r of results) {
      if (!r.passed) {
        console.log(`${failIdx}. [T${r.meta.tier} F${r.meta.feature || '-'}] ${r.name}`);
        console.log(`   Message: \x1b[31m${r.error ? r.error.message : 'Unknown failure'}\x1b[0m`);
        failIdx++;
      }
    }
  }

  console.log();
  console.log('='.repeat(80));
  const finalColor = failedCount === 0 ? '\x1b[32m' : '\x1b[31m';
  console.log(` ${finalColor}FINAL RESULT: ${passedCount} PASSED, ${failedCount} FAILED in ${(totalDuration / 1000).toFixed(2)}s\x1b[0m`);
  console.log('='.repeat(80));

  // Exit with non-zero if tests failed (standard CI/CD), while runner itself ran to completion cleanly
  process.exit(failedCount > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal unhandled runner exception:', err);
  process.exit(1);
});
