import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { handleApi } from "../../src/server/api.ts";
import {
  handleAffiliates,
  publicOffers,
} from "../../src/server/affiliates-api.ts";
import {
  validAffiliateUrl,
  affiliateInput,
  validOfferImage,
} from "../../src/domain/affiliates.ts";
import { searchPublicOffers } from "../../src/server/public-offer-search.ts";
import {
  parseOfferSearch,
  offerSearchUrl,
} from "../../src/domain/offer-search.ts";
const base = "http://127.0.0.1:4317";
process.env.APP_ORIGIN = base;
test("publicação aceita link normal confirmado, permite afiliado depois; preserva URL, expira e mantém revisões", async () => {
  const db = await createDatabase("memory://");
  let cookie = "";
  const call = (body?: unknown, action = "", origin = base) =>
    handleAffiliates(
      new Request(`${base}/api/affiliates?action=${action}`, {
        method: body ? "POST" : "GET",
        headers: {
          Cookie: cookie,
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      db,
    );
  try {
    assert.equal((await call()).status, 401);
    const setup = await handleApi(
      new Request(`${base}/api/manage?action=setup`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Afiliado teste",
          password: "senha-longa-somente-teste",
        }),
      }),
      db,
    );
    assert.equal(setup.status, 201);
    cookie = setup.headers.get("set-cookie")!.split(";")[0];
    const input = {
      id: randomUUID(),
      storeId: "mercadolivre",
      title: "Produto somente de teste",
      variant: "Azul 128 GB",
      condition: "new",
      price: 379000,
      regularPrice: null,
      shipping: null,
      productUrl: "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM",
      affiliateUrl:
        "https://www.mercadolivre.com.br/sec/teste?matt_tool=123&utm_source=site#origin",
      imageUrl: null,
      status: "draft",
      verified: true,
    };
    assert.equal((await call({ ...input, verified: false })).status, 400);
    assert.equal((await call(input, "", "https://evil.example")).status, 403);
    assert.equal((await call(input)).status, 200);
    assert.equal((await publicOffers(db)).length, 0);
    assert.equal(
      (await call({ ...input, status: "published", affiliateUrl: "" })).status,
      200,
    );
    const direct = await publicOffers(db);
    assert.equal(direct.length, 1);
    assert.equal(direct[0].productUrl, input.productUrl);
    assert.equal(direct[0].affiliateUrl, "");
    assert.equal(
      (await call({ ...input, status: "published", productUrl: "" })).status,
      400,
    );
    assert.equal(
      (
        await call({
          ...input,
          status: "published",
          affiliateUrl: "https://evil.example/item",
        })
      ).status,
      400,
    );
    assert.equal((await call({ ...input, status: "published" })).status, 200);
    const p = await publicOffers(db);
    assert.equal(p.length, 1);
    assert.equal(p[0].affiliateUrl, input.affiliateUrl);
    assert.equal("user_id" in p[0], false);
    await db.query(
      "UPDATE oc_affiliate_offers SET verified_at=now()-interval '25 hours',expires_at=now()-interval '1 hour'",
    );
    assert.equal((await publicOffers(db)).length, 0);
    assert.equal(
      (await call({ ...input, status: "published", price: 369000 })).status,
      200,
    );
    assert.equal((await publicOffers(db))[0].price, 369000);
    assert.equal((await call({ id: input.id }, "unpublish")).status, 200);
    assert.equal((await publicOffers(db)).length, 0);
    assert.equal(
      (await db.query("SELECT id FROM oc_affiliate_revisions")).rows.length,
      5,
    );
    await assert.rejects(
      () => db.query("DELETE FROM oc_affiliate_revisions"),
      /append-only/,
    );
  } finally {
    await db.close!();
  }
});
test("URLs rejeitam loja errada, credenciais e protocolos; aceitam link exato ML", () => {
  for (const u of [
    "https://mercadolivre.com.br.evil.example/item",
    "javascript:alert(1)",
    "https://user:pass@mercadolivre.com.br/item",
    "https://amazon.com.br/dp/123",
    "https://mercadolivre.com.br/",
  ])
    assert.equal(validAffiliateUrl(u, "mercadolivre", true), false);
  assert.equal(
    validAffiliateUrl(
      "https://www.mercadolivre.com.br/sec/abc?matt_tool=123",
      "mercadolivre",
      true,
    ),
    true,
  );
});

test("novas lojas preservam links e isolam preço ausente da Amazon nos filtros", async () => {
  const db = await createDatabase("memory://");
  try {
    const uid = randomUUID();
    await db.query(
      "INSERT INTO oc_admin_users(id,username,password_hash) VALUES($1,'multilojas','test-only')",
      [uid],
    );
    const baseOffer = {
      id: randomUUID(),
      storeId: "magalu",
      title: "Produto de teste",
      variant: "Modelo azul 128 GB",
      condition: "new",
      productUrl: "https://www.magazineluiza.com.br/produto/p/123456/",
      affiliateUrl:
        "https://www.magazinevoce.com.br/magazineteste/produto/p/123456/?partner_id=123#origem",
      imageUrl: null,
      price: 12345,
      regularPrice: null,
      shipping: null,
      status: "published",
      verified: true,
    };
    const magalu = affiliateInput.parse(baseOffer);
    const amazon = affiliateInput.parse({
      ...baseOffer,
      id: randomUUID(),
      storeId: "amazon",
      productUrl: "https://www.amazon.com.br/dp/B012345678",
      affiliateUrl: "https://amzn.to/teste?tag=teste-20",
      price: null,
    });
    assert.equal(
      affiliateInput.safeParse({ ...amazon, price: 100 }).success,
      false,
    );
    assert.equal(
      affiliateInput.safeParse({ ...magalu, price: null }).success,
      false,
    );
    assert.equal(
      affiliateInput.safeParse({ ...magalu, affiliateUrl: amazon.affiliateUrl })
        .success,
      false,
    );
    assert.equal(
      validAffiliateUrl("https://amzn.to.evil.example/teste", "amazon", true),
      false,
    );
    assert.equal(
      validAffiliateUrl(
        "https://www.amazon.com.br@evil.example/dp/id",
        "amazon",
        true,
      ),
      false,
    );
    assert.equal(
      validOfferImage("https://a-static.mlcdn.com.br/test.jpg", "magalu"),
      true,
    );
    assert.equal(
      validOfferImage("https://a-static.mlcdn.com.br/test.jpg", "amazon"),
      false,
    );
    for (const o of [magalu, amazon])
      await db.query(
        "INSERT INTO oc_affiliate_offers(id,user_id,store_id,title,variant,condition,product_url,affiliate_url,price,status,verified_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',now(),now()+interval '24 hours')",
        [
          o.id,
          uid,
          o.storeId,
          o.title,
          o.variant,
          o.condition,
          o.productUrl,
          o.affiliateUrl,
          o.price,
        ],
      );
    const search = (p: Record<string, string>) =>
      searchPublicOffers(db, parseOfferSearch(p));
    const all = await search({ sort: "price_desc" });
    assert.deepEqual(
      all.offers.map((o) => o.storeId),
      ["magalu", "amazon"],
    );
    assert.equal(all.offers[1].price, null);
    assert.equal(all.offers[1].affiliateUrl, amazon.affiliateUrl);
    assert.equal((await search({ store: "amazon" })).total, 1);
    assert.equal(
      (await search({ store: "magalu", min: "100", max: "150" })).total,
      1,
    );
    assert.equal((await search({ min: "0" })).total, 1);
    assert.equal((await search({ store: "amazon", max: "1000000" })).total, 0);
    assert.equal(
      new URL(
        offerSearchUrl(parseOfferSearch({ store: "amazon" }), 2),
        "https://example.com",
      ).searchParams.get("store"),
      "amazon",
    );
    await assert.rejects(
      () =>
        db.query("UPDATE oc_affiliate_offers SET price=100 WHERE id=$1", [
          amazon.id,
        ]),
      /oc_offer_store_price_policy/,
    );
  } finally {
    await db.close!();
  }
});
