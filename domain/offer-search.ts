import { affiliateStores } from "./affiliates.ts";
export type OfferSearchParams = Record<string, string | string[] | undefined>;
export function parseOfferSearch(params: OfferSearchParams = {}) {
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const money = (key: string) => {
    const raw = one(key).trim().replace(",", ".");
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) return null;
    const [whole, decimals = ""] = raw.split(".");
    const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
    return cents <= 100000000 ? cents : null;
  };
  const q = one("q").trim().slice(0, 100);
  const tokens = [
    ...new Set(
      q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [],
    ),
  ].slice(0, 12);
  const condition = ["new", "used", "refurbished"].includes(one("condition"))
    ? one("condition")
    : "";
  const sort = ["price_asc", "price_desc"].includes(one("sort"))
    ? one("sort")
    : "recent";
  const pageRaw = one("page");
  const page = /^\d{1,6}$/.test(pageRaw)
    ? Math.max(1, Math.min(100000, Number(pageRaw)))
    : 1;
  return {
    q,
    store: affiliateStores.some((s) => s.id === one("store"))
      ? one("store")
      : "",
    tokens,
    condition,
    sort,
    min: money("min"),
    max: money("max"),
    page,
  };
}
export type OfferSearch = ReturnType<typeof parseOfferSearch>;
export function offerSearchUrl(filters: OfferSearch, page = filters.page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.store) params.set("store", filters.store);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.min !== null) params.set("min", (filters.min / 100).toFixed(2));
  if (filters.max !== null) params.set("max", (filters.max / 100).toFixed(2));
  if (page > 1) params.set("page", String(page));
  return `/ofertas${params.size ? `?${params}` : ""}`;
}
