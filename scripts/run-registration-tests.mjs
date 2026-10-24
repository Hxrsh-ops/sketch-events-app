/**
 * SKETCHHUB — Standalone Registration Systems Test Suite Runner
 * 
 * Executes the authoritative test suite that exercises the real
 * registration implementation (validateAndProcessRegistration) and schemas
 * without duplicating business logic or schemas.
 * 
 * Run with: node scripts/run-registration-tests.mjs
 */

import { startVitest } from "vitest/node";

async function run() {
  console.log("\n=======================================================");
  console.log(" SKETCHHUB — Registration Systems Test Suite (Authoritative)");
  console.log("=======================================================\n");

  const vitest = await startVitest("test", ["src/__tests__/registration-actions.test.ts"], {
    run: true,
  });

  const failedCount = vitest?.state?.getCountOfFailedTests() ?? 0;
  await vitest?.close();

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
