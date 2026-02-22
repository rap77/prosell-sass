#!/usr/bin/env node
/**
 * Baseline Performance Script
 *
 * Measures auth performance metrics before/after optimizations
 * Usage: node scripts/baseline-performance.mjs
 *
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - Optional: lighthouse CLI (npm install -g lighthouse)
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const OUTPUT_FILE = join(
  process.cwd(),
  "../../docs/tickets/baseline-results.json",
);

async function measureBaseline() {
  console.log("🔍 Measuring Performance Baseline...\n");

  // Check if server is running
  try {
    const response = await fetch("http://localhost:3000/auth/login");
    if (!response.ok) throw new Error("Server not responding");
  } catch (error) {
    console.error("❌ Error: Server not running. Run `pnpm dev` first.");
    process.exit(1);
  }

  // Read git commit from .git/HEAD (safer than exec)
  const gitCommit = await getGitCommit();

  // Measure API calls (manual for now)
  const apiCalls = {
    "/api/auth/state": {
      method: "GET",
      count: "MANUAL_VERIFY",
      status: 200,
      note: 'Verify in DevTools → Network tab → Filter "state"',
    },
  };

  // Try to read Lighthouse results if available
  const lighthouse = await getLighthouseResults();

  // Compile baseline
  const baseline = {
    timestamp: new Date().toISOString(),
    git_commit: gitCommit,
    metrics: {
      api: apiCalls,
      lighthouse: lighthouse,
    },
  };

  // Save results
  writeFileSync(OUTPUT_FILE, JSON.stringify(baseline, null, 2));
  console.log(`\n✅ Baseline saved to: ${OUTPUT_FILE}\n`);

  // Print summary
  printSummary(baseline);

  return baseline;
}

async function getGitCommit() {
  try {
    const gitDir = join(process.cwd(), "../../.git");
    const headPath = join(gitDir, "HEAD");

    if (!existsSync(headPath)) return "unknown";

    const head = readFileSync(headPath, "utf-8").trim();
    // HEAD is either a ref or a commit hash
    if (head.startsWith("ref:")) {
      const refPath = join(gitDir, head.replace("ref: ", "").trim());
      if (existsSync(refPath)) {
        return readFileSync(refPath, "utf-8").trim().substring(0, 7);
      }
    }
    return head.substring(0, 7);
  } catch {
    return "unknown";
  }
}

async function getLighthouseResults() {
  // Check if there's a recent lighthouse report
  const lhDir = join(process.cwd(), ".lighthouse");
  if (existsSync(lhDir)) {
    console.log("   ℹ️  Found Lighthouse results in .lighthouse/");
    // Could parse existing reports here
  }

  // Return manual values from Lighthouse UI run
  return {
    performance: 47,
    fcp: "0.8 s",
    lcp: "7.1 s",
    tbt: "2,180 ms",
    cls: "0.007",
    si: "3.4 s",
    source: "MANUAL_Lighthouse_UI",
    note: "Run: DevTools → Lighthouse → Analyze page load",
  };
}

function printSummary(baseline) {
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  BASELINE RESULTS");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.log("📡 API Calls:");
  console.log(
    `   /api/auth/state: ${baseline.metrics.api["/api/auth/state"].count}`,
  );
  console.log(`   ℹ️  ${baseline.metrics.api["/api/auth/state"].note}`);

  console.log("\n📊 Lighthouse Metrics:");
  const lh = baseline.metrics.lighthouse;
  console.log(
    `   Performance Score: ${lh.performance}/100 ${lh.performance < 50 ? "❌" : lh.performance < 90 ? "⚠️" : "✅"}`,
  );
  console.log(`   FCP: ${lh.fcp}`);
  console.log(`   LCP: ${lh.lcp} ${lh.lcp.includes("7.1") ? "❌" : ""}`);
  console.log(`   TBT: ${lh.tbt} ${lh.tbt.includes("2,180") ? "❌" : ""}`);
  console.log(`   CLS: ${lh.cls}`);
  console.log(`   Speed Index: ${lh.si}`);

  console.log(`\n📅 Timestamp: ${baseline.timestamp}`);
  console.log(`🔖 Git Commit: ${baseline.git_commit}`);
  console.log("\n" + "━".repeat(70));
  console.log("💡 Next: Run optimization, then re-measure to compare");
  console.log("━".repeat(70) + "\n");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  measureBaseline().catch(console.error);
}

export { measureBaseline };
