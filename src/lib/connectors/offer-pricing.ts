import { z } from "zod";
import { AppError } from "../../server/security.ts";
import { toCents } from "../pricing/money.ts";

const amount = z.number().finite().positive();
const saleSchema = z.object({
  amount,
  regular_amount: z.number().finite().nullable().optional(),
  currency_id: z.literal("BRL"),
});
export type OfferPrice = {
  price: number;
  regularPrice: number | null;
  discountPercent: number | null;
  priceSource: "sale_price" | "prices" | "legacy_item";
};
export function normalizeSalePrice(
  raw: unknown,
  priceSource: OfferPrice["priceSource"] = "sale_price",
): OfferPrice {
  const parsed = saleSchema.safeParse(raw);
  if (!parsed.success)
    throw new AppError(
      502,
      "O anúncio não forneceu um preço válido em reais.",
      "missing_price",
    );
  let price: number;
  let regularPrice: number | null;
  try {
    price = toCents(parsed.data.amount);
    regularPrice =
      parsed.data.regular_amount &&
      parsed.data.regular_amount > parsed.data.amount
        ? toCents(parsed.data.regular_amount)
        : null;
  } catch {
    throw new AppError(502, "Preço inválido no anúncio.", "invalid_price");
  }
  if (price > 100000000)
    throw new AppError(502, "Preço fora do limite aceito.", "invalid_price");
  return {
    price,
    regularPrice,
    discountPercent: regularPrice
      ? Math.round(((regularPrice - price) * 10000) / regularPrice) / 100
      : null,
    priceSource,
  };
}
export function priceFromList(raw: unknown, now = Date.now()): OfferPrice {
  const parsed = z
    .object({
      prices: z.array(
        z.object({
          type: z.enum(["standard", "promotion"]),
          amount: z.number(),
          regular_amount: z.number().nullable().optional(),
          currency_id: z.string(),
          conditions: z.object({
            context_restrictions: z.array(z.string()),
            start_time: z.string().nullable().optional(),
            end_time: z.string().nullable().optional(),
          }),
        }),
      ),
    })
    .safeParse(raw);
  if (!parsed.success)
    throw new AppError(502, "Preço indisponível.", "missing_price");
  const valid = parsed.data.prices
    .filter((p) => {
      const c = p.conditions;
      return (
        c.context_restrictions.every((x) => x === "channel_marketplace") &&
        (!c.start_time || Date.parse(c.start_time) <= now) &&
        (!c.end_time || Date.parse(c.end_time) > now)
      );
    })
    .flatMap((p) => {
      try {
        return [normalizeSalePrice(p, "prices")];
      } catch {
        return [];
      }
    });
  if (!valid.length)
    throw new AppError(
      502,
      "Preço indisponível para este canal.",
      "missing_price",
    );
  return valid.sort((a, b) => a.price - b.price)[0];
}

const identityFields = [
  "BRAND",
  "MODEL",
  "COLOR",
  "VOLTAGE",
  "INTERNAL_MEMORY",
  "RAM_MEMORY",
  "STORAGE_CAPACITY",
  "SIZE",
  "UNITS_PER_PACK",
];
export function productKey(
  catalogId: string | null,
  attrs: Record<string, string>,
  condition: string,
  itemId: string,
) {
  // Unidentified items never share a ranking solely because titles look similar.
  const gtin = /^(?:\d{8}|\d{12,14})$/.test(attrs.GTIN ?? "")
    ? attrs.GTIN
    : null;
  const identity = gtin
    ? `gtin:${gtin}`
    : catalogId
      ? `catalog:${catalogId}`
      : `item:${itemId}`;
  return `${identity}|${condition}|${identityFields.map((k) => `${k}:${(attrs[k] ?? "").trim().toLowerCase()}`).join("|")}`;
}
