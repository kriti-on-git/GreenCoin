/**
 * GreenCoin Backend — Security Test Suite
 * ----------------------------------------
 * Run this against YOUR OWN local dev server only.
 * It probes auth, JWT handling, RBAC, and input validation for common
 * misconfigurations. Nothing here exploits a live/production system —
 * it's meant to run against http://localhost:<PORT> during development.
 *
 * Usage:
 *   node security-test-suite.js
 *
 * Requires: a running instance of your backend (npm run dev) with a
 * reachable MongoDB. Uses throwaway test accounts — safe to run repeatedly.
 */

const axios = require("axios");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000/api/v1";
const client = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? " — " + detail : ""}`);
}

function randomEmail(prefix = "sectest") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

async function main() {
  console.log(`\nRunning security suite against ${BASE_URL}\n`);

  // ---------------------------------------------------------------------
  // 1. Weak password rejection
  // ---------------------------------------------------------------------
  {
    const res = await client.post("/auth/register", {
      name: "Test User",
      email: randomEmail(),
      password: "1234567", // 7 chars, below min-8
    });
    record(
      "Rejects password under 8 chars",
      res.status === 400,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 2. NoSQL-injection-style payload in email field
  // ---------------------------------------------------------------------
  {
    const res = await client.post("/auth/login", {
      email: { $gt: "" },
      password: "whatever123",
    });
    record(
      "Rejects non-string email (NoSQL injection attempt)",
      res.status === 400,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 3. Self-assigning admin role at registration
  // ---------------------------------------------------------------------
  {
    const res = await client.post("/auth/register", {
      name: "Wannabe Admin",
      email: randomEmail(),
      password: "SuperSecret123",
      role: "admin",
    });
    record(
      "Blocks self-assigned admin role on register",
      res.status === 403 || res.status === 400,
      `status=${res.status}, error=${res.data?.error}`
    );
  }

  // ---------------------------------------------------------------------
  // 4. Case/type variants on role field
  // ---------------------------------------------------------------------
  {
    const res = await client.post("/auth/register", {
      name: "Case Test",
      email: randomEmail(),
      password: "SuperSecret123",
      role: "ADMIN",
    });
    record(
      "Rejects unexpected role casing/value",
      res.status === 400 || res.status === 403,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 5. Register a legit throwaway user, then probe login error consistency
  // ---------------------------------------------------------------------
  const knownEmail = randomEmail("known");
  const knownPassword = "CorrectPassword123";
  let validToken = null;

  {
    const reg = await client.post("/auth/register", {
      name: "Known User",
      email: knownEmail,
      password: knownPassword,
    });
    record(
      "Setup: register a valid throwaway user",
      reg.status === 201,
      `status=${reg.status}`
    );

    const loginOk = await client.post("/auth/login", {
      email: knownEmail,
      password: knownPassword,
    });
    validToken = loginOk.data?.data?.token;
    record(
      "Setup: login with correct credentials returns a token",
      loginOk.status === 200 && !!validToken,
      `status=${loginOk.status}`
    );
  }

  {
    const wrongPass = await client.post("/auth/login", {
      email: knownEmail,
      password: "TotallyWrongPassword",
    });
    const noSuchUser = await client.post("/auth/login", {
      email: randomEmail("nonexistent"),
      password: "TotallyWrongPassword",
    });
    const sameStatus = wrongPass.status === noSuchUser.status;
    const sameError = wrongPass.data?.error === noSuchUser.data?.error;
    const sameMessage = wrongPass.data?.message === noSuchUser.data?.message;
    record(
      "Login error is IDENTICAL for wrong-password vs no-such-user (no user enumeration)",
      sameStatus && sameError && sameMessage,
      `wrongPass=${JSON.stringify(wrongPass.data)} | noSuchUser=${JSON.stringify(
        noSuchUser.data
      )}`
    );
  }

  // ---------------------------------------------------------------------
  // 6. Timing attack check (rough — flags large discrepancies only)
  // ---------------------------------------------------------------------
  {
    const timeIt = async (payload) => {
      const start = process.hrtime.bigint();
      await client.post("/auth/login", payload);
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e6; // ms
    };

    const samples = 5;
    let existingTotal = 0;
    let nonExistingTotal = 0;
    for (let i = 0; i < samples; i++) {
      existingTotal += await timeIt({ email: knownEmail, password: "wrong" });
      nonExistingTotal += await timeIt({
        email: randomEmail("timing"),
        password: "wrong",
      });
    }
    const avgExisting = existingTotal / samples;
    const avgNonExisting = nonExistingTotal / samples;
    const diff = Math.abs(avgExisting - avgNonExisting);
    record(
      `Login timing difference is small (existing vs non-existing email)`,
      diff < 50, // ms — rough heuristic, not a hard security guarantee
      `avgExisting=${avgExisting.toFixed(1)}ms avgNonExisting=${avgNonExisting.toFixed(
        1
      )}ms diff=${diff.toFixed(1)}ms`
    );
  }

  // ---------------------------------------------------------------------
  // 7. JWT tampering — alg:none
  // ---------------------------------------------------------------------
  {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url"
    );
    const payload = Buffer.from(
      JSON.stringify({ id: "000000000000000000000000", role: "admin" })
    ).toString("base64url");
    const noneToken = `${header}.${payload}.`;

    const res = await client.get("/pickups", {
      headers: { Authorization: `Bearer ${noneToken}` },
    });
    record(
      "Rejects alg:none forged JWT",
      res.status === 401,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 8. JWT tampering — modified payload, unsigned
  // ---------------------------------------------------------------------
  if (validToken) {
    const [h, p, s] = validToken.split(".");
    const decodedPayload = JSON.parse(Buffer.from(p, "base64url").toString());
    decodedPayload.role = "admin";
    const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString(
      "base64url"
    );
    const tamperedToken = `${h}.${tamperedPayload}.${s}`; // old signature, new payload

    const res = await client.post(
      "/collection-centers",
      { name: "Fake Center" },
      { headers: { Authorization: `Bearer ${tamperedToken}` } }
    );
    record(
      "Rejects tampered JWT payload (role escalation attempt)",
      res.status === 401,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 9. Missing / malformed Authorization header
  // ---------------------------------------------------------------------
  {
    const noHeader = await client.get("/users/me");
    const emptyBearer = await client.get("/users/me", {
      headers: { Authorization: "Bearer" },
    });
    const garbage = await client.get("/users/me", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    record(
      "No Authorization header → 401",
      noHeader.status === 401,
      `status=${noHeader.status}`
    );
    record(
      "Empty Bearer value → 401 (no crash)",
      emptyBearer.status === 401,
      `status=${emptyBearer.status}`
    );
    record(
      "Garbage token → 401 (no crash)",
      garbage.status === 401,
      `status=${garbage.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 10. RBAC — non-admin hitting admin-only route
  // ---------------------------------------------------------------------
  if (validToken) {
    const res = await client.post(
      "/collection-centers",
      { name: "Should Not Be Created" },
      { headers: { Authorization: `Bearer ${validToken}` } }
    );
    record(
      "Regular user blocked from admin-only POST /collection-centers",
      res.status === 403,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 11. NoSQL injection via query params
  // ---------------------------------------------------------------------
  if (validToken) {
    const res = await client.get("/pickups", {
      params: { "status[$ne]": "null" },
      headers: { Authorization: `Bearer ${validToken}` },
    });
    // We just want to confirm it doesn't 500 / doesn't return everyone's data unfiltered
    record(
      "Query-param injection attempt does not crash the server",
      res.status !== 500,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 12. Oversized payload
  // ---------------------------------------------------------------------
  {
    const hugeName = "A".repeat(200_000); // ~200KB string — above the 100kb limit
    const res = await client.post("/auth/register", {
      name: hugeName,
      email: randomEmail("huge"),
      password: "SuperSecret123",
    });
    record(
      "Oversized payload handled gracefully (400/413, not a crash/500)",
      res.status === 400 || res.status === 413,
      `status=${res.status}`
    );
  }

  // ---------------------------------------------------------------------
  // 13. Rate limiting probe (brute force simulation)
  // Note: authLimiter is 10 req / 15 min. We hammer 15 attempts.
  // ---------------------------------------------------------------------
  {
    let sawRateLimit = false;
    for (let i = 0; i < 15; i++) {
      const res = await client.post("/auth/login", {
        email: randomEmail("ratelimit"),
        password: "wrong-password-" + i,
      });
      if (res.status === 429) {
        sawRateLimit = true;
        break;
      }
    }
    record(
      "Rate limiting kicks in after repeated failed login attempts",
      sawRateLimit,
      sawRateLimit
        ? "429 observed ✓"
        : "No 429 seen — rate limiter may not be active"
    );
  }

  // ---------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------
  console.log("\n---------------------------------------------");
  const passed = results.filter((r) => r.pass).length;
  console.log(`Result: ${passed}/${results.length} checks passed`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log("\nFailed checks:");
    failed.forEach((f) => console.log(`  - ${f.name}`));
  }
  console.log("---------------------------------------------\n");
}

main().catch((err) => {
  console.error("Test suite crashed — this itself may indicate a bug:", err.message);
  process.exit(1);
});
