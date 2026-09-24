import { z } from "zod";
import type { Coupon } from "../lib/coupons/rules.ts";
export const productInput = z
  .object({
    name: z.string().trim().min(3).max(160),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(100),
    category: z.enum([
      "Hardware",
      "Celulares",
      "Áudio",
      "Eletrodomésticos",
      "Outros",
    ]),
    gtin: z
      .string()
      .trim()
      .regex(/^(?:\d{8}|\d{12,14})?$/)
      .default(""),
    mpn: z.string().trim().max(100).default(""),
    condition: z.enum(["new", "used", "refurbished"]),
    origin: z.enum(["national", "imported", "unknown"]),
    warranty: z.string().trim().max(120).default("unknown"),
    attributes: z.record(z.string().max(40), z.string().max(120)).default({}),
  })
  .strict();
export const observationInput = z
  .object({
    productId: z.string().uuid(),
    storeId: z.string().min(1).max(30),
    url: z.string().url().max(2048),
    seller: z.string().trim().min(1).max(120),
    price: z.number().int().positive().max(100000000),
    shipping: z.number().int().nonnegative().max(10000000).nullable(),
    fees: z.number().int().nonnegative().max(10000000).default(0),
    discount: z.number().int().nonnegative().default(0),
    payment: z.string().trim().min(1).max(60),
    shippingContext: z.string().trim().min(1).max(100),
    observedAt: z.string().datetime(),
    available: z.boolean().default(true),
    exact: z.boolean(),
    idempotencyKey: z.string().uuid(),
    couponId: z.string().uuid().optional(),
    couponConfirmed: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.discount <= v.price, {
    message: "Desconto não pode superar o preço do produto",
  })
  .refine((v) => Date.parse(v.observedAt) <= Date.now() + 300000, {
    message: "A observação não pode estar no futuro",
  });
export type LiveProduct = z.infer<typeof productInput> & {
  id: string;
  source: string;
  created_at: string;
  favorite?: boolean;
};
export type Store = {
  id: string;
  name: string;
  domains: string[];
  status: string;
  integration: string;
  history_allowed: boolean;
};
export type Observation = {
  id: string;
  offer_id: string;
  product_id: string;
  store_id: string;
  product_price: number;
  shipping_price: number | null;
  discount_price: number;
  fees: number;
  final_price: number | null;
  available: boolean;
  source: string;
  source_url: string;
  source_observed_at: string;
  collected_at: string;
  data_quality_status: string;
  seller: string;
  payment: string;
  shipping_context: string;
  match_status: string;
  store_name: string;
  identity_snapshot?: { name?: string };
};
export type LiveData = {
  products: LiveProduct[];
  observations: Observation[];
  stores: Store[];
  favorites: { product_id: string }[];
  alerts: { id: string; product_id: string; target_price: number }[];
  notifications: {
    id: string;
    message: string;
    created_at: string;
    read_at: string | null;
  }[];
  coupons: Coupon[];
  logs: { outcome: string; created_at: string; duration_ms: number }[];
};
export function validateStoreUrl(raw: string, domains: string[]) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Link inválido");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Use um link HTTPS direto da loja");
  const host = url.hostname.toLowerCase();
  if (!domains.some((d) => host === d || host.endsWith("." + d)))
    throw new Error("O domínio do link não pertence à loja selecionada");
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|gclid|fbclid)/i.test(key)) url.searchParams.delete(key);
  return url.toString();
}
export function historicalStats(rows: Observation[], offerId: string) {
  const valid = rows
    .filter(
      (r) =>
        r.offer_id === offerId &&
        r.available &&
        r.data_quality_status !== "partial",
    )
    .sort((a, b) => Date.parse(a.collected_at) - Date.parse(b.collected_at));
  if (!valid.length) return null;
  const latest = valid.at(-1)!;
  const daily = new Map<string, number>();
  for (const row of valid.slice(0, -1)) {
    const day = new Date(row.source_observed_at).toISOString().slice(0, 10);
    daily.set(day, Math.min(daily.get(day) ?? Infinity, row.product_price));
  }
  const vals = [...daily.values()];
  const avg = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : null;
  const delta = avg ? (latest.product_price - avg) / avg : 0;
  const label =
    valid.length < 3
      ? "Histórico insuficiente"
      : daily.size < 10
        ? "Tendência inicial"
        : delta <= -0.15
          ? "Excelente oportunidade"
          : delta <= -0.05
            ? "Bom preço"
            : delta > 0.05
              ? "Acima da média"
              : "Preço normal";
  return {
    count: valid.length,
    days: daily.size,
    low: Math.min(...valid.map((r) => r.product_price)),
    high: Math.max(...valid.map((r) => r.product_price)),
    average: avg,
    current: latest.product_price,
    label,
  };
}
