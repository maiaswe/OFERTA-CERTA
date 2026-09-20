import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../../src/server/database.ts";
import { saveCoupon } from "../../src/lib/coupons/repository.ts";
import { couponDiscount, type Coupon } from "../../src/lib/coupons/rules.ts";
import { finalPrice, toCents } from "../../src/lib/pricing/money.ts";
import { collectOffer } from "../../src/lib/history/collect.ts";
import { recordObservation } from "../../src/server/repository.ts";
import type { NormalizedOffer } from "../../src/lib/connectors/types.ts";
import { historicalStats, type Observation } from "../../src/domain/live.ts";

test("dinheiro em centavos, desconhecido não vira zero e percentuais não usam ponto flutuante", () => {
  assert.equal(toCents(19.99), 1999);
  assert.equal(toCents("0.29"), 29);
  assert.throws(() => toCents("1.999"));
  assert.throws(() => toCents(-10));
  assert.equal(finalPrice(10000, null, 0, 1000), null);
  assert.equal(finalPrice(10000, 1500, 100, 1000), 10600);
  assert.throws(() => finalPrice(100, 0, 0, 101));
  const coupon = {
    store_id: "kabum",
    discount_type: "percent",
    amount: 1000,
    minimum_purchase: 2000,
    status: "unverified",
    eligible_product_ids: ["product"],
    starts_at: "2026-01-01",
    ends_at: "2027-01-01",
  } as Coupon;
  assert.equal(
    couponDiscount(coupon, "kabum", "product", 2999, new Date("2026-06-01")),
    299,
  );
  assert.equal(
    couponDiscount(coupon, "kabum", "another", 2999, new Date("2026-06-01")),
    0,
  );
  assert.equal(
    couponDiscount(coupon, "amazon", "product", 2999, new Date("2026-06-01")),
    0,
  );
  assert.equal(
    couponDiscount(coupon, "kabum", "product", 2999, new Date("2027-06-01")),
    0,
  );
});

test("coleta mantém identidade, preserva histórico e exige confirmação do cupom", async () => {
  const db = await createDatabase("memory://");
  process.env.MELI_HISTORY_ENABLED = "true";
  try {
    const offer: NormalizedOffer = {
      id: "MLB123456",
      catalogId: "MLB456789",
      title: "SSD 2 TB",
      price: 100000,
      currency: "BRL",
      url: "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM",
      image: null,
      status: "active",
      available: true,
      sellerId: "123456",
      shipping: null,
      shippingLabel: "A confirmar",
      condition: "new",
      warranty: "12 meses",
      attributes: { MODEL: "SSD 2 TB" },
      observedAt: new Date().toISOString(),
    };
    const one = await collectOffer(db, offer, randomUUID());
    const two = await collectOffer(
      db,
      { ...offer, price: 90000 },
      randomUUID(),
    );
    assert.equal(one.productId, two.productId);
    const changed = await collectOffer(
      db,
      { ...offer, attributes: { MODEL: "SSD 1 TB" } },
      randomUUID(),
    );
    assert.equal(changed.exact, false);
    const history = (
      await db.query<Observation>(
        "SELECT * FROM oc_price_history ORDER BY collected_at",
      )
    ).rows;
    assert.equal(history.length, 3);
    assert.equal(history[0].product_price, 100000);
    assert.equal(history[1].final_price, null);
    assert.equal(history[2].data_quality_status, "partial");
    const stats = historicalStats(history, history[0].offer_id);
    assert.equal(stats?.count, 2);
    assert.equal(stats?.low, 90000);
    assert.equal(stats?.label, "Histórico insuficiente");
    const couponInput = {
      storeId: "mercadolivre",
      code: "TESTE10",
      type: "percent" as const,
      amount: 1000,
      minimumPurchase: 0,
      productIds: [one.productId],
      validFrom: new Date(Date.now() - 86400000).toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      sourceUrl: "https://www.mercadolivre.com.br/cupons",
      rules: "Somente produto de teste",
      status: "unverified" as const,
    };
    const coupon = await saveCoupon(db, couponInput);
    await assert.rejects(
      () =>
        saveCoupon(db, { ...couponInput, sourceUrl: "https://evil.example" }),
      /fonte/,
    );
    const observation = {
      productId: one.productId,
      storeId: "mercadolivre",
      url: offer.url,
      seller: "Vendedor 123456",
      price: 100000,
      shipping: 0,
      fees: 0,
      discount: 10000,
      payment: "Pix",
      shippingContext: "CEP de teste",
      observedAt: offer.observedAt,
      available: true,
      exact: true,
      idempotencyKey: randomUUID(),
      couponId: coupon.id,
    };
    await assert.rejects(() => recordObservation(db, observation), /Confirme/);
    await assert.rejects(
      () =>
        recordObservation(db, {
          ...observation,
          couponConfirmed: true,
          discount: 9999,
        }),
      /desconto/,
    );
    await recordObservation(db, { ...observation, couponConfirmed: true });
    const recorded = (
      await db.query<{ coupon_code: string; final_price: number }>(
        "SELECT coupon_code,final_price FROM oc_price_history WHERE idempotency_key=$1",
        [observation.idempotencyKey],
      )
    ).rows[0];
    assert.equal(recorded.coupon_code, "TESTE10");
    assert.equal(recorded.final_price, 90000);
    await saveCoupon(db, { ...couponInput, id: coupon.id, amount: 500 });
    assert.equal(
      (
        await db.query<{ final_price: number }>(
          "SELECT final_price FROM oc_price_history WHERE idempotency_key=$1",
          [observation.idempotencyKey],
        )
      ).rows[0].final_price,
      90000,
    );
    await assert.rejects(
      () => db.query("DELETE FROM oc_price_history"),
      /append-only/,
    );
  } finally {
    delete process.env.MELI_HISTORY_ENABLED;
    await db.close?.();
  }
});
