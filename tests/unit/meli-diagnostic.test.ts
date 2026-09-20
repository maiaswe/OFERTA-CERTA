import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { encrypt } from "../../src/lib/auth/crypto.ts";
import { meliDiagnostic } from "../../src/server/meli-diagnostic.ts";
import { handleIntegration } from "../../src/server/integrations-api.ts";
process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.MELI_CLIENT_ID = "7046681029899344";
process.env.MELI_CLIENT_SECRET = "diagnostic-secret-private";
process.env.APP_ORIGIN = "http://127.0.0.1:4317";
async function setup() {
  const db = await createDatabase("memory://"),
    uid = randomUUID();
  await db.query(
    "INSERT INTO oc_admin_users(id,username,password_hash) VALUES($1,'test','test-only')",
    [uid],
  );
  await db.query(
    "INSERT INTO oc_oauth_connections(id,provider,user_id,provider_user_id,access_token,refresh_token,expires_at,status) VALUES($1,'mercadolivre',$2,'123',$3,$4,now()+interval '1 hour','connected')",
    [
      randomUUID(),
      uid,
      encrypt("diagnostic-access-private", `mercadolivre:${uid}:access`),
      encrypt("diagnostic-refresh-private", `mercadolivre:${uid}:refresh`),
    ],
  );
  return { db, uid };
}
test("diagnóstico preserva corpo e request ID, filtra dados privados e registra 403 interno do lote", async () => {
  const { db, uid } = await setup();
  try {
    const raw =
      '{"error":"access_denied","message":"Access to the requested resource is forbidden","status":403,"cause":null}';
    const r = await meliDiagnostic(db, uid, async (input, options) => {
      assert.equal(
        new Headers(options?.headers).get("authorization"),
        "Bearer diagnostic-access-private",
      );
      const p = new URL(String(input)).pathname;
      if (p === "/users/me")
        return Response.json({
          id: 123,
          site_id: "MLB",
          email: "private@example.com",
          status: { site_status: "active" },
        });
      if (p.endsWith("/grants"))
        return Response.json({
          grants: [{ user_id: 123, scopes: ["read"], access_token: "hidden" }],
        });
      if (p.startsWith("/applications/"))
        return Response.json({
          id: 7046681029899344,
          active: true,
          client_secret: "hidden",
        });
      if (p === "/products/search") return Response.json({ results: [] });
      if (p.startsWith("/products/")) return Response.json({ results: [] });
      if (p === "/items/bulk")
        return Response.json([
          {
            id: "MLB6288254546",
            status_code: 403,
            error: {
              message: "diagnostic-access-private",
              refresh_token: "diagnostic-refresh-private",
              cpf: 123456789,
            },
          },
        ]);
      if (p.endsWith("/sale_price"))
        return Response.json(
          {
            error: "denied",
            client_secret: "diagnostic-secret-private",
            cause: {
              email: "private@example.com",
              address: { nested: { secret: "value" } },
            },
          },
          { status: 403 },
        );
      return new Response(raw, {
        status: 403,
        headers: { "x-request-id": "upstream-request-id" },
      });
    });
    assert.equal(r.checks.length, 11);
    assert.equal(r.stoppedEarly, false);
    const item = r.checks.find((c) => c.url.endsWith("/items/MLB6288254546"))!;
    assert.equal(item.errorBody, raw);
    assert.equal(item.requestId, "upstream-request-id");
    assert.equal(item.bodyRedacted, false);
    assert.equal(r.providerUserId, "123");
    assert.equal(r.execution.platform, "local");
    const text = JSON.stringify(r);
    for (const secret of [
      "diagnostic-access-private",
      "diagnostic-refresh-private",
      "diagnostic-secret-private",
      "private@example.com",
      "123456789",
      "hidden",
    ])
      assert.equal(text.includes(secret), false);
    assert.match(text, /REDACTED/);
  } finally {
    await db.close!();
  }
});
test("diagnóstico para em 429 e exige autenticação no endpoint privado", async () => {
  const { db, uid } = await setup();
  let calls = 0;
  try {
    const denied = await handleIntegration(
      new Request("http://127.0.0.1:4317/api/integrations?action=diagnostic", {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:4317",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      db,
    );
    assert.equal(denied.status, 401);
    const r = await meliDiagnostic(db, uid, async () => {
      calls++;
      return Response.json({ error: "too_many_requests" }, { status: 429 });
    });
    assert.equal(calls, 1);
    assert.equal(r.stoppedEarly, true);
  } finally {
    await db.close!();
  }
});
