import { z } from "zod";

export const couponInput = z
  .object({
    id: z.string().uuid().optional(),
    storeId: z.string().min(1).max(30),
    code: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .transform((s) => s.toUpperCase()),
    type: z.enum(["fixed", "percent"]),
    amount: z.number().int().positive().max(100000000),
    minimumPurchase: z.number().int().nonnegative().max(100000000),
    productIds: z.array(z.string().uuid()).max(100).default([]),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
    sourceUrl: z.string().url().max(2048),
    rules: z.string().trim().min(3).max(2000),
    status: z.enum(["unverified", "inactive"]).default("unverified"),
  })
  .strict()
  .refine((v) => Date.parse(v.validUntil) > Date.parse(v.validFrom), {
    message: "O fim da validade deve ser posterior ao início.",
  })
  .refine((v) => v.type !== "percent" || v.amount <= 10000, {
    message: "O percentual deve ser de até 100%.",
  });
export type Coupon = {
  id: string;
  store_id: string;
  code: string;
  discount_type: "fixed" | "percent";
  amount: number;
  minimum_purchase: number;
  eligible_product_ids: string[];
  starts_at: string;
  ends_at: string;
  source_url: string;
  rules: string;
  status: string;
  source: string;
  confidence: string;
};
export function couponDiscount(
  coupon: Coupon,
  storeId: string,
  productId: string,
  price: number,
  at: Date,
) {
  if (
    coupon.status === "inactive" ||
    coupon.store_id !== storeId ||
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    Date.parse(coupon.starts_at) > at.getTime() ||
    Date.parse(coupon.ends_at) <= at.getTime() ||
    price < coupon.minimum_purchase ||
    (coupon.eligible_product_ids.length > 0 &&
      !coupon.eligible_product_ids.includes(productId))
  )
    return 0;
  return Math.min(
    price,
    coupon.discount_type === "fixed"
      ? coupon.amount
      : Math.floor((price * coupon.amount) / 10000),
  );
}
