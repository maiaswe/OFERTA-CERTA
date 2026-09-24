export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  specs: string[];
  kind: "gpu" | "ssd" | "fone" | "phone";
  price: number;
  previous: number;
  offers: DemoOffer[];
  history: { date: string; price: number | null }[];
};
export type DemoOffer = {
  id: string;
  store: string;
  price: number;
  shipping: number | null;
  match: "exact" | "partial";
  description: string;
  coupon?: string;
};
export const sourceLabel = "Exemplo local · 10/09/2026, 09:00 BRT";
export const categories = ["Todos", "Hardware", "Celulares", "Áudio"];
const history = (values: (number | null)[]) =>
  values.map((price, i) => ({
    date: `2026-${i < 10 ? "08" : "09"}-${String(i < 10 ? 12 + i * 2 : (i - 10) * 2 + 1).padStart(2, "0")}`,
    price,
  }));
export const products: Product[] = [
  {
    id: "gpu",
    name: "GeForce RTX 4060 Ti",
    brand: "NVIDIA",
    category: "Hardware",
    kind: "gpu",
    specs: ["16 GB GDDR6", "Novo", "Nacional"],
    price: 259990,
    previous: 299990,
    offers: [
      {
        id: "g1",
        store: "Loja demonstração A",
        price: 259990,
        shipping: 0,
        match: "exact",
        description: "16 GB · novo · garantia informada",
      },
      {
        id: "g2",
        store: "Loja demonstração B",
        price: 254990,
        shipping: null,
        match: "exact",
        description: "16 GB · novo · frete a confirmar",
      },
      {
        id: "g3",
        store: "Loja demonstração C",
        price: 269990,
        shipping: 1990,
        match: "exact",
        description: "16 GB · novo · entrega ilustrativa",
      },
      {
        id: "g4",
        store: "Loja demonstração D",
        price: 229990,
        shipping: 0,
        match: "partial",
        description: "8 GB — memória diferente do produto buscado",
      },
    ],
    history: history([
      309990,
      299990,
      299990,
      304990,
      289990,
      null,
      289990,
      279990,
      284990,
      279990,
      274990,
      269990,
      269990,
      269990,
      259990,
    ]),
  },
  {
    id: "ssd",
    name: "SSD Kingston NV2",
    brand: "Kingston",
    category: "Hardware",
    kind: "ssd",
    specs: ["1 TB", "NVMe M.2", "Novo"],
    price: 34990,
    previous: 42990,
    offers: [
      {
        id: "s1",
        store: "Loja demonstração A",
        price: 34990,
        shipping: 1990,
        match: "exact",
        description: "1 TB · NVMe · novo",
        coupon: "DEMO10",
      },
      {
        id: "s2",
        store: "Loja demonstração B",
        price: 37990,
        shipping: 0,
        match: "exact",
        description: "1 TB · NVMe · novo",
      },
    ],
    history: history([
      44990, 44990, 42990, 42990, 43990, 41990, 39990, 40990, 39990, 38990,
      38990, 37990, 36990, 35990, 34990,
    ]),
  },
  {
    id: "fone",
    name: "Sony WH-1000XM5",
    brand: "Sony",
    category: "Áudio",
    kind: "fone",
    specs: ["Sem fio", "Preto", "Novo"],
    price: 179990,
    previous: 209990,
    offers: [
      {
        id: "f1",
        store: "Loja demonstração C",
        price: 179990,
        shipping: 0,
        match: "exact",
        description: "Preto · novo · nacional",
      },
      {
        id: "f2",
        store: "Loja demonstração A",
        price: 174990,
        shipping: null,
        match: "exact",
        description: "Preto · novo · frete a confirmar",
      },
    ],
    history: history([
      219990, 219990, 209990, 214990, 209990, 199990, 204990, 199990, 199990,
      189990, 199990, 189990, 184990, 179990, 179990,
    ]),
  },
  {
    id: "phone",
    name: "Apple iPhone 15",
    brand: "Apple",
    category: "Celulares",
    kind: "phone",
    specs: ["128 GB", "Preto", "Novo"],
    price: 389990,
    previous: 429990,
    offers: [
      {
        id: "p1",
        store: "Loja demonstração B",
        price: 389990,
        shipping: 0,
        match: "exact",
        description: "128 GB · preto · nacional",
      },
      {
        id: "p2",
        store: "Loja demonstração C",
        price: 379990,
        shipping: null,
        match: "exact",
        description: "128 GB · preto · frete a confirmar",
      },
    ],
    history: history([
      449990, 449990, 439990, 439990, 429990, 429990, 439990, 419990, 429990,
      409990, 409990, 399990, 409990, 399990, 389990,
    ]),
  },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function searchProducts(
  query: string,
  category = "Todos",
  maxPrice?: number,
) {
  const tokens = normalize(query).split(" ").filter(Boolean);
  return products.filter(
    (p) =>
      tokens.every((t) =>
        normalize([p.name, p.brand, ...p.specs].join(" ")).includes(t),
      ) &&
      (category === "Todos" || p.category === category) &&
      (maxPrice === undefined || p.price <= maxPrice),
  );
}
export function finalPrice(offer: DemoOffer) {
  return offer.shipping === null ? null : offer.price + offer.shipping;
}
export function bestFinal(offers: DemoOffer[]) {
  return offers
    .filter((o) => o.match === "exact" && o.shipping !== null)
    .sort((a, b) => finalPrice(a)! - finalPrice(b)!)[0];
}
export function sortedOffers(offers: DemoOffer[], sort: string) {
  return [...offers].sort((a, b) =>
    sort === "product"
      ? a.price - b.price
      : (finalPrice(a) ?? Infinity) - (finalPrice(b) ?? Infinity),
  );
}
export function parseStoredFavorites(value: string | null) {
  try {
    const data: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(data)
      ? data.filter(
          (v): v is string =>
            typeof v === "string" && products.some((p) => p.id === v),
        )
      : [];
  } catch {
    return [];
  }
}
export const periods = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "6 meses", days: 183 },
  { label: "1 ano", days: 365 },
  { label: "Tudo", days: Infinity },
];
export function historyInPeriod(product: Product, days: number) {
  const anchor = Date.parse("2026-09-10T12:00:00Z");
  return product.history.filter(
    (p) => anchor - Date.parse(`${p.date}T12:00:00Z`) <= days * 86400000,
  );
}
export const stores = [
  "Mercado Livre",
  "Amazon Brasil",
  "KaBuM",
  "Pichau",
  "Terabyte Shop",
  "Magazine Luiza / Magalu Marketplace",
  "Casas Bahia",
  "Fast Shop",
  "Carrefour",
  "Shopee Brasil",
  "AliExpress Brasil",
  "Zoom / Buscapé",
];
