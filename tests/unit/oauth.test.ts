import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { handleApi } from "../../src/server/api.ts";
import {
  handleOAuth,
  handleIntegration,
} from "../../src/server/integrations-api.ts";
import {
  authorizationUrl,
  accessToken,
  integrationStatus,
  disconnectOAuth,
  type Fetcher,
} from "../../src/lib/auth/mercadolivre.ts";
import { encrypt, decrypt } from "../../src/lib/auth/crypto.ts";
import {
  MercadoLivreConnector,
  normalizeOffer,
} from "../../src/lib/connectors/mercadolivre.ts";

process.env.APP_ORIGIN = "https://127.0.0.1:3000";
process.env.MELI_CLIENT_ID = "7046681029899344";
process.env.MELI_CLIENT_SECRET = "test-only-oauth-secret";
process.env.MELI_REDIRECT_URI =
  "https://127.0.0.1:3000/api/auth/mercadolivre/callback";
process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.MELI_USE_PKCE = "true";
const base = process.env.APP_ORIGIN;
const tokens = {
  access_token: "test-access-1",
  refresh_token: "test-refresh-1",
  expires_in: 21600,
  user_id: 123456,
  scope: "read offline_access",
  token_type: "Bearer",
};
const item = {
  id: "MLB123456",
  catalog_product_id: "MLB1234567",
  title: "SSD 2 TB",
  currency_id: "BRL",
  price: 999.99,
  permalink: "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM",
  status: "active",
  available_quantity: 2,
  seller_id: 123456,
  condition: "new",
  attributes: [{ id: "MODEL", value_name: "990 PRO 2 TB" }],
  shipping: { free_shipping: true },
};

test("OAuth usa URL exata, state, PKCE e criptografia autenticada", () => {
  const url = new URL(
    authorizationUrl(
      {
        clientId: process.env.MELI_CLIENT_ID!,
        redirectUri: process.env.MELI_REDIRECT_URI!,
      },
      "state-test",
      "verifier-test",
    ),
  );
  assert.equal(url.origin, "https://auth.mercadolivre.com.br");
  assert.equal(url.pathname, "/authorization");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    process.env.MELI_REDIRECT_URI,
  );
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "state-test");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge")?.length, 43);
  assert.equal(url.searchParams.has("client_secret"), false);
  const sealed = encrypt("test-token", "one-account");
  assert.equal(decrypt(sealed, "one-account"), "test-token");
  assert.throws(() => decrypt(sealed, "another-account"));
  assert.ok(!sealed.includes("test-token"));
});

test("cadastro aceita acentos, callback valida sessão/state e protege troca, refresh e desconexão", async () => {
  const db = await createDatabase("memory://");
  try {
    const setup = await handleApi(
      new Request(`${base}/api/manage?action=setup`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Matías Teste",
          password: "frase de senha para teste",
        }),
      }),
      db,
    );
    assert.equal(setup.status, 201);
    const { user } = await setup.json();
    const session = setup.headers.get("set-cookie")!.split(";")[0];
    assert.ok(setup.headers.get("set-cookie")!.includes("Secure"));
    const connectRequest = () =>
      new Request(`${base}/api/auth/mercadolivre/connect`, {
        headers: { Cookie: session },
      });
    assert.equal(
      (
        await handleOAuth(
          new Request(`${base}/api/auth/mercadolivre/connect`),
          "connect",
          db,
        )
      ).status,
      401,
    );
    const connected = await handleOAuth(connectRequest(), "connect", db);
    assert.equal(connected.status, 303);
    const auth = new URL(connected.headers.get("location")!);
    const state = auth.searchParams.get("state")!;
    const stateCookie = connected.headers.get("set-cookie")!.split(";")[0];
    const callback = (cookie = stateCookie) =>
      new Request(
        `${base}/api/auth/mercadolivre/callback?state=${state}&code=test-code`,
        { headers: { Cookie: cookie, "Sec-Fetch-Site": "cross-site" } },
      );
    let exchanges = 0;
    const exchange: Fetcher = async (url, init) => {
      exchanges++;
      assert.equal(String(url), "https://api.mercadolibre.com/oauth/token");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      const form = new URLSearchParams(String(init?.body));
      assert.equal(form.get("grant_type"), "authorization_code");
      assert.equal(form.get("code"), "test-code");
      assert.equal(form.get("redirect_uri"), process.env.MELI_REDIRECT_URI);
      assert.equal(form.get("client_secret"), process.env.MELI_CLIENT_SECRET);
      assert.ok(form.get("code_verifier"));
      return Response.json(tokens);
    };
    const missingCookie = await handleOAuth(
      callback(""),
      "callback",
      db,
      exchange,
    );
    assert.ok(missingCookie.headers.get("location")?.includes("OAUTH_STATE"));
    assert.equal(exchanges, 0);
    const response = await handleOAuth(callback(), "callback", db, exchange);
    assert.ok(response.headers.get("location")?.endsWith("oauth=connected"));
    assert.equal(exchanges, 1);
    assert.ok(response.headers.get("set-cookie")?.includes("Max-Age=0"));
    assert.ok(
      (await handleOAuth(callback(), "callback", db, exchange)).headers
        .get("location")
        ?.includes("OAUTH_STATE"),
    );
    assert.equal(exchanges, 1);
    const row = (
      await db.query<{ access_token: string; refresh_token: string }>(
        "SELECT access_token,refresh_token FROM oc_oauth_connections",
      )
    ).rows[0];
    assert.ok(row.access_token.startsWith("v1."));
    assert.ok(!row.refresh_token.includes(tokens.refresh_token));
    assert.equal(await accessToken(db, user.id, exchange), tokens.access_token);
    const publicStatus = JSON.stringify(await integrationStatus(db, user.id));
    assert.ok(!publicStatus.includes(tokens.access_token));
    assert.ok(!publicStatus.includes("access_token"));
    assert.ok(!publicStatus.includes("refresh_token"));
    const exported = await handleApi(
      new Request(`${base}/api/manage?action=export`, {
        headers: { Cookie: session },
      }),
      db,
    );
    assert.ok(!(await exported.text()).includes("oauth_connections"));
    await db.query(
      "UPDATE oc_oauth_connections SET expires_at=now()-interval '1 minute'",
    );
    let refreshes = 0;
    const refresh: Fetcher = async (_url, init) => {
      refreshes++;
      const form = new URLSearchParams(String(init?.body));
      assert.equal(form.get("grant_type"), "refresh_token");
      assert.equal(form.get("refresh_token"), tokens.refresh_token);
      return Response.json({
        ...tokens,
        access_token: "test-access-2",
        refresh_token: "test-refresh-2",
      });
    };
    assert.deepEqual(
      await Promise.all([
        accessToken(db, user.id, refresh),
        accessToken(db, user.id, refresh),
      ]),
      ["test-access-2", "test-access-2"],
    );
    assert.equal(refreshes, 1);
    const rotated = (
      await db.query<{ refresh_token: string }>(
        "SELECT refresh_token FROM oc_oauth_connections",
      )
    ).rows[0];
    assert.equal(
      decrypt(rotated.refresh_token, `mercadolivre:${user.id}:refresh`),
      "test-refresh-2",
    );
    const c = new MercadoLivreConnector(db, user.id, async (_url, init) => {
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer test-access-2",
      );
      return Response.json(
        String(_url).includes("/sale_price")
          ? { amount: 999.99, currency_id: "BRL", regular_amount: null }
          : item,
      );
    });
    assert.equal((await c.item("MLB123456")).price, 99999);
    const rejected = new MercadoLivreConnector(db, user.id, async () =>
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    await assert.rejects(() => rejected.item("MLB123456"), /permissão/);
    await db.query(
      "UPDATE oc_oauth_connections SET expires_at=now()-interval '1 minute'",
    );
    await assert.rejects(
      () =>
        accessToken(db, user.id, async () =>
          Response.json(
            { error: "invalid_grant", refresh_token: "sensitive-body" },
            { status: 400 },
          ),
        ),
      /Reconecte/,
    );
    const invalid = (
      await db.query<{
        status: string;
        access_token: string | null;
        refresh_token: string | null;
      }>("SELECT status,access_token,refresh_token FROM oc_oauth_connections")
    ).rows[0];
    assert.deepEqual(invalid, {
      status: "invalid",
      access_token: null,
      refresh_token: null,
    });
    assert.ok(
      !JSON.stringify(await integrationStatus(db, user.id)).includes(
        "sensitive-body",
      ),
    );
    assert.equal(
      (
        await handleIntegration(
          new Request(`${base}/api/integrations?action=disconnect`, {
            method: "POST",
            headers: { Cookie: session, Origin: "https://evil.example" },
          }),
          db,
        )
      ).status,
      403,
    );
    await disconnectOAuth(db, user.id);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM oc_oauth_connections",
        )
      ).rows[0].status,
      "disconnected",
    );
    for (const failure of ["expired", "denied"]) {
      const started = await handleOAuth(connectRequest(), "connect", db);
      const flowState = new URL(
        started.headers.get("location")!,
      ).searchParams.get("state");
      const flowCookie = started.headers.get("set-cookie")!.split(";")[0];
      if (failure === "expired")
        await db.query(
          "UPDATE oc_oauth_states SET expires_at=now()-interval '1 minute'",
        );
      const failed = await handleOAuth(
        new Request(
          `${base}/api/auth/mercadolivre/callback?state=${flowState}&${failure === "denied" ? "error=access_denied" : "code=test-code"}`,
          { headers: { Cookie: flowCookie } },
        ),
        "callback",
        db,
        exchange,
      );
      assert.ok(
        failed.headers
          .get("location")
          ?.includes(failure === "denied" ? "OAUTH_DENIED" : "OAUTH_STATE"),
      );
      assert.equal(exchanges, 1);
      if (failure === "denied")
        assert.equal(
          (await db.query("SELECT state_hash FROM oc_oauth_states")).rows
            .length,
          0,
        );
    }
    const second = await handleOAuth(connectRequest(), "connect", db);
    const secondState = new URL(
      second.headers.get("location")!,
    ).searchParams.get("state");
    await db.query("DELETE FROM oc_sessions");
    const loggedOut = await handleOAuth(
      new Request(
        `${base}/api/auth/mercadolivre/callback?state=${secondState}&code=test-code`,
        {
          headers: { Cookie: second.headers.get("set-cookie")!.split(";")[0] },
        },
      ),
      "callback",
      db,
      exchange,
    );
    assert.ok(loggedOut.headers.get("location")?.includes("OAUTH_STATE"));
    assert.equal(exchanges, 1);
  } finally {
    await db.close?.();
  }
});

test("normalização exige BRL e link da loja; frete promocional continua desconhecido sem CEP", () => {
  const normalized = normalizeOffer(item);
  assert.equal(normalized.price, 99999);
  assert.equal(normalized.shipping, null);
  assert.equal(normalized.attributes.MODEL, "990 PRO 2 TB");
  assert.throws(() => normalizeOffer({ ...item, currency_id: "USD" }));
  assert.throws(() =>
    normalizeOffer({ ...item, permalink: "https://evil.example" }),
  );
  assert.equal(normalizeOffer({ ...item, status: "paused" }).available, false);
  assert.throws(() => normalizeOffer({ ...item, price: 10.123 }));
});
