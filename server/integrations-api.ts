import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database, type DB } from "./database.ts";
import {
  AppError,
  checkOrigin,
  requireUser,
  readBody,
  rateLimit,
} from "./security.ts";
import {
  connectOAuth,
  callbackOAuth,
  disconnectOAuth,
  integrationStatus,
  type Fetcher,
} from "../lib/auth/mercadolivre.ts";
import { connector } from "../lib/connectors/index.ts";
import { collectOffer } from "../lib/history/collect.ts";
import { couponInput } from "../lib/coupons/rules.ts";
import { saveCoupon } from "../lib/coupons/repository.ts";
import { meliDiagnostic } from "./meli-diagnostic.ts";

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return reply({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError)
    return reply(
      {
        error: "Confira os campos informados. " + error.issues[0]?.message,
        code: "INVALID_DATA",
      },
      400,
    );
  return reply(
    {
      error: "Não foi possível concluir esta operação. Tente novamente.",
      code: "INTERNAL",
    },
    500,
  );
}
export async function handleOAuth(
  request: Request,
  action: "connect" | "callback",
  providedDb?: DB,
  fetcher?: Fetcher,
) {
  try {
    const db = providedDb ?? (await database());
    if (action === "callback")
      await rateLimit(db, "oauth-callback-global", 60, 60);
    return action === "connect"
      ? await connectOAuth(db, request)
      : await callbackOAuth(db, request, fetcher);
  } catch (e) {
    return apiError(e);
  }
}
export async function handleIntegration(request: Request, providedDb?: DB) {
  try {
    checkOrigin(request);
    const db = providedDb ?? (await database());
    const user = await requireUser(db, request);
    const params = new URL(request.url).searchParams;
    const action = params.get("action") ?? "status";
    if (request.method === "GET" && action === "status")
      return reply(await integrationStatus(db, user.id));
    if (request.method === "GET" && action === "search") {
      await rateLimit(db, `search:${user.id}`, 20, 60);
      const query = z.string().trim().min(3).max(120).parse(params.get("q"));
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(980)
        .parse(params.get("offset") ?? 0);
      const filters = z
        .record(
          z.string().regex(/^[A-Z_0-9]{1,40}$/),
          z.string().trim().min(1).max(120),
        )
        .parse(
          params.get("attributes") ? JSON.parse(params.get("attributes")!) : {},
        );
      if (Object.keys(filters).length > 10)
        throw new AppError(400, "Use até dez filtros de atributos.");
      const result = await connector("mercadolivre", db, user.id).search(
        query,
        filters,
        offset,
      );
      await db.query(
        "INSERT INTO oc_search_queries(id,user_id,query,result_count) VALUES($1,$2,$3,$4)",
        [randomUUID(), user.id, query, result.offers.length],
      );
      return reply(result);
    }
    if (request.method === "GET" && action === "product") {
      await rateLimit(db, `product:${user.id}`, 30, 60);
      return reply(
        await connector("mercadolivre", db, user.id).product(
          z
            .string()
            .regex(/^MLB\d{4,20}$/)
            .parse(params.get("id")),
        ),
      );
    }
    if (request.method !== "POST")
      throw new AppError(405, "Operação não permitida.");
    await rateLimit(db, `integration-write:${user.id}`, 30, 60);
    if (action === "disconnect") {
      await disconnectOAuth(db, user.id);
      return reply({ ok: true });
    }
    const body = await readBody(request);
    if (action === "diagnostic") {
      z.object({}).strict().parse(body);
      await rateLimit(db, `meli-diagnostic:${user.id}`, 2, 300);
      return reply(await meliDiagnostic(db, user.id));
    }
    if (action === "collect") {
      const input = z
        .object({
          itemId: z.string().regex(/^MLB\d{4,20}$/),
          idempotencyKey: z.string().uuid(),
        })
        .strict()
        .parse(body);
      const prior = (
        await db.query<{
          id: string;
          product_id: string;
          identity_snapshot: { external_id?: string };
        }>(
          "SELECT id,product_id,identity_snapshot FROM oc_price_history WHERE idempotency_key=$1 AND source='mercadolivre'",
          [input.idempotencyKey],
        )
      ).rows[0];
      if (prior) {
        if (prior.identity_snapshot.external_id !== input.itemId)
          throw new AppError(
            409,
            "Esta tentativa já foi registrada com outro anúncio.",
          );
        return reply({
          id: prior.id,
          productId: prior.product_id,
          duplicate: true,
        });
      }
      const offer = await connector("mercadolivre", db, user.id).item(
        input.itemId,
      );
      return reply(await collectOffer(db, offer, input.idempotencyKey), 201);
    }
    if (action === "coupon")
      return reply(await saveCoupon(db, couponInput.parse(body)), 201);
    if (action === "coupon-disable") {
      const input = z.object({ id: z.string().uuid() }).strict().parse(body);
      await db.query(
        "UPDATE oc_coupons SET status='inactive',updated_at=now() WHERE id=$1",
        [input.id],
      );
      return reply({ ok: true });
    }
    throw new AppError(404, "Operação não encontrada.");
  } catch (e) {
    return apiError(e);
  }
}
