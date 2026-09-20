import type { DB } from "./database.ts";
import type { AffiliateOffer } from "../domain/affiliates.ts";
import type { OfferSearch } from "../domain/offer-search.ts";

const fields = `id,store_id AS "storeId",title,variant,condition,product_url AS "productUrl",affiliate_url AS "affiliateUrl",image_url AS "imageUrl",price,regular_price AS "regularPrice",shipping,status,verified_at AS "verifiedAt",expires_at AS "expiresAt",updated_at AS "updatedAt"`;
export async function searchPublicOffers(db: DB, filters: OfferSearch) {
  const params: unknown[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const clauses = ["status='published'", "expires_at>now()", "product_url<>''"];
  const text =
    "translate(lower(title || ' ' || variant),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')";
  for (const token of filters.tokens) {
    // Numeric boundaries prevent 128 GB from matching 1280 GB.
    clauses.push(
      /^\d+$/.test(token)
        ? `${text} ~ ${bind(`(^|[^0-9])${token}([^0-9]|$)`)}`
        : `${text} LIKE ${bind(`%${token}%`)}`,
    );
  }
  if (filters.q && !filters.tokens.length) clauses.push("false");
  if (filters.condition) clauses.push(`condition=${bind(filters.condition)}`);
  if (filters.store) clauses.push(`store_id=${bind(filters.store)}`);
  if (filters.min !== null) clauses.push(`price>=${bind(filters.min)}`);
  if (filters.max !== null) clauses.push(`price<=${bind(filters.max)}`);
  const where = clauses.join(" AND ");
  const count = await db.query<{ total: number }>(
    `SELECT count(*)::integer AS total FROM oc_affiliate_offers WHERE ${where}`,
    params,
  );
  const total = count.rows[0].total;
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const order =
    filters.sort === "price_asc"
      ? "price ASC NULLS LAST"
      : filters.sort === "price_desc"
        ? "price DESC NULLS LAST"
        : "verified_at DESC";
  const offers = (
    await db.query<AffiliateOffer>(
      `SELECT ${fields} FROM oc_affiliate_offers WHERE ${where} ORDER BY ${order},id ASC LIMIT ${bind(pageSize)} OFFSET ${bind((page - 1) * pageSize)}`,
      params,
    )
  ).rows;
  return { offers, total, page, pages };
}
