import { randomUUID } from "node:crypto";
import type { DB } from "../../server/database.ts";
import { AppError } from "../../server/security.ts";
import { recordObservation } from "../../server/repository.ts";
import type { NormalizedOffer } from "../connectors/types.ts";

export async function collectOffer(
  db: DB,
  offer: NormalizedOffer,
  idempotencyKey: string,
) {
  if (process.env.MELI_HISTORY_ENABLED !== "true")
    throw new AppError(
      409,
      "A gravação do histórico da API precisa ser habilitada pelo responsável após conferir as condições de uso do Mercado Livre.",
      "HISTORY_DISABLED",
    );
  if (!["new", "used", "refurbished"].includes(offer.condition))
    throw new AppError(400, "Condição do anúncio não identificada.");
  // One identity per listing; joining different listings requires an explicit identity review.
  const id = (
    await db.query<{ id: string }>(
      `INSERT INTO oc_products(id,name,brand,model,category,gtin,mpn,condition,origin,warranty,attributes,source,external_id)
    VALUES($1,$2,$3,$4,'Outros',$5,$6,$7,'unknown',$8,$9,'mercadolivre',$10)
    ON CONFLICT(source,external_id) WHERE external_id IS NOT NULL DO UPDATE SET updated_at=now() RETURNING id`,
      [
        randomUUID(),
        offer.title,
        offer.attributes.BRAND ?? "Não informada",
        offer.attributes.MODEL ?? offer.id,
        /^(\d{8}|\d{12,14})$/.test(offer.attributes.GTIN ?? "")
          ? offer.attributes.GTIN
          : null,
        offer.attributes.MPN ?? null,
        offer.condition,
        offer.warranty,
        JSON.stringify({
          ...offer.attributes,
          source_item_id: offer.id,
          catalog_product_id: offer.catalogId ?? "",
        }),
        offer.id,
      ],
    )
  ).rows[0].id;
  const saved = (
    await db.query<{
      attributes: Record<string, string>;
      condition: string;
      warranty: string;
    }>("SELECT attributes,condition,warranty FROM oc_products WHERE id=$1", [
      id,
    ])
  ).rows[0];
  const keys = new Set([
    ...Object.keys(saved.attributes).filter(
      (k) => !["source_item_id", "catalog_product_id"].includes(k),
    ),
    ...Object.keys(offer.attributes),
  ]);
  const exact =
    saved.condition === offer.condition &&
    saved.warranty === offer.warranty &&
    [...keys].every((k) => saved.attributes[k] === offer.attributes[k]) &&
    saved.attributes.catalog_product_id === (offer.catalogId ?? "");
  const result = await recordObservation(
    db,
    {
      productId: id,
      storeId: "mercadolivre",
      url: offer.url,
      seller: `Vendedor ${offer.sellerId}`,
      price: offer.price,
      shipping: offer.shipping,
      fees: 0,
      discount: 0,
      payment: "Preço anunciado; condições no carrinho",
      shippingContext: "CEP não informado",
      observedAt: offer.observedAt,
      available: offer.available,
      exact,
      idempotencyKey,
    },
    "mercadolivre",
  );
  await db.query(
    "UPDATE oc_offers SET source_offer_id=$2 WHERE product_id=$1 AND url=$3",
    [id, offer.id, offer.url],
  );
  return { ...result, productId: id, exact };
}
