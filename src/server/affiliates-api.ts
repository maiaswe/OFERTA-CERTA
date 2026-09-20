import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database, type DB } from "./database.ts";
import {
  AppError,
  checkOrigin,
  readBody,
  requireUser,
  rateLimit,
} from "./security.ts";
import { apiError } from "./integrations-api.ts";
import { affiliateInput, type AffiliateOffer } from "../domain/affiliates.ts";

const fields = `id,store_id AS "storeId",title,variant,condition,product_url AS "productUrl",affiliate_url AS "affiliateUrl",image_url AS "imageUrl",price,regular_price AS "regularPrice",shipping,status,verified_at AS "verifiedAt",expires_at AS "expiresAt",updated_at AS "updatedAt"`;
export async function publicOffers(db: DB) {
  return (
    await db.query<AffiliateOffer>(
      `SELECT ${fields} FROM oc_affiliate_offers WHERE status='published' AND expires_at>now() AND product_url<>'' ORDER BY verified_at DESC LIMIT 200`,
    )
  ).rows;
}
const reply = (data: unknown) =>
  Response.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function handleAffiliates(request: Request, providedDb?: DB) {
  try {
    checkOrigin(request);
    const db = providedDb ?? (await database());
    const user = await requireUser(db, request);
    if (request.method === "GET")
      return reply({
        offers: (
          await db.query<AffiliateOffer>(
            `SELECT ${fields} FROM oc_affiliate_offers WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 200`,
            [user.id],
          )
        ).rows,
      });
    if (request.method !== "POST")
      throw new AppError(405, "Operação não permitida.");
    await rateLimit(db, `affiliate-write:${user.id}`, 30, 60);
    const body = await readBody(request);
    if (new URL(request.url).searchParams.get("action") === "unpublish") {
      const { id } = z.object({ id: z.string().uuid() }).strict().parse(body);
      await db.transaction(async (tx) => {
        const row = (
          await tx.query(
            `UPDATE oc_affiliate_offers SET status='draft',updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
            [id, user.id],
          )
        ).rows[0];
        if (!row) throw new AppError(404, "Oferta não encontrada.");
        await tx.query(
          "INSERT INTO oc_affiliate_revisions(id,offer_id,snapshot) VALUES($1,$2,$3)",
          [randomUUID(), id, JSON.stringify(row)],
        );
      });
      return reply({ ok: true });
    }
    const v = affiliateInput.parse(body);
    await db.transaction(async (tx) => {
      const row = (
        await tx.query(
          `INSERT INTO oc_affiliate_offers(id,user_id,store_id,title,variant,condition,product_url,affiliate_url,image_url,price,regular_price,shipping,status,verified_at,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()+interval '24 hours')
        ON CONFLICT(id) DO UPDATE SET store_id=excluded.store_id,title=excluded.title,variant=excluded.variant,condition=excluded.condition,product_url=excluded.product_url,affiliate_url=excluded.affiliate_url,image_url=excluded.image_url,price=excluded.price,regular_price=excluded.regular_price,shipping=excluded.shipping,status=excluded.status,verified_at=now(),expires_at=excluded.expires_at,updated_at=now()
        WHERE oc_affiliate_offers.user_id=$2 RETURNING *`,
          [
            v.id,
            user.id,
            v.storeId,
            v.title,
            v.variant,
            v.condition,
            v.productUrl,
            v.affiliateUrl,
            v.imageUrl,
            v.price,
            v.regularPrice,
            v.shipping,
            v.status,
          ],
        )
      ).rows[0];
      if (!row) throw new AppError(404, "Oferta não encontrada.");
      await tx.query(
        "INSERT INTO oc_affiliate_revisions(id,offer_id,snapshot) VALUES($1,$2,$3)",
        [randomUUID(), v.id, JSON.stringify(row)],
      );
    });
    return reply({ ok: true, id: v.id });
  } catch (error) {
    return apiError(error);
  }
}
