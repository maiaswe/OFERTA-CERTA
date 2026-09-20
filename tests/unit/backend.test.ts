import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { handleApi } from "../../src/server/api.ts";
import { validateStoreUrl } from "../../src/domain/live.ts";
import { checkOrigin } from "../../src/server/security.ts";

test("conta, acesso, histórico imutável, favorito, alerta, exportação e saída", async () => {
  const db = await createDatabase("memory://");
  let cookie = "";
  const call = (
    action: string,
    body?: unknown,
    origin = "http://127.0.0.1:4317",
  ) =>
    handleApi(
      new Request(`http://127.0.0.1:4317/api/manage?action=${action}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      db,
    );
  try {
    assert.equal((await call("data")).status, 401);
    assert.equal(
      (
        await call(
          "setup",
          { username: "teste", password: "senha-comprida-para-teste" },
          "https://outro-site.example",
        )
      ).status,
      403,
    );
    const setup = await call("setup", {
      username: "teste",
      password: "senha-comprida-para-teste",
    });
    assert.equal(setup.status, 201);
    cookie = setup.headers.get("set-cookie")!.split(";")[0];
    assert.match(setup.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
    const p = await call("product", {
      name: "SSD de teste",
      brand: "Samsung",
      model: "990 PRO 2TB",
      category: "Hardware",
      condition: "new",
      origin: "national",
      gtin: "",
      mpn: "MZ-V9P2T0BW",
    });
    assert.equal(p.status, 201);
    const { id: productId } = await p.json();
    assert.equal(
      (await call("favorite", { productId, saved: true })).status,
      200,
    );
    assert.equal(
      (await call("alert", { productId, target: 20000 })).status,
      200,
    );
    const input = {
      productId,
      storeId: "kabum",
      url: "https://www.kabum.com.br/produto/teste?utm_source=teste",
      seller: "Loja teste",
      price: 15000,
      shipping: null,
      fees: 0,
      discount: 0,
      payment: "Pix",
      shippingContext: "São Paulo/SP",
      observedAt: new Date().toISOString(),
      available: true,
      exact: true,
      idempotencyKey: randomUUID(),
    };
    const first = await call("observation", input);
    assert.equal(first.status, 201);
    assert.equal((await first.json()).duplicate, false);
    const repeat = await call("observation", input);
    assert.equal((await repeat.json()).duplicate, true);
    assert.equal(
      (await call("observation", { ...input, price: 16000 })).status,
      409,
    );
    const data = await (await call("data")).json();
    assert.equal(data.observations.length, 1);
    assert.equal(data.observations[0].final_price, null);
    assert.equal(data.notifications.length, 1);
    assert.equal(data.favorites.length, 1);
    assert.equal(data.observations[0].source, "manual");
    assert.ok(!data.observations[0].source_url.includes("utm_"));
    await assert.rejects(
      () => db.query("UPDATE oc_price_history SET product_price=1"),
      /append-only/,
    );
    await assert.rejects(
      () => db.query("DELETE FROM oc_price_history"),
      /append-only/,
    );
    assert.equal(
      (
        await call("observation", {
          ...input,
          url: "https://kabum.com.br.evil.example/test",
          idempotencyKey: randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("observation", {
          ...input,
          price: -1,
          idempotencyKey: randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("observation", {
          ...input,
          shipping: 1000,
          fees: 100,
          discount: 500,
          idempotencyKey: randomUUID(),
        })
      ).status,
      201,
    );
    const after = await (await call("data")).json();
    assert.equal(after.observations.length, 2);
    assert.equal(after.observations[0].final_price, 15600);
    assert.equal(after.notifications.length, 1);
    const exported = await (await call("export")).json();
    assert.equal(exported.price_history.length, 2);
    assert.equal(exported.sessions, undefined);
    assert.equal(exported.admin_users, undefined);
    assert.equal((await call("logout", {})).status, 200);
    assert.equal((await call("data")).status, 401);
    const login = await call("login", {
      username: "teste",
      password: "senha-comprida-para-teste",
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await (await call("data")).json()).favorites.length, 1);
    assert.equal(
      (
        await call("setup", {
          username: "outro",
          password: "senha-comprida-para-teste",
        })
      ).status,
      409,
    );
  } finally {
    await db.close?.();
  }
});
test("links aceitam apenas HTTPS e domínios da loja", () => {
  assert.throws(() =>
    validateStoreUrl("http://kabum.com.br/a", ["kabum.com.br"]),
  );
  assert.throws(() =>
    validateStoreUrl("https://usuario:senha@kabum.com.br/a", ["kabum.com.br"]),
  );
  assert.throws(() =>
    validateStoreUrl("https://127.0.0.1/a", ["kabum.com.br"]),
  );
  assert.equal(
    validateStoreUrl("https://www.kabum.com.br/a#x", ["kabum.com.br"]),
    "https://www.kabum.com.br/a",
  );
});
test("origem fixa aceita Host público quando Next usa localhost internamente", () => {
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("http://localhost:4317/api/manage", {
        headers: { host: "127.0.0.1:4317" },
      }),
    ),
  );
  assert.throws(() =>
    checkOrigin(
      new Request("http://localhost:4317/api/manage", {
        headers: { host: "outro-site.example" },
      }),
    ),
  );
});
