import test from "node:test";
import assert from "node:assert/strict";
import {
  bestFinal,
  finalPrice,
  historyInPeriod,
  normalize,
  parseStoredFavorites,
  products,
  searchProducts,
  sortedOffers,
} from "../../src/domain/demo.ts";
test("busca normaliza acentos e não confunde 16 GB com 8 GB", () => {
  assert.equal(normalize(" ÁUDIO  / Sony"), "audio sony");
  assert.equal(searchProducts("RTX 4060 Ti 16 GB")[0].id, "gpu");
  assert.equal(searchProducts("RTX 4060 Ti 8 GB").length, 0);
});
test("filtro de categoria e preço não altera o catálogo", () => {
  assert.equal(searchProducts("", "Hardware", 40000)[0].id, "ssd");
  assert.equal(products.length, 4);
  assert.equal(searchProducts("produto inexistente").length, 0);
});
test("frete desconhecido não vence o custo final; variante parcial é excluída", () => {
  const offers = products[0].offers;
  assert.equal(finalPrice(offers[1]), null);
  assert.equal(bestFinal(offers)?.id, "g1");
  assert.equal(finalPrice(products[1].offers[0]), 36980);
});
test("ordenação separa preço do produto de custo final e preserva a lista", () => {
  const offers = products[0].offers.filter((o) => o.match === "exact");
  assert.equal(sortedOffers(offers, "product")[0].id, "g2");
  assert.equal(sortedOffers(offers, "final")[0].id, "g1");
  assert.equal(offers[0].id, "g1");
});
test("favoritos corrompidos ou com IDs desconhecidos são descartados", () => {
  assert.deepEqual(parseStoredFavorites("invalid"), []);
  assert.deepEqual(parseStoredFavorites('{"id":"gpu"}'), []);
  assert.deepEqual(parseStoredFavorites('["gpu",3,"unknown"]'), ["gpu"]);
});
test("histórico filtra por datas reais e preserva lacunas", () => {
  assert.equal(historyInPeriod(products[0], 7).length, 4);
  assert.equal(historyInPeriod(products[0], 365).length, 15);
  assert.ok(historyInPeriod(products[0], 30).some((p) => p.price === null));
});
