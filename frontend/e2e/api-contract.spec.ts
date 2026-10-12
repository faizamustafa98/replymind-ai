import { test, expect } from "./support/fixtures";
import { getAccessToken } from "./support/supabase";

// Backend contract checks. These hit Railway directly rather than the UI, so a
// failure here points at the API rather than the frontend.
const API = process.env.E2E_API_URL ?? "https://replymind-backend-production-cb65.up.railway.app";

test.describe("Backend API contract", () => {
  test("AUTH-13: protected endpoints reject missing and invalid tokens", async ({ request, setUpUser }) => {
    const token = await getAccessToken(setUpUser);

    const ok = await request.get(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ok.status()).toBe(200);

    expect((await request.get(`${API}/api/auth/me`)).status()).toBe(401);

    const bad = await request.get(`${API}/api/auth/me`, {
      headers: { Authorization: "Bearer not.a.real.token" },
    });
    expect(bad.status()).toBe(401);
  });

  test("AUTH-15: tokens expire and are never echoed back in responses", async ({ request, setUpUser }) => {
    const token = await getAccessToken(setUpUser);

    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    expect(payload.exp).toBeGreaterThan(payload.iat);

    const res = await request.get(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(await res.text()).not.toContain(token);
  });

  test("ANLY-07: analytics summary returns the documented shape", async ({ request, setUpUser }) => {
    const token = await getAccessToken(setUpUser);

    const res = await request.get(`${API}/api/analytics/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      [
        "is_mock",
        "pending_review_count",
        "period_end",
        "period_start",
        "resolved_count",
        "total_conversations",
        "total_messages",
      ].sort()
    );
    // A brand-new tenant must report real zeroes, not demo numbers.
    expect(body.is_mock).toBe(false);
    expect(body.total_conversations).toBe(0);

    expect((await request.get(`${API}/api/analytics/summary`)).status()).toBe(401);
  });

  test("KB-10/KB-12: uploads enforce type and size limits", async ({ request, setUpUser }) => {
    const token = await getAccessToken(setUpUser);
    const auth = { Authorization: `Bearer ${token}` };

    const exe = await request.post(`${API}/api/documents`, {
      headers: auth,
      multipart: { file: { name: "bad.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") } },
    });
    expect(exe.status()).toBe(415);
    expect(await exe.text()).toContain("Unsupported file type");

    const big = await request.post(`${API}/api/documents`, {
      headers: auth,
      multipart: {
        file: { name: "big.txt", mimeType: "text/plain", buffer: Buffer.alloc(11 * 1024 * 1024, "A") },
      },
    });
    expect(big.status()).toBe(413);

    const good = await request.post(`${API}/api/documents`, {
      headers: auth,
      multipart: { file: { name: "ok.txt", mimeType: "text/plain", buffer: Buffer.from("Delivery is Rs 200.") } },
    });
    expect(good.status()).toBe(201);

    // Leave the tenant as we found it.
    const id = (await good.json()).id;
    expect((await request.delete(`${API}/api/documents/${id}`, { headers: auth })).status()).toBe(204);
  });

  test("ANLY-09: analytics cannot be scoped to someone else's tenant", async ({ request, setUpUser, freshUser }) => {
    const mine = await getAccessToken(setUpUser);
    const theirs = await getAccessToken(freshUser);

    const own = await request.get(`${API}/api/analytics/summary`, {
      headers: { Authorization: `Bearer ${mine}` },
    });
    const otherTenant = await (
      await request.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${theirs}` } })
    ).json();

    // Passing another tenant's id must be ignored — scope comes from the token.
    const forced = await request.get(`${API}/api/analytics/summary?tenant_id=${otherTenant.tenant_id}`, {
      headers: { Authorization: `Bearer ${mine}` },
    });
    expect(forced.status()).toBe(200);

    // Compare the counts only: period_start/period_end are stamped per request,
    // so a whole-body match would fail on timestamps rather than on scoping.
    const counts = (body: Record<string, unknown>) => ({
      total_conversations: body.total_conversations,
      pending_review_count: body.pending_review_count,
      resolved_count: body.resolved_count,
      total_messages: body.total_messages,
    });
    expect(counts(await forced.json())).toEqual(counts(await own.json()));
  });
});
