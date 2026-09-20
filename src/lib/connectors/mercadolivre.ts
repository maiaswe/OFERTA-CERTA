import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { DB } from "../../server/database.ts";
import { AppError } from "../../server/security.ts";
import { validateStoreUrl } from "../../domain/live.ts";
import { accessToken, type Fetcher } from "../auth/mercadolivre.ts";
import { toCents } from "../pricing/money.ts";
import {
  normalizeSalePrice,
  productKey,
  type OfferPrice,
} from "./offer-pricing.ts";
import type {
  CatalogProduct,
  NormalizedOffer,
  StoreConnector,
  ProductResult,
  SearchResult,
  UnavailableOffer,
} from "./types.ts";

const idSchema = z
  .string()
  .regex(/^MLB\d{4,20}$/, "Use um identificador brasileiro MLB válido.");
const attributesSchema = z
  .array(
    z.object({ id: z.string(), value_name: z.string().nullable().optional() }),
  )
  .default([]);
const pictureSchema = z.object({
  url: z.string().optional(),
  secure_url: z.string().optional(),
});
function attributes(values: z.infer<typeof attributesSchema>) {
  return Object.fromEntries(
    values
      .filter((a) => a.value_name)
      .map((a) => [a.id, a.value_name!.slice(0, 120)]),
  );
}
export function safeImage(raw: string | undefined) {
  try {
    const url = new URL(raw ?? "");
    if (
      url.protocol === "https:" &&
      (url.hostname === "mlstatic.com" ||
        url.hostname.endsWith(".mlstatic.com")) &&
      !url.username &&
      !url.password
    )
      return url.toString();
  } catch {}
  return null;
}
const catalogSchema = z.object({
  id: idSchema,
  name: z.string(),
  attributes: attributesSchema,
  pictures: z.array(pictureSchema).default([]),
  buy_box_winner: z
    .object({ item_id: idSchema })
    .passthrough()
    .nullable()
    .optional(),
});
export function normalizeCatalog(raw: unknown): CatalogProduct {
  const item = catalogSchema.parse(raw);
  return {
    id: item.id,
    name: item.name.slice(0, 160),
    attributes: attributes(item.attributes),
    image: safeImage(item.pictures[0]?.secure_url ?? item.pictures[0]?.url),
  };
}
export function normalizeOffer(
  raw: unknown,
  observedAt = new Date().toISOString(),
  currentPrice?: OfferPrice,
): NormalizedOffer {
  const value = z
    .object({
      id: idSchema,
      catalog_product_id: idSchema.nullable().optional(),
      title: z.string(),
      currency_id: z.literal("BRL"),
      price: z.number().nullable().optional(),
      permalink: z.string().url(),
      secure_thumbnail: z.string().optional(),
      pictures: z.array(pictureSchema).optional(),
      status: z.string(),
      available_quantity: z.number().optional(),
      seller_id: z.number().int().positive(),
      condition: z.string(),
      warranty: z.string().nullable().optional(),
      attributes: attributesSchema,
      shipping: z.object({ free_shipping: z.boolean().optional() }).optional(),
    })
    .parse(raw);
  const price =
    currentPrice ??
    normalizeSalePrice(
      { amount: value.price, currency_id: value.currency_id },
      "legacy_item",
    );
  validateStoreUrl(value.permalink, ["mercadolivre.com.br"]);
  const attrs = attributes(value.attributes);
  return {
    id: value.id,
    catalogId: value.catalog_product_id ?? null,
    title: value.title.slice(0, 160),
    ...price,
    currency: "BRL",
    url: value.permalink,
    image: safeImage(value.secure_thumbnail ?? value.pictures?.[0]?.secure_url),
    status: value.status,
    available:
      value.status === "active" &&
      (value.available_quantity === undefined || value.available_quantity > 0),
    sellerId: String(value.seller_id),
    sellerName: null,
    availableQuantity: value.available_quantity ?? null,
    productKey: productKey(
      value.catalog_product_id ?? null,
      attrs,
      value.condition,
      value.id,
    ),
    shipping: null,
    shippingLabel: value.shipping?.free_shipping
      ? "Anúncio indica frete grátis; confirme para seu CEP."
      : "Frete a confirmar para seu CEP.",
    condition: value.condition,
    warranty: value.warranty ?? "unknown",
    attributes: attrs,
    observedAt,
  };
}
export class MercadoLivreConnector implements StoreConnector {
  db: DB;
  userId: string;
  fetcher: Fetcher;
  requestId = randomUUID();
  deadline = Infinity;
  constructor(db: DB, userId: string, fetcher: Fetcher = fetch) {
    this.db = db;
    this.userId = userId;
    this.fetcher = fetcher;
  }
  async request(resource: string) {
    if (Date.now() >= this.deadline)
      throw new AppError(
        502,
        "A consulta atingiu o tempo disponível. Tente novamente.",
        "MELI_TIMEOUT",
      );
    const endpoint = new URL(resource, "https://api.mercadolibre.com");
    if (
      endpoint.origin !== "https://api.mercadolibre.com" ||
      !/^\/(?:sites\/MLB\/search|products\/search|products\/MLB\d+(?:\/items)?|items\/MLB\d+(?:\/sale_price|\/prices)?)$/.test(
        endpoint.pathname,
      )
    )
      throw new Error("Unsupported Mercado Livre resource");
    const start = Date.now();
    let response: Response | undefined;
    try {
      const backoff = (
        await this.db.query<{ retry_after: string | null }>(
          "SELECT retry_after FROM oc_connector_status WHERE store_id='mercadolivre'",
        )
      ).rows[0];
      if (backoff?.retry_after && Date.parse(backoff.retry_after) > Date.now())
        throw new AppError(
          429,
          "O Mercado Livre pediu uma pausa. Tente novamente em alguns minutos.",
          "MELI_RATE_LIMIT",
        );
      let token = await accessToken(this.db, this.userId, this.fetcher);
      const send = () =>
        this.fetcher(`https://api.mercadolibre.com${resource}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.timeout(
            Math.max(
              1,
              Math.min(10000, Math.floor(this.deadline - Date.now())),
            ),
          ),
        });
      try {
        response = await send();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        response = await send();
      }
      if (response.status === 401) {
        token = await accessToken(this.db, this.userId, this.fetcher, token);
        response = await send();
      }
      if ([500, 502, 503, 504].includes(response.status)) {
        await new Promise((resolve) =>
          setTimeout(resolve, 200 + Math.random() * 200),
        );
        response = await send();
      }
      if (response.status === 403)
        throw new AppError(
          403,
          "Sua aplicação não tem permissão para consultar este recurso do Mercado Livre.",
          "MELI_PERMISSION",
        );
      if (response.status === 429) {
        const header = response.headers.get("retry-after");
        const seconds =
          header && /^\d+$/.test(header)
            ? Number(header)
            : header
              ? Math.ceil((Date.parse(header) - Date.now()) / 1000)
              : 120;
        const retrySeconds =
          Math.max(
            1,
            Math.min(3600, Number.isFinite(seconds) ? seconds : 120),
          ) + Math.ceil(Math.random() * 3);
        await this.db.query(
          "INSERT INTO oc_connector_status(store_id,retry_after) VALUES('mercadolivre',now()+$1*interval '1 second') ON CONFLICT(store_id) DO UPDATE SET retry_after=excluded.retry_after",
          [retrySeconds],
        );
        throw new AppError(
          429,
          "Limite do Mercado Livre atingido. Aguarde antes de consultar novamente.",
          "MELI_RATE_LIMIT",
        );
      }
      if (!response.ok)
        throw new AppError(
          response.status === 404 ? 404 : 502,
          "O Mercado Livre não disponibilizou este produto. Tente novamente mais tarde.",
          `MELI_HTTP_${response.status}`,
        );
      const result: unknown = await response.json();
      await this.db.query(
        "INSERT INTO oc_connector_status(store_id,last_synced_at) VALUES('mercadolivre',now()) ON CONFLICT(store_id) DO UPDATE SET failures=0,last_error=NULL,last_synced_at=now(),updated_at=now()",
      );
      await this.log(
        response.status,
        `${endpoint.pathname.replace(/MLB\d+/g, ":id")}:success`,
        start,
      );
      return result;
    } catch (error) {
      const code = error instanceof AppError ? error.code : "MELI_NETWORK";
      await this.log(
        response?.status ?? null,
        `${endpoint.pathname.replace(/MLB\d+/g, ":id")}:${code}`,
        start,
      );
      await this.db.query(
        "INSERT INTO oc_connector_status(store_id,failures,last_error) VALUES('mercadolivre',1,$1) ON CONFLICT(store_id) DO UPDATE SET failures=oc_connector_status.failures+1,last_error=excluded.last_error,updated_at=now()",
        [code],
      );
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        "Não foi possível consultar o Mercado Livre agora.",
        code,
      );
    }
  }
  async log(status: number | null, outcome: string, start: number) {
    await this.db.query(
      "INSERT INTO oc_fetch_logs(id,store_id,http_status,outcome,duration_ms) VALUES($1,'mercadolivre',$2,$3,$4)",
      [randomUUID(), status, outcome, Date.now() - start],
    );
  }
  async search(
    query: string,
    filters: Record<string, string> = {},
    offset = 0,
  ) {
    const searchStart = Date.now();
    this.deadline = searchStart + 40000;
    await accessToken(this.db, this.userId, this.fetcher);
    const generation =
      (
        await this.db.query<{ generation: number }>(
          "SELECT generation FROM oc_oauth_connections WHERE user_id=$1 AND provider='mercadolivre'",
          [this.userId],
        )
      ).rows[0]?.generation ?? 0;
    const digest = createHash("sha256")
      .update(
        JSON.stringify([
          this.userId,
          generation,
          query.trim(),
          filters,
          offset,
        ]),
      )
      .digest("hex");
    const key = `meli-offers-v6:${digest}`;
    const cached = (
      await this.db.query<{ payload: SearchResult }>(
        "SELECT payload FROM oc_cache WHERE cache_key=$1 AND expires_at>now()",
        [key],
      )
    ).rows[0];
    if (cached) {
      await this.log(200, `search:${this.requestId}:cache_hit`, searchStart);
      return {
        ...cached.payload,
        cache: "hit" as const,
        requestId: this.requestId,
      };
    }
    const warnings: string[] = [];
    const products: CatalogProduct[] = [];
    const candidates: {
      id: string;
      product?: CatalogProduct;
      listing?: Record<string, unknown>;
    }[] = [];
    const limit = 6;
    let total = 0;
    const isIdentifier = /^(?:\d{8}|\d{12,14})$/.test(query);
    const capabilitiesKey = `meli-discovery-v4:${this.userId}:${generation}`;
    const restricted =
      (
        await this.db.query(
          "SELECT cache_key FROM oc_cache WHERE cache_key=$1 AND expires_at>now()",
          [capabilitiesKey],
        )
      ).rows.length > 0;
    let marketplace = false;
    if (!restricted && !isIdentifier) {
      try {
        const params = new URLSearchParams({
          q: query,
          limit: String(limit),
          offset: String(offset),
        });
        const raw = z
          .object({
            results: z.array(z.object({ id: idSchema }).passthrough()),
            paging: z.object({ total: z.number() }),
          })
          .parse(await this.request(`/sites/MLB/search?${params}`));
        candidates.push(
          ...raw.results.map((listing) => ({ id: listing.id, listing })),
        );
        total = raw.paging.total;
        marketplace = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.status !== 403) throw error;
        await this.db.query(
          "INSERT INTO oc_cache(cache_key,payload,expires_at) VALUES($1,'{}',now()+interval '1 hour') ON CONFLICT(cache_key) DO UPDATE SET expires_at=excluded.expires_at",
          [capabilitiesKey],
        );
      }
    }
    if (!marketplace) {
      if (!isIdentifier)
        warnings.push(
          "A busca geral de anúncios não está disponível nesta conexão. Consultamos as publicações associadas aos produtos de catálogo.",
        );
      const params = new URLSearchParams({
        site_id: "MLB",
        status: "active",
        limit: String(limit),
        offset: String(offset),
        [isIdentifier ? "product_identifier" : "q"]: query,
      });
      const raw = z
        .object({
          results: z.array(z.unknown()),
          paging: z.object({ total: z.number() }),
        })
        .parse(await this.request(`/products/search?${params}`));
      products.push(
        ...raw.results
          .map(normalizeCatalog)
          .filter((p) =>
            Object.entries(filters).every(([k, v]) =>
              p.attributes[k]?.toLowerCase().includes(v.toLowerCase()),
            ),
          ),
      );
      total = raw.paging.total;
      await mapLimit(products, 3, async (product) => {
        try {
          const listings = z
            .object({
              results: z.array(z.object({ item_id: idSchema }).passthrough()),
            })
            .parse(await this.request(`/products/${product.id}/items?limit=3`));
          candidates.push(
            ...listings.results.map((listing) => ({
              id: listing.item_id,
              product,
              listing,
            })),
          );
        } catch (error) {
          if (error instanceof AppError && [401, 429].includes(error.status))
            throw error;
          warnings.push(
            `Não foi possível listar anúncios de ${product.name}. ${error instanceof AppError && error.status === 404 ? "Este catálogo não disponibilizou publicações." : "Tente novamente mais tarde."}`,
          );
        }
      });
    }
    const offers: NormalizedOffer[] = [];
    const unavailable: UnavailableOffer[] = [];
    let permissionBlocked = false;
    const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
    await mapLimit(unique, 3, async (c) => {
      try {
        const offer = await this.item(c.id);
        if (!offer.available)
          throw new AppError(404, "Anúncio inativo.", "inactive_item");
        if (c.product && offer.catalogId !== c.product.id)
          throw new AppError(
            422,
            "Variante diferente da consultada.",
            "incompatible_variant",
          );
        if (
          !Object.entries(filters).every(([k, v]) =>
            offer.attributes[k]?.toLowerCase().includes(v.toLowerCase()),
          )
        )
          throw new AppError(
            422,
            "Variante diferente dos filtros.",
            "incompatible_variant",
          );
        offers.push(offer);
      } catch (error) {
        if (error instanceof AppError && [401, 429].includes(error.status))
          throw error;
        if (error instanceof AppError && error.status === 403)
          permissionBlocked = true;
        const reason =
          error instanceof AppError ? error.code : "upstream_error";
        let price: number | null = null;
        try {
          if (
            c.listing?.currency_id === "BRL" &&
            typeof c.listing.price === "number" &&
            c.listing.price > 0
          )
            price = toCents(c.listing.price);
        } catch {}
        unavailable.push({
          id: c.id,
          catalogId: c.product?.id ?? null,
          title: c.product?.name ?? String(c.listing?.title ?? c.id),
          image: c.product?.image ?? null,
          price,
          reason,
        });
      }
    });
    if (permissionBlocked)
      warnings.push(
        "O Mercado Livre negou acesso aos detalhes ou ao preço de venda de anúncios (403). Os preços de listagem abaixo são apenas informativos; anúncios sem link oficial e preço validado ficam fora da comparação.",
      );
    const result: SearchResult = {
      products,
      offers,
      unavailable,
      warnings,
      requestId: this.requestId,
      cache: "miss",
      total,
      limit,
      offset,
      collectedAt: new Date().toISOString(),
      coverage: marketplace
        ? "Anúncios disponíveis para esta aplicação; preço do produto sem frete. Compare somente a mesma variante e condição."
        : "Até 3 anúncios por produto e 6 produtos por página. Cobertura parcial do catálogo; não representa todos os vendedores.",
    };
    await this.log(
      200,
      `search:${this.requestId}:discovered=${unique.length}:valid=${offers.length}:unavailable=${unavailable.length}`,
      searchStart,
    );
    await this.db.query(
      "INSERT INTO oc_cache(cache_key,payload,expires_at) VALUES($1,$2,now()+interval '45 seconds') ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at",
      [key, JSON.stringify(result)],
    );
    return result;
  }
  async product(id: string): Promise<ProductResult> {
    const raw = catalogSchema.parse(
      await this.request(`/products/${idSchema.parse(id)}`),
    );
    const product = normalizeCatalog(raw);
    if (!raw.buy_box_winner)
      return {
        product,
        offer: null,
        warning: "Este produto não tem uma oferta destacada disponível na API.",
      };
    const offer = await this.item(raw.buy_box_winner.item_id);
    if (offer.catalogId !== product.id)
      return {
        product,
        offer: null,
        warning: "A oferta mudou de catálogo. Consulte novamente.",
      };
    return {
      product,
      offer,
      warning:
        "Oferta destacada pelo Mercado Livre. Ela não representa uma comparação de todos os vendedores.",
    };
  }
  async item(id: string) {
    const itemId = idSchema.parse(id);
    const raw = await this.request(`/items/${itemId}`);
    if (
      !raw ||
      typeof raw !== "object" ||
      !("permalink" in raw) ||
      !raw.permalink
    )
      throw new AppError(
        502,
        "O Mercado Livre não forneceu o link do anúncio.",
        "missing_permalink",
      );
    // Only sale_price confirms the winning price for this channel.
    const currentPrice = normalizeSalePrice(
      await this.request(
        `/items/${itemId}/sale_price?context=channel_marketplace`,
      ),
    );
    try {
      return normalizeOffer(raw, new Date().toISOString(), currentPrice);
    } catch {
      throw new AppError(
        502,
        "O anúncio retornou dados incompletos.",
        "invalid_offer",
      );
    }
  }
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
) {
  let next = 0;
  let stopped = false;
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!stopped && next < items.length) {
        const item = items[next++];
        try {
          await fn(item);
        } catch (e) {
          stopped = true;
          throw e;
        }
      }
    }),
  );
  const failure = results.find((r) => r.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}
