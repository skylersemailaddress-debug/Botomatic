import assert from "assert";
import fs from "fs";

const c = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");

assert(!c.includes("92%"), "must not render fake 92% health");
assert(!c.includes("All Systems Operational"), "must not render fake all systems operational");
assert(c.includes("No test run yet"), "must render no test run fallback");
assert(c.includes("Not Connected"), "must render services not connected fallback");
assert(c.includes("Database not connected"), "must render DB fallback");
assert(!c.includes("http://localhost:3000"), "must not hardcode localhost preview URL");
assert(c.includes("No terminal logs yet"), "must show terminal fallback");
assert(c.includes("No build started"), "must show build fallback");

console.log("proDashboardTruthState.test.ts passed");
