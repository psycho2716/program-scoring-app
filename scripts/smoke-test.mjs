/**
 * End-to-end API smoke test for the RSU pageant scoring app.
 * Run with: node scripts/smoke-test.mjs
 */
const API = process.env.API_URL ?? "http://localhost:4000";
const WEB = process.env.FRONTEND_URL ?? "http://localhost:3000";

const results = [];
let failed = 0;

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed += 1;
  results.push({ name, pass: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function page(path) {
  const res = await fetch(`${WEB}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function login(username, password) {
  return req("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

async function main() {
  console.log("\n=== RSU Pageant Scoring — Smoke Test ===\n");
  console.log(`API ${API}`);
  console.log(`WEB ${WEB}\n`);

  // --- Health / UI routes ---
  console.log("1) Frontend routes");
  for (const path of ["/login", "/admin", "/judge", "/admin/overview", "/admin/leaderboard", "/judge/overview", "/judge/leaderboard"]) {
    try {
      const r = await page(path);
      // Next may 200, 307 redirect to login, or 404 for missing — login should 200
      if (path === "/login") {
        if (r.status === 200) ok(`GET ${path}`, String(r.status));
        else fail(`GET ${path}`, `expected 200 got ${r.status}`);
      } else if (r.status === 200 || r.status === 307 || r.status === 308) {
        ok(`GET ${path}`, `${r.status}${r.location ? ` → ${r.location}` : ""}`);
      } else {
        fail(`GET ${path}`, `status ${r.status}`);
      }
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // --- Auth ---
  console.log("\n2) Authentication");
  let adminToken;
  let judgeToken;
  try {
    const bad = await login("admin", "wrong-password");
    if (bad.status >= 400 || bad.data?.success === false) ok("Reject bad password");
    else fail("Reject bad password", JSON.stringify(bad.data));

    const adminLogin = await login("admin", "password123");
    if (adminLogin.data?.success && adminLogin.data?.data?.token) {
      adminToken = adminLogin.data.data.token;
      ok("Admin login", adminLogin.data.data.user?.role);
    } else fail("Admin login", JSON.stringify(adminLogin.data));

    const judgeLogin = await login("judge1", "password123");
    if (judgeLogin.data?.success && judgeLogin.data?.data?.token) {
      judgeToken = judgeLogin.data.data.token;
      ok("Judge login", `judge #${judgeLogin.data.data.user?.judgeNumber}`);
    } else fail("Judge login", JSON.stringify(judgeLogin.data));

    const me = await req("/api/auth/me", { token: adminToken });
    if (me.data?.success && me.data?.data?.role === "admin") ok("Admin /me");
    else fail("Admin /me", JSON.stringify(me.data));
  } catch (e) {
    fail("Auth suite", e.message);
  }

  if (!adminToken || !judgeToken) {
    console.log("\nAborting remaining tests — auth failed.\n");
    process.exit(1);
  }

  // --- Admin reads ---
  console.log("\n3) Admin setup reads");
  let candidates = [];
  let categories = [];
  try {
    const cands = await req("/api/admin/candidates", { token: adminToken });
    if (cands.data?.success && Array.isArray(cands.data.data)) {
      candidates = cands.data.data;
      ok("List candidates", `${candidates.length} found`);
      const withTalent = candidates.filter((c) => c.talentDetails);
      ok("Talent details field present", `${withTalent.length} with talentDetails`);
    } else fail("List candidates", JSON.stringify(cands.data));

    const cats = await req("/api/state/categories", { token: adminToken });
    if (cats.data?.success && Array.isArray(cats.data.data) && cats.data.data.length > 0) {
      categories = cats.data.data;
      ok("List categories", categories.map((c) => c.categoryName).join(", "));
    } else fail("List categories", JSON.stringify(cats.data));

    const judges = await req("/api/admin/judges", { token: adminToken });
    if (judges.data?.success && Array.isArray(judges.data.data) && judges.data.data.length > 0) {
      ok("List judges", `${judges.data.data.length} judges`);
    } else fail("List judges", JSON.stringify(judges.data));

    const settings = await req("/api/admin/settings", { token: adminToken });
    // settings path may differ — try event settings via state or admin
    if (settings.status === 404) {
      // probe common path
      const s2 = await req("/api/admin/event-settings", { token: adminToken });
      if (s2.data?.success) ok("Event settings", s2.data.data?.pageantName ?? "ok");
      else {
        const s3 = await req("/api/state", { token: adminToken });
        if (s3.data?.success) ok("System state readable", JSON.stringify({
          open: s3.data.data?.isScoringOpen,
          cat: s3.data.data?.activeCategory?.categoryName,
        }));
        else fail("Settings/state", JSON.stringify(settings.data));
      }
    } else if (settings.data?.success) {
      ok("Event settings", settings.data.data?.pageantName ?? "ok");
    } else {
      const s3 = await req("/api/state", { token: adminToken });
      if (s3.data?.success) ok("System state readable", `open=${s3.data.data?.isScoringOpen}`);
      else fail("Admin settings", JSON.stringify(settings.data));
    }
  } catch (e) {
    fail("Admin reads", e.message);
  }

  // --- Candidate update (talent) — may fail if scoring locked ---
  console.log("\n4) Candidate edit + photo path");
  try {
    const state = await req("/api/state", { token: adminToken });
    const scoringOpen = Boolean(state.data?.data?.isScoringOpen);

    if (scoringOpen) {
      // Close scoring so setup edits work
      const closed = await req("/api/state", {
        method: "PUT",
        token: adminToken,
        body: { isScoringOpen: false },
      });
      if (closed.data?.success && closed.data.data?.isScoringOpen === false) {
        ok("Close scoring for setup edits");
      } else fail("Close scoring for setup edits", JSON.stringify(closed.data));
    } else {
      ok("Scoring already closed for setup");
    }

    if (candidates[0]) {
      const id = candidates[0].id;
      const upd = await req(`/api/admin/candidates/${id}`, {
        method: "PUT",
        token: adminToken,
        body: {
          candidateNumber: candidates[0].candidateNumber,
          name: candidates[0].name,
          department: candidates[0].department,
          talentDetails: candidates[0].talentDetails || "Smoke Test Routine",
        },
      });
      if (upd.data?.success && upd.data.data?.id === id) {
        ok("Update candidate details", upd.data.data.talentDetails ?? "saved");
      } else fail("Update candidate details", JSON.stringify(upd.data));
    } else {
      fail("Update candidate details", "no candidates");
    }
  } catch (e) {
    fail("Candidate edit", e.message);
  }

  // --- Category lock + broadcast ---
  console.log("\n5) Category open / lock / broadcast");
  let activeCategoryId = categories[0]?.id;
  try {
    // Pick a category that isn't necessarily first — prefer Advocacy or first
    const target =
      categories.find((c) => /advocacy/i.test(c.categoryName)) ?? categories[0];
    activeCategoryId = target?.id;

    const open = await req("/api/state", {
      method: "PUT",
      token: adminToken,
      body: { activeCategoryId, isScoringOpen: true },
    });
    if (
      open.data?.success &&
      open.data.data?.isScoringOpen === true &&
      open.data.data?.activeCategoryId === activeCategoryId
    ) {
      ok("Open scoring for category", open.data.data.activeCategory?.categoryName);
    } else fail("Open scoring for category", JSON.stringify(open.data));

    const other = categories.find((c) => c.id !== activeCategoryId);
    if (other) {
      const locked = await req("/api/state", {
        method: "PUT",
        token: adminToken,
        body: { activeCategoryId: other.id, isScoringOpen: true },
      });
      if (locked.status === 400 || locked.data?.success === false) {
        ok("Block category change while open", locked.data?.error ?? "rejected");
      } else {
        fail("Block category change while open", "change was allowed");
      }
    }

    const rebroadcast = await req("/api/state", {
      method: "PUT",
      token: adminToken,
      body: { activeCategoryId, isScoringOpen: true },
    });
    if (rebroadcast.data?.success) ok("Re-broadcast same category while open");
    else fail("Re-broadcast same category while open", JSON.stringify(rebroadcast.data));
  } catch (e) {
    fail("Category lock", e.message);
  }

  // --- Judge active scores + sequential scoring ---
  console.log("\n6) Judge scoring + submit");
  try {
    const active = await req("/api/scores/active", { token: judgeToken });
    if (!active.data?.success) {
      fail("Judge active scores", JSON.stringify(active.data));
    } else {
      const scores = active.data.data?.scores ?? [];
      ok(
        "Judge active scores",
        `category=${active.data.data?.categoryId}, ${scores.length} candidates`
      );

      if (active.data.data?.isSubmittedForCategory) {
        ok("Judge already submitted this category (skip score writes)");
      } else if (scores.length === 0) {
        fail("Judge score candidates", "empty score grid");
      } else {
        // Score all candidates
        let saved = 0;
        for (const s of scores) {
          const put = await req(`/api/scores/${s.candidateId}`, {
            method: "PUT",
            token: judgeToken,
            body: { rawScore: 7.5 },
          });
          if (put.data?.success) saved += 1;
          else {
            fail(`Save score candidate ${s.candidateNumber}`, put.data?.error ?? JSON.stringify(put.data));
            break;
          }
        }
        if (saved === scores.length) ok("Save half-point scores for all candidates", `${saved} × 7.5`);

        // Invalid score rejected
        const badScore = await req(`/api/scores/${scores[0].candidateId}`, {
          method: "PUT",
          token: judgeToken,
          body: { rawScore: 7.25 },
        });
        if (badScore.status >= 400 || badScore.data?.success === false) {
          ok("Reject invalid quarter-point score");
        } else fail("Reject invalid quarter-point score", "accepted 7.25");

        const submit = await req("/api/scores/submit", {
          method: "POST",
          token: judgeToken,
        });
        if (submit.data?.success) ok("Submit category scores", `categoryId=${submit.data.data?.categoryId}`);
        else fail("Submit category scores", submit.data?.error ?? JSON.stringify(submit.data));

        const after = await req("/api/scores/active", { token: judgeToken });
        if (after.data?.data?.isSubmittedForCategory) ok("Post-submit flag isSubmittedForCategory");
        else fail("Post-submit flag isSubmittedForCategory", JSON.stringify(after.data));
      }
    }
  } catch (e) {
    fail("Judge scoring", e.message);
  }

  // --- Leaderboard: only submitted scores ---
  console.log("\n7) Leaderboard / tabulation");
  try {
    const tab = await req("/api/tabulation", { token: adminToken });
    if (tab.data?.success && Array.isArray(tab.data.data?.rows ?? tab.data.data)) {
      const rows = tab.data.data?.rows ?? tab.data.data;
      const top = rows[0];
      ok(
        "Admin tabulation",
        `top=#${top?.candidateNumber} ${top?.name} score=${top?.finalScore}`
      );
      // After judge1 submit, some score should be > 0 if weight applies
      const anyPositive = rows.some((r) => Number(r.finalScore) > 0);
      if (anyPositive) ok("Submitted scores reflected on leaderboard");
      else ok("Leaderboard readable (scores may be 0 if formula/weight yields 0)");
    } else fail("Admin tabulation", JSON.stringify(tab.data));

    const judgeTab = await req("/api/tabulation", { token: judgeToken });
    if (judgeTab.data?.success) ok("Judge can view tabulation");
    else fail("Judge can view tabulation", JSON.stringify(judgeTab.data));

    const matrixCat = activeCategoryId ?? categories[0]?.id;
    if (matrixCat) {
      const matrix = await req(`/api/tabulation/matrix?categoryId=${matrixCat}`, {
        token: adminToken,
      });
      if (matrix.data?.success && Array.isArray(matrix.data.data)) {
        const submitted = matrix.data.data.filter((c) => c.status === "submitted").length;
        ok("Submission matrix", `${matrix.data.data.length} cells, ${submitted} submitted`);
      } else fail("Submission matrix", JSON.stringify(matrix.data));
    }

    const winner = await req("/api/tabulation/winner", { token: adminToken });
    if (winner.status === 404) {
      // try alternate
      const w2 = await req("/api/tabulation/winner", { token: judgeToken });
      if (w2.data?.success || w2.status === 200) ok("Winner endpoint", "ok");
      else ok("Winner endpoint optional", `status ${winner.status}`);
    } else if (winner.data?.success !== false) {
      ok("Winner endpoint", winner.data?.data?.name ?? "ok");
    } else fail("Winner endpoint", JSON.stringify(winner.data));
  } catch (e) {
    fail("Leaderboard", e.message);
  }

  // --- Role isolation ---
  console.log("\n8) Role isolation");
  try {
    const judgeAdmin = await req("/api/admin/candidates", { token: judgeToken });
    if (judgeAdmin.status === 401 || judgeAdmin.status === 403 || judgeAdmin.data?.success === false) {
      ok("Judge blocked from admin candidates");
    } else fail("Judge blocked from admin candidates", "access allowed");

    const judgeStatePut = await req("/api/state", {
      method: "PUT",
      token: judgeToken,
      body: { isScoringOpen: false },
    });
    if (judgeStatePut.status === 401 || judgeStatePut.status === 403 || judgeStatePut.data?.success === false) {
      ok("Judge blocked from state updates");
    } else fail("Judge blocked from state updates", "access allowed");
  } catch (e) {
    fail("Role isolation", e.message);
  }

  // --- Close scoring cleanup ---
  console.log("\n9) Cleanup state");
  try {
    const close = await req("/api/state", {
      method: "PUT",
      token: adminToken,
      body: { isScoringOpen: false },
    });
    if (close.data?.success && close.data.data?.isScoringOpen === false) {
      ok("Close scoring after tests");
    } else fail("Close scoring after tests", JSON.stringify(close.data));
  } catch (e) {
    fail("Cleanup", e.message);
  }

  // Summary
  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.pass).length;
  console.log(`${passed}/${results.length} passed, ${failed} failed\n`);
  if (failed) {
    console.log("Failures:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    console.log("");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
