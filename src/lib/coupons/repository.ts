import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { DB } from "../../server/database.ts";
import { AppError } from "../../server/security.ts";
import { validateStoreUrl } from "../../domain/live.ts";
import type { couponInput } from "./rules.ts";

export async function saveCoupon(db: DB, input: z.infer<typeof couponInput>) {
  const store = (
    await db.query<{ domains: string[] }>(
      "SELECT domains FROM oc_stores WHERE id=$1",
      [input.storeId],
    )
  ).rows[0];
  if (!store) throw new AppError(400, "Escolha uma das lojas cadastradas.");
  let url: string;
  try {
    url = validateStoreUrl(input.sourceUrl, store.domains);
  } catch {
    throw new AppError(
      400,
      "A fonte do cupom precisa ser um link HTTPS da loja selecionada.",
    );
  }
  if (input.productIds.length) {
    const count = (
      await db.query("SELECT id FROM oc_products WHERE id=ANY($1::uuid[])", [
        input.productIds,
      ])
    ).rows.length;
    if (count !== new Set(input.productIds).size)
      throw new AppError(400, "Um produto do cupom não foi encontrado.");
  }
  const id = input.id ?? randomUUID();
  await db.query(
    `INSERT INTO oc_coupons(id,store_id,code,discount_type,amount,minimum_purchase,eligible_product_ids,starts_at,ends_at,source_url,last_verified_at,rules,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11,$12)
    ON CONFLICT(id) DO UPDATE SET store_id=excluded.store_id,code=excluded.code,discount_type=excluded.discount_type,amount=excluded.amount,
    minimum_purchase=excluded.minimum_purchase,eligible_product_ids=excluded.eligible_product_ids,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
    source_url=excluded.source_url,rules=excluded.rules,status=excluded.status,updated_at=now()`,
    [
      id,
      input.storeId,
      input.code,
      input.type,
      input.amount,
      input.minimumPurchase,
      JSON.stringify(input.productIds),
      input.validFrom,
      input.validUntil,
      url,
      input.rules,
      input.status,
    ],
  );
  return { id };
}
