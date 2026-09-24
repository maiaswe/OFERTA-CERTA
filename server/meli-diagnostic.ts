import type { DB } from "./database.ts";
import { accessToken, type Fetcher } from "../lib/auth/mercadolivre.ts";

type Json = Record<string, unknown>;
const object = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export type DiagnosticCheck = {
  method: "GET";
  url: string;
  requestedAt: string;
  completedAt: string;
  status: number | null;
  requestId: string | null;
  summary?: unknown;
  errorBody?: string;
  bodyRedacted?: boolean;
  transportError?: string;
};
export async function meliDiagnostic(
  db: DB,
  userId: string,
  fetcher: Fetcher = fetch,
) {
  const startedAt = new Date().toISOString();
  const token = await accessToken(db, userId, fetcher);
  const appId = process.env.MELI_CLIENT_ID ?? "";
  if (!/^\d+$/.test(appId)) throw new Error("Invalid application ID");
  const checks: DiagnosticCheck[] = [];
  const deadline = Date.now() + 45000;
  let stopped = false;
  let providerUserId: string | null = null;
  const clean = (raw: string) => {
    let text = raw;
    for (const secret of [
      token,
      process.env.MELI_CLIENT_SECRET,
      process.env.OAUTH_ENCRYPTION_KEY,
    ])
      if (secret) text = text.split(secret).join("[REDACTED]");
    try {
      const redacted = JSON.stringify(JSON.parse(text), (key, value) =>
        /token|secret|password|authorization|cookie|email|phone|address|identification|cpf/i.test(
          key,
        )
          ? "[REDACTED]"
          : value,
      );
      if (redacted.includes('"[REDACTED]"')) text = redacted;
    } catch {
      /* Non-JSON errors retain their text, with known secrets removed. */
    }
    return { text, redacted: text !== raw };
  };
  async function get(resource: string, select: (value: unknown) => unknown) {
    if (stopped || Date.now() >= deadline) return null;
    const url = `https://api.mercadolibre.com${resource}`;
    const check: DiagnosticCheck = {
      method: "GET",
      url,
      requestedAt: new Date().toISOString(),
      completedAt: "",
      status: null,
      requestId: null,
    };
    checks.push(check);
    try {
      const response = await fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(5000, deadline - Date.now())),
        ),
      });
      check.status = response.status;
      check.requestId = response.headers.get("x-request-id");
      const raw = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
      if (response.ok) check.summary = select(body);
      else {
        const safe = clean(raw);
        check.errorBody = safe.text;
        check.bodyRedacted = safe.redacted;
      }
      if ([401, 429].includes(response.status)) stopped = true;
      return response.ok ? body : null;
    } catch {
      check.transportError =
        "Falha de rede ou tempo limite; nenhum status HTTP recebido.";
      return null;
    } finally {
      check.completedAt = new Date().toISOString();
    }
  }
  const user = await get("/users/me", (value) => {
    const v = object(value),
      status = object(v.status),
      publishing = object(status.list);
    providerUserId =
      typeof v.id === "number" || typeof v.id === "string"
        ? String(v.id)
        : null;
    return {
      userId: providerUserId,
      siteId: v.site_id,
      accountStatus: status.site_status,
      listAllowed: publishing.allow,
      listCodes: publishing.codes,
    };
  });
  if (user) {
    await get(`/applications/${appId}`, (value) => {
      const v = object(value);
      return {
        id: v.id,
        active: v.active,
        sandboxMode: v.sandbox_mode,
        blocked: v.blocked,
        partialBlocked: object(v.partial_blocked).blocked,
        disabled: v.disabled,
        certificationStatus: v.certification_status,
      };
    });
    await get(`/applications/${appId}/grants`, (value) => {
      const grant = list(object(value).grants)
        .map(object)
        .find((g) => String(g.user_id) === providerUserId);
      return { matchingGrant: Boolean(grant), scopes: grant?.scopes ?? [] };
    });
    await get(
      "/products/search?site_id=MLB&status=active&q=iPhone%2015%20128%20GB&limit=3",
      (value) => ({
        productIds: list(object(value).results).map((v) => object(v).id),
      }),
    );
    await get("/products/MLB27172667/items?limit=3", (value) => ({
      listings: list(object(value).results).map((value) => {
        const v = object(value);
        return {
          itemId: v.item_id,
          listingPrice: v.price,
          currency: v.currency_id,
        };
      }),
    }));
    await get(
      "/sites/MLB/search?q=iPhone%2015%20128%20GB&limit=3",
      (value) => ({
        itemIds: list(object(value).results).map((v) => object(v).id),
      }),
    );
    for (const id of ["MLB6288254546", "MLB7514973182"]) {
      await get(`/items/${id}`, (value) => {
        const v = object(value);
        return { id: v.id, status: v.status, permalink: v.permalink };
      });
      await get(
        `/items/${id}/sale_price?context=channel_marketplace`,
        (value) => {
          const v = object(value);
          return {
            amount: v.amount,
            currency: v.currency_id,
            referenceDate: v.reference_date,
          };
        },
      );
    }
    await get("/items/bulk?ids=MLB6288254546,MLB7514973182", (value) =>
      list(value).map((value) => {
        const v = object(value),
          body = object(v.body),
          status = Number(v.status_code ?? v.code);
        const safe = clean(JSON.stringify(v));
        return {
          id: v.id,
          status,
          ...(status >= 400
            ? { errorBody: safe.text, bodyRedacted: safe.redacted }
            : { permalink: body.permalink }),
        };
      }),
    );
  }
  return {
    startedAt,
    completedAt: new Date().toISOString(),
    appId,
    siteId: "MLB",
    providerUserId,
    execution: {
      platform: process.env.VERCEL ? "Vercel" : "local",
      region: process.env.VERCEL_REGION ?? "não informada",
      deployment: process.env.VERCEL_URL ?? null,
    },
    stoppedEarly: stopped || checks.length < 11,
    checks,
  };
}
