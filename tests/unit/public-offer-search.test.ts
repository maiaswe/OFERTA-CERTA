import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { handleApi } from "../../src/server/api.ts";
import {
  parseOfferSearch,
  offerSearchUrl,
} from "../../src/domain/offer-search.ts";
import { searchPublicOffers } from "../../src/server/public-offer-search.ts";

test("busca pública filtra no banco, ignora acentos, separa capacidades, pagina e protege ofertas privadas", async () => {
  const db = await createDatabase("memory://");
  const origin = "http://127.0.0.1:4317";
  process.env.APP_ORIGIN = origin;
  try {
    const setup = await handleApi(
      new Request(`${origin}/api/manage?action=setup`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Pesquisa teste",
          password: "senha-longa-para-teste",
        }),
      }),
      db,
    );
    assert.equal(setup.status, 201);
    const user = (
      await db.query<{ id: string }>("SELECT id FROM oc_admin_users")
    ).rows[0];
    for (let i = 0; i < 17; i++) {
      await db.query(
        `INSERT INTO oc_affiliate_offers(id,user_id,store_id,title,variant,condition,product_url,price,status,verified_at,expires_at) VALUES($1,$2,'mercadolivre','Café Celular Série',$3,$4,$5,$6,$7,now()-interval '2 days',now()+($8 * interval '1 hour'))`,
        [
          randomUUID(),
          user.id,
          i === 1 ? "256 GB" : i === 2 ? "1280 GB" : "128 GB azul",
          i === 0 ? "used" : "new",
          `https://produto.mercadolivre.com.br/MLB-${123456 + i}-teste-_JM`,
          (i + 1) * 10000,
          i === 15 ? "draft" : "published",
          i === 16 ? -1 : 1,
        ],
      );
    }
    const search = (params: Record<string, string>) =>
      searchPublicOffers(db, parseOfferSearch(params));
    const all = await search({ sort: "price_asc" });
    assert.equal(all.total, 15);
    assert.equal(all.offers.length, 12);
    assert.equal(all.pages, 2);
    assert.equal(all.offers[0].price, 10000);
    assert.equal("user_id" in all.offers[0], false);
    const next = await search({ sort: "price_asc", page: "2" });
    assert.equal(next.offers.length, 3);
    assert.equal(next.offers[0].price, 130000);
    assert.equal((await search({ page: "999999" })).page, 2);
    assert.equal((await search({ q: "cafe 128" })).total, 13);
    const filtered = await search({
      q: "café 128",
      condition: "new",
      min: "200,00",
      max: "500",
      sort: "price_desc",
    });
    assert.deepEqual(
      filtered.offers.map((o) => o.price),
      [50000, 40000],
    );
    assert.equal((await search({ q: "%' OR 1=1 --" })).total, 0);
    assert.equal((await search({ q: "%%" })).total, 0);
    assert.equal((await search({ min: "500", max: "100" })).total, 0);
    assert.equal((await search({ q: "notebook" })).total, 0);
  } finally {
    await db.close!();
  }
});

test("parâmetros da busca têm limites e links de paginação preservam filtros", () => {
  const f = parseOfferSearch({
    q: "  Café 128  ",
    min: "10,25",
    max: "50",
    condition: "new",
    sort: "price_asc",
    page: "2",
  });
  assert.equal(f.min, 1025);
  const url = new URL(offerSearchUrl(f, 3), "https://example.com");
  assert.equal(url.searchParams.get("q"), "Café 128");
  assert.equal(url.searchParams.get("min"), "10.25");
  assert.equal(url.searchParams.get("page"), "3");
  const invalid = parseOfferSearch({
    q: ["bad"],
    min: "1e9",
    max: "NaN",
    sort: "price; DROP",
    condition: "bad",
    page: "-1",
  });
  assert.equal(invalid.q, "");
  assert.equal(invalid.min, null);
  assert.equal(invalid.max, null);
  assert.equal(invalid.sort, "recent");
  assert.equal(invalid.condition, "");
  assert.equal(invalid.page, 1);
});
