import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { DB } from "./database.ts";
import { AppError, tokenHash } from "./security.ts";
import { couponDiscount, type Coupon } from "../lib/coupons/rules.ts";
import {
  observationInput,
  productInput,
  validateStoreUrl,
  type Store,
  type LiveProduct,
} from "../domain/live.ts";

export async function getData(db: DB, userId: string) {
  const tables = await Promise.all([
    db.query("SELECT * FROM oc_products ORDER BY created_at DESC LIMIT 200"),
    db.query(
      `SELECT h.*,o.seller,o.payment,o.shipping_context,o.match_status,s.name AS store_name FROM oc_price_history h JOIN oc_offers o ON o.id=h.offer_id JOIN oc_stores s ON s.id=h.store_id ORDER BY h.collected_at DESC LIMIT 1000`,
    ),
    db.query(
      "SELECT id,name,domains,integration,status,history_allowed FROM oc_stores ORDER BY name",
    ),
    db.query("SELECT product_id FROM oc_favorites WHERE user_id=$1", [userId]),
    db.query(
      "SELECT id,product_id,target_price FROM oc_alerts WHERE user_id=$1",
      [userId],
    ),
    db.query(
      "SELECT n.id,n.message,n.read_at,n.created_at FROM oc_notifications n JOIN oc_alerts a ON a.id=n.alert_id WHERE a.user_id=$1 ORDER BY n.created_at DESC LIMIT 50",
      [userId],
    ),
    db.query("SELECT * FROM oc_coupons ORDER BY created_at DESC LIMIT 200"),
    db.query(
      "SELECT outcome,duration_ms,created_at FROM oc_fetch_logs ORDER BY created_at DESC LIMIT 30",
    ),
  ]);
  return Object.fromEntries(
    [
      "products",
      "observations",
      "stores",
      "favorites",
      "alerts",
      "notifications",
      "coupons",
      "logs",
    ].map((key, i) => [key, tables[i].rows]),
  );
}
export async function addProduct(db: DB, value: z.infer<typeof productInput>) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO oc_products(id,name,brand,model,category,gtin,mpn,condition,origin,warranty,attributes,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual')",
    [
      id,
      value.name,
      value.brand,
      value.model,
      value.category,
      value.gtin || null,
      value.mpn || null,
      value.condition,
      value.origin,
      value.warranty,
      JSON.stringify(value.attributes),
    ],
  );
  return id;
}
export async function recordObservation(
  db: DB,
  input: z.infer<typeof observationInput>,
  source: "manual" | "mercadolivre" = "manual",
) {
  return db.transaction(async (tx) => {
    const requestHash = tokenHash(`${source}:${JSON.stringify(input)}`);
    const prior = await tx.query<{
      id: string;
      context_snapshot: { requestHash?: string };
    }>(
      "SELECT id,context_snapshot FROM oc_price_history WHERE idempotency_key=$1",
      [input.idempotencyKey],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].context_snapshot.requestHash !== requestHash)
        throw new AppError(
          409,
          "Esta tentativa já foi gravada com outros valores. Recarregue o painel antes de registrar outra oferta.",
        );
      return { id: prior.rows[0].id, duplicate: true };
    }
    const product = (
      await tx.query<LiveProduct>("SELECT * FROM oc_products WHERE id=$1", [
        input.productId,
      ])
    ).rows[0];
    if (!product) throw new AppError(404, "Produto não encontrado.");
    const store = (
      await tx.query<Store>("SELECT * FROM oc_stores WHERE id=$1", [
        input.storeId,
      ])
    ).rows[0];
    if (!store) throw new AppError(400, "Loja não aprovada para registro.");
    let url: string;
    try {
      url = validateStoreUrl(input.url, store.domains);
    } catch (e) {
      throw new AppError(400, (e as Error).message);
    }
    const { rows: offers } = await tx.query<{ id: string }>(
      `INSERT INTO oc_offers(id,product_id,store_id,seller,url,match_status,match_reason,payment,shipping_context,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(product_id,store_id,url,seller,payment,shipping_context) DO UPDATE SET updated_at=now() RETURNING id`,
      [
        randomUUID(),
        input.productId,
        input.storeId,
        input.seller,
        url,
        input.exact ? "exact" : "partial",
        source === "manual"
          ? "Especificações conferidas pelo usuário, sem validação automática"
          : "Identificador e atributos conferidos pela API",
        input.payment,
        input.shippingContext,
        source,
      ],
    );
    const id = randomUUID();
    let coupon: Coupon | null = null;
    if (input.couponId) {
      coupon =
        (
          await tx.query<Coupon>("SELECT * FROM oc_coupons WHERE id=$1", [
            input.couponId,
          ])
        ).rows[0] ?? null;
      if (!coupon || !input.couponConfirmed || source !== "manual")
        throw new AppError(
          400,
          "Confirme a aplicação do cupom no carrinho antes de registrar o desconto.",
        );
      const expected = couponDiscount(
        coupon,
        input.storeId,
        input.productId,
        input.price,
        new Date(input.observedAt),
      );
      if (!expected || input.discount !== expected)
        throw new AppError(
          400,
          "O desconto não corresponde às regras, ao produto ou à validade do cupom.",
        );
    }
    const snapshot = {
      requestHash,
      seller: input.seller,
      payment: input.payment,
      shippingContext: input.shippingContext,
      match: input.exact ? "exact" : "partial",
      coupon,
    };
    await tx.query(
      `INSERT INTO oc_price_history(id,offer_id,product_id,store_id,product_price,shipping_price,fees,discount_price,available,source,source_url,source_observed_at,data_quality_status,idempotency_key,identity_snapshot,context_snapshot,coupon_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        id,
        offers[0].id,
        input.productId,
        input.storeId,
        input.price,
        input.shipping,
        input.fees,
        input.discount,
        input.available,
        source,
        url,
        input.observedAt,
        input.exact
          ? source === "manual"
            ? "user_reported"
            : "verified"
          : "partial",
        input.idempotencyKey,
        JSON.stringify(product),
        JSON.stringify(snapshot),
        coupon?.code ?? null,
      ],
    );
    if (input.available && input.exact) {
      const { rows: alerts } = await tx.query<{
        id: string;
        target_price: number;
        below_target: boolean;
      }>(
        "SELECT * FROM oc_alerts WHERE product_id=$1 AND status='active' FOR UPDATE",
        [input.productId],
      );
      for (const alert of alerts) {
        const below = input.price <= alert.target_price;
        if (below && !alert.below_target)
          await tx.query(
            "INSERT INTO oc_notifications(id,alert_id,history_id,message) VALUES($1,$2,$3,$4)",
            [
              randomUUID(),
              alert.id,
              id,
              `${product.name}: preço registrado de R$ ${(input.price / 100).toFixed(2).replace(".", ",")} atingiu seu alvo. ${source === "manual" ? "Registro manual, sem confirmação na loja." : "Fonte: API Mercado Livre."}`,
            ],
          );
        await tx.query(
          "UPDATE oc_alerts SET below_target=$2,updated_at=now() WHERE id=$1",
          [alert.id, below],
        );
      }
    }
    return { id, duplicate: false };
  });
}
export async function setFavorite(
  db: DB,
  userId: string,
  productId: string,
  saved: boolean,
) {
  if (saved)
    await db.query(
      "INSERT INTO oc_favorites(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [userId, productId],
    );
  else
    await db.query(
      "DELETE FROM oc_favorites WHERE user_id=$1 AND product_id=$2",
      [userId, productId],
    );
}
export async function setAlert(
  db: DB,
  userId: string,
  productId: string,
  target: number,
) {
  await db.query(
    `INSERT INTO oc_alerts(id,user_id,product_id,target_price) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,product_id) DO UPDATE SET target_price=$4,below_target=false,updated_at=now()`,
    [randomUUID(), userId, productId, target],
  );
}
export async function exportData(db: DB) {
  const result: Record<string, unknown> = {
    format: "oferta-certa-v1",
    exportedAt: new Date().toISOString(),
  };
  for (const table of [
    "products",
    "product_aliases",
    "stores",
    "sellers",
    "offers",
    "price_history",
    "coupons",
    "search_queries",
    "favorites",
    "alerts",
    "notifications",
    "connector_status",
    "fetch_logs",
  ])
    result[table] = (await db.query(`SELECT * FROM oc_${table}`)).rows;
  return result;
}
