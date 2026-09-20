export type CatalogProduct = {
  id: string;
  name: string;
  attributes: Record<string, string>;
  image: string | null;
};
export type NormalizedOffer = {
  id: string;
  catalogId: string | null;
  title: string;
  price: number;
  currency: "BRL";
  url: string;
  image: string | null;
  status: string;
  available: boolean;
  sellerId: string;
  shipping: number | null;
  shippingLabel: string;
  condition: string;
  warranty: string;
  attributes: Record<string, string>;
  observedAt: string;
  regularPrice?: number | null;
  discountPercent?: number | null;
  priceSource?: "sale_price" | "prices" | "legacy_item";
  sellerName?: string | null;
  availableQuantity?: number | null;
  productKey?: string;
};
export type UnavailableOffer = {
  id: string;
  catalogId: string | null;
  title: string;
  image: string | null;
  price: number | null;
  reason: string;
};
export type SearchResult = {
  products: CatalogProduct[];
  offers: NormalizedOffer[];
  unavailable: UnavailableOffer[];
  warnings: string[];
  requestId: string;
  cache: "hit" | "miss";
  total: number;
  limit: number;
  offset: number;
  collectedAt: string;
  coverage: string;
};
export type ProductResult = {
  product: CatalogProduct;
  offer: NormalizedOffer | null;
  warning: string | null;
};
export interface StoreConnector {
  search(
    query: string,
    attributes?: Record<string, string>,
    offset?: number,
  ): Promise<SearchResult>;
  product(id: string): Promise<ProductResult>;
  item(id: string): Promise<NormalizedOffer>;
}
