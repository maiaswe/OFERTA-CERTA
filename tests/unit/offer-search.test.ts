import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { encrypt } from "../../src/lib/auth/crypto.ts";
import { MercadoLivreConnector } from "../../src/lib/connectors/mercadolivre.ts";
import {
  normalizeSalePrice,
  priceFromList,
  productKey,
} from "../../src/lib/connectors/offer-pricing.ts";
process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const item = {
  id: "MLB123456",
  catalog_product_id: "MLB27172667",
  title: "iPhone 15 128 GB azul",
  currency_id: "BRL",
  price: 9999,
  permalink:
    "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM?utm_source=official#position=2",
  status: "active",
  available_quantity: 3,
  seller_id: 123,
  condition: "new",
  attributes: [{ id: "COLOR", value_name: "Azul" }],
  shipping: { free_shipping: false },
};
async function setup() {
  const db = await createDatabase("memory://");
  const uid = randomUUID();
  await db.query(
    "INSERT INTO oc_admin_users(id,username,password_hash) VALUES($1,'teste','test-only')",
    [uid],
  );
  await db.query(
    "INSERT INTO oc_oauth_connections(id,provider,user_id,provider_user_id,access_token,refresh_token,expires_at,status) VALUES($1,'mercadolivre',$2,'123',$3,$4,now()+interval '1 hour','connected')",
    [
      randomUUID(),
      uid,
      encrypt("test-access", `mercadolivre:${uid}:access`),
      encrypt("test-refresh", `mercadolivre:${uid}:refresh`),
    ],
  );
  return { db, uid };
}
test("preço atual, desconto real, canal e variante conservadora", () => {
  assert.deepEqual(
    normalizeSalePrice({ amount: 90, regular_amount: 100, currency_id: "BRL" }),
    {
      price: 9000,
      regularPrice: 10000,
      discountPercent: 10,
      priceSource: "sale_price",
    },
  );
  for (const value of [null, 0, -1, NaN, Infinity, 1.001])
    assert.throws(() =>
      normalizeSalePrice({ amount: value, currency_id: "BRL" }),
    );
  assert.equal(
    normalizeSalePrice({ amount: 100, regular_amount: 0, currency_id: "BRL" })
      .regularPrice,
    null,
  );
  assert.equal(
    normalizeSalePrice({ amount: 100, regular_amount: 90, currency_id: "BRL" })
      .discountPercent,
    null,
  );
  const p = (amount: number, context: string[]) => ({
    type: "standard",
    amount,
    currency_id: "BRL",
    conditions: { context_restrictions: context },
  });
  assert.equal(
    priceFromList({
      prices: [p(1, ["channel_mshops"]), p(20, ["channel_marketplace"])],
    }).price,
    2000,
  );
  assert.notEqual(
    productKey("MLB12345", { COLOR: "Azul" }, "new", "1"),
    productKey("MLB12345", { COLOR: "Preto" }, "new", "2"),
  );
  assert.notEqual(
    productKey(null, {}, "new", "1"),
    productKey(null, {}, "new", "2"),
  );
});
test("descoberta hidrata anúncio, usa sale_price, preserva permalink e cache", async () => {
  const { db, uid } = await setup();
  const urls: string[] = [];
  try {
    const c = new MercadoLivreConnector(db, uid, async (input) => {
      const url = new URL(String(input));
      urls.push(url.pathname);
      if (url.pathname === "/sites/MLB/search")
        return Response.json({
          results: [{ id: item.id }],
          paging: { total: 1 },
        });
      if (url.pathname.endsWith("/sale_price"))
        return Response.json({
          amount: 3790,
          currency_id: "BRL",
          regular_amount: 4000,
        });
      return Response.json(item);
    });
    const r = await c.search("iPhone 15");
    assert.equal(r.offers.length, 1);
    assert.equal(r.offers[0].price, 379000);
    assert.equal(r.offers[0].url, item.permalink);
    assert.equal(r.offers[0].shipping, null);
    assert.equal(r.unavailable.length, 0);
    assert.equal((await c.search("iPhone 15")).cache, "hit");
    assert.equal(urls.length, 3);
  } finally {
    await db.close!();
  }
});
test("403 real de detalhes deixa preço de listagem informativo, sem oferta ou link fabricados", async () => {
  const { db, uid } = await setup();
  try {
    const c = new MercadoLivreConnector(db, uid, async (input) => {
      const p = new URL(String(input)).pathname;
      if (p === "/products/search")
        return Response.json({
          results: [{ id: "MLB27172667", name: item.title }],
          paging: { total: 1 },
        });
      if (p.endsWith("/items"))
        return Response.json({
          results: [{ item_id: item.id, price: 3790, currency_id: "BRL" }],
        });
      return Response.json({ error: "forbidden" }, { status: 403 });
    });
    const r = await c.search("iPhone 15");
    assert.equal(r.offers.length, 0);
    assert.equal(r.unavailable[0].price, 379000);
    assert.equal(r.unavailable[0].reason, "MELI_PERMISSION");
    assert.equal("url" in r.unavailable[0], false);
    assert.ok(r.warnings.some((w) => w.includes("403")));
  } finally {
    await db.close!();
  }
});
test("403 em um anúncio não impede consultar os demais anúncios da página", async () => {
  const { db, uid } = await setup();
  const ids = ["MLB123451", "MLB123452", "MLB123453", "MLB123454"];
  const requested: string[] = [];
  try {
    const c = new MercadoLivreConnector(db, uid, async (input) => {
      const p = new URL(String(input)).pathname;
      if (p === "/sites/MLB/search")
        return Response.json({
          results: ids.map((id) => ({ id })),
          paging: { total: 4 },
        });
      if (p.endsWith("/sale_price"))
        return Response.json({ amount: 3790, currency_id: "BRL" });
      const id = p.split("/").at(-1)!;
      requested.push(id);
      if (id !== ids[3])
        return Response.json({ error: "access_denied" }, { status: 403 });
      return Response.json({ ...item, id });
    });
    const r = await c.search("iPhone 15");
    assert.deepEqual(requested.sort(), ids);
    assert.equal(r.offers.length, 1);
    assert.equal(r.offers[0].id, ids[3]);
    assert.equal(r.unavailable.length, 3);
  } finally {
    await db.close!();
  }
});

test("403 no preço não usa preço legado; 429 respeita pausa sem nova chamada", async () => {
  const { db, uid } = await setup();
  let calls = 0;
  try {
    const c = new MercadoLivreConnector(db, uid, async (input) => {
      calls++;
      return String(input).includes("sale_price")
        ? Response.json({ error: "forbidden" }, { status: 403 })
        : Response.json(item);
    });
    await assert.rejects(() => c.item(item.id), { code: "MELI_PERMISSION" });
    assert.equal(calls, 2);
    const limited = new MercadoLivreConnector(db, uid, async () => {
      calls++;
      return Response.json(
        {},
        { status: 429, headers: { "Retry-After": "30" } },
      );
    });
    await assert.rejects(() => limited.item(item.id), {
      code: "MELI_RATE_LIMIT",
    });
    const before = calls;
    await assert.rejects(() => limited.item(item.id), {
      code: "MELI_RATE_LIMIT",
    });
    assert.equal(calls, before);
  } finally {
    await db.close!();
  }
});

test("falha temporária em sale_price não promove preço legado nem cancela outras ofertas", async () => {
  const { db, uid } = await setup();
  const paths: string[] = [];
  try {
    const c = new MercadoLivreConnector(db, uid, async (input) => {
      const p = new URL(String(input)).pathname;
      paths.push(p);
      if (p === "/sites/MLB/search")
        return Response.json({
          results: [
            { id: item.id, price: 9999, currency_id: "BRL" },
            { id: "MLB654321" },
          ],
          paging: { total: 2 },
        });
      if (p === `/items/${item.id}/sale_price`)
        return Response.json(
          { error: "temporarily_unavailable" },
          { status: 503 },
        );
      if (p.endsWith("/sale_price"))
        return Response.json({ amount: 3790, currency_id: "BRL" });
      return Response.json({ ...item, id: p.split("/").at(-1) });
    });
    const r = await c.search("iPhone 15");
    assert.equal(r.offers.length, 1);
    assert.equal(r.offers[0].id, "MLB654321");
    assert.equal(r.offers[0].priceSource, "sale_price");
    assert.equal(r.unavailable[0].id, item.id);
    assert.equal(r.unavailable[0].price, 999900);
    assert.equal(
      paths.some((p) => p.endsWith("/prices")),
      false,
    );
  } finally {
    await db.close!();
  }
});
