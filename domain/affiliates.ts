import { z } from "zod";
export const affiliateStores = [
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    domains: ["mercadolivre.com.br"],
    shortDomains: ["mercadolivre.com", "meli.la"],
    readiness:
      "Busca conectada; alguns recursos dependem de permissão do Mercado Livre.",
  },
  {
    id: "amazon",
    name: "Amazon",
    domains: ["amazon.com.br"],
    shortDomains: ["amzn.to"],
    readiness: "Links sem API; consulte preço e disponibilidade na Amazon.",
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    domains: ["magazineluiza.com.br", "magalu.com", "magazinevoce.com.br"],
    shortDomains: [],
    readiness: "Preço revisado manualmente; sem atualização automática.",
  },
] as const;
export type AffiliateStoreId = (typeof affiliateStores)[number]["id"];
export const affiliateStoreName = (id: string) =>
  affiliateStores.find((s) => s.id === id)?.name ?? "Loja";
export function validAffiliateUrl(
  raw: string,
  storeId: string,
  affiliate = false,
) {
  try {
    const store = affiliateStores.find((s) => s.id === storeId);
    if (!store || raw !== raw.trim() || /[\u0000-\u0020\u007f\\]/.test(raw))
      return false;
    const url = new URL(raw);
    const allowed: readonly string[] = affiliate
      ? [...store.domains, ...store.shortDomains]
      : store.domains;
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname !== "/" &&
      allowed.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}
export function validOfferImage(raw: string, storeId = "mercadolivre") {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (storeId === "mercadolivre"
        ? ["mlstatic.com"]
        : storeId === "magalu"
          ? ["mlcdn.com.br", "magazineluiza.com.br"]
          : []
      ).some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
    );
  } catch {
    return false;
  }
}
export const affiliateInput = z
  .object({
    id: z.string().uuid(),
    storeId: z.enum(["mercadolivre", "amazon", "magalu"]),
    title: z.string().trim().min(3).max(160),
    variant: z.string().trim().min(3).max(200),
    condition: z.enum(["new", "used", "refurbished"]),
    productUrl: z.string().max(3000),
    affiliateUrl: z.string().max(3000),
    imageUrl: z.string().max(3000).nullable(),
    price: z.number().int().positive().max(100000000).nullable(),
    regularPrice: z.number().int().positive().max(100000000).nullable(),
    shipping: z.number().int().min(0).max(100000000).nullable(),
    status: z.enum(["draft", "published"]),
    verified: z.literal(true, {
      error: "Confira o preço, a variante e os links antes de salvar.",
    }),
  })
  .strict()
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (!validAffiliateUrl(v.productUrl, v.storeId))
      issue(
        "productUrl",
        "Use o link completo HTTPS do produto na loja escolhida.",
      );
    if (v.affiliateUrl && !validAffiliateUrl(v.affiliateUrl, v.storeId, true))
      issue(
        "affiliateUrl",
        "O link de afiliado precisa pertencer à loja escolhida.",
      );
    if (v.imageUrl && !validOfferImage(v.imageUrl, v.storeId))
      issue(
        "imageUrl",
        "Use uma imagem HTTPS hospedada pela loja ou deixe em branco.",
      );
    if (
      v.storeId === "amazon" &&
      [v.price, v.regularPrice, v.shipping, v.imageUrl].some(
        (value) => value !== null,
      )
    )
      issue(
        "price",
        "Nesta integração sem API, os produtos Amazon devem usar Consultar preço na Amazon, sem preço ou imagem copiados da loja.",
      );
    if (v.storeId !== "amazon" && v.price === null)
      issue("price", "Informe o preço conferido na loja.");
    if (
      v.regularPrice !== null &&
      v.price !== null &&
      v.regularPrice <= v.price
    )
      issue(
        "regularPrice",
        "O preço anterior precisa ser maior que o atual; deixe vazio se não houver comprovação.",
      );
  });
export type AffiliateInput = z.infer<typeof affiliateInput>;
export type AffiliateOffer = Omit<AffiliateInput, "verified"> & {
  verifiedAt: string;
  expiresAt: string;
  updatedAt: string;
};
export const formatBRL = (n: number) =>
  (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
