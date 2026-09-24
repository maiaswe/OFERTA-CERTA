import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { database } from "@/server/database";
import { searchPublicOffers } from "@/server/public-offer-search";
import {
  parseOfferSearch,
  offerSearchUrl,
  type OfferSearchParams,
} from "@/domain/offer-search";
import {
  formatBRL,
  affiliateStores,
  affiliateStoreName,
} from "@/domain/affiliates";
import "../painel/workspace.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ofertas selecionadas | Oferta Certa" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<OfferSearchParams>;
}) {
  const filters = parseOfferSearch(await searchParams);
  const { offers, total, page, pages } = await searchPublicOffers(
    await database(),
    filters,
  );
  const filtered = Boolean(
    filters.q ||
      filters.store ||
      filters.condition ||
      filters.min !== null ||
      filters.max !== null,
  );
  return (
    <main className="live-root affiliate-storefront">
      <header>
        <Link href="/ofertas" className="affiliate-logo">
          oferta<span>certa.</span>
        </Link>
        <Link href="/painel/afiliados">Meu painel</Link>
      </header>
      <section className="live-heading">
        <div>
          <span className="live-kicker">SELEÇÃO DO OFERTA CERTA</span>
          <h1>
            Encontre o produto.
            <br />
            <em>Confira a oferta.</em>
          </h1>
          <p>
            Produtos selecionados do Mercado Livre, Magazine Luiza e Amazon.
          </p>
        </div>
      </section>
      <form
        action="/ofertas"
        method="get"
        className="live-card storefront-search"
        role="search"
        key={offerSearchUrl(filters)}
      >
        <label className="storefront-query">
          O que você procura?
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            maxLength={100}
            placeholder="Produto, modelo, cor ou capacidade"
          />
        </label>
        <label className="storefront-query">
          Loja
          <select name="store" aria-label="Loja" defaultValue={filters.store}>
            <option value="">Todas as lojas</option>
            {affiliateStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Condição
          <select
            name="condition"
            aria-label="Condição"
            defaultValue={filters.condition}
          >
            <option value="">Todas</option>
            <option value="new">Novo</option>
            <option value="used">Usado</option>
            <option value="refurbished">Recondicionado</option>
          </select>
        </label>
        <label>
          Preço mínimo (R$)
          <input
            name="min"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={
              filters.min === null ? "" : (filters.min / 100).toFixed(2)
            }
          />
        </label>
        <label>
          Preço máximo (R$)
          <input
            name="max"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={
              filters.max === null ? "" : (filters.max / 100).toFixed(2)
            }
          />
        </label>
        <label>
          Ordenar por
          <select
            name="sort"
            aria-label="Ordenar por"
            defaultValue={filters.sort}
          >
            <option value="recent">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
          </select>
        </label>
        <div className="live-form-actions">
          <button className="live-primary" type="submit">
            Buscar ofertas
          </button>
          <Link className="live-secondary" href="/ofertas">
            Limpar filtros
          </Link>
        </div>
        <small className="storefront-coverage">
          A busca consulta as ofertas revisadas do Oferta Certa. A seleção ainda
          não abrange todos os anúncios das lojas. Produtos sem preço informado
          ficam fora dos filtros de preço e ao final da ordenação por preço.
        </small>
      </form>
      <aside className="live-message">
        {offers.some((o) => o.affiliateUrl) && (
          <>
            Publicidade: algumas ofertas usam links de afiliado e podem gerar
            comissão por compras qualificadas.{" "}
          </>
        )}
        Preços e estoque podem mudar; confirme o valor, o frete e as condições
        na loja. Na Amazon, consulte preço e disponibilidade ao abrir o produto.
        {offers.some((o) => o.storeId === "amazon" && o.affiliateUrl) && (
          <p>Como associado da Amazon, eu recebo por compras qualificadas.</p>
        )}
      </aside>
      {filters.min !== null &&
        filters.max !== null &&
        filters.min > filters.max && (
          <p role="alert" className="live-message live-error">
            O preço mínimo está maior que o máximo. Ajuste os filtros.
          </p>
        )}
      <p role="status">
        {total} {total === 1 ? "oferta encontrada" : "ofertas encontradas"}
        {filters.q ? ` para “${filters.q}”` : ""}. Preços do produto, sem
        incluir frete.
      </p>
      {!offers.length ? (
        <section className="live-card">
          <h2>
            {filtered
              ? "Nenhuma oferta encontrada com esses filtros."
              : "Estamos preparando as primeiras ofertas."}
          </h2>
          <p>
            {filtered
              ? "Tente outro nome, confira a capacidade ou amplie a faixa de preço. Ofertas ainda não revisadas ou vencidas não aparecem na busca."
              : "As ofertas aparecem aqui depois da revisão do produto, do preço e do link de compra."}
          </p>
        </section>
      ) : (
        <div className="live-catalog">
          {offers.map((o) => (
            <article className="live-card live-product-card" key={o.id}>
              <div className="live-product-art">
                {o.imageUrl ? (
                  <Image
                    unoptimized
                    width={300}
                    height={180}
                    src={o.imageUrl}
                    alt={o.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package size={46} />
                )}
              </div>
              <span className="live-kicker">
                {affiliateStoreName(o.storeId).toUpperCase()} ·{" "}
                {o.condition === "new"
                  ? "NOVO"
                  : o.condition === "used"
                    ? "USADO"
                    : "RECONDICIONADO"}
              </span>
              <h2>{o.title}</h2>
              <p>{o.variant}</p>
              {o.regularPrice && (
                <small>
                  De <del>{formatBRL(o.regularPrice)}</del>
                </small>
              )}
              <strong>
                {o.price === null
                  ? "Preço disponível na Amazon"
                  : formatBRL(o.price)}
              </strong>
              {o.price !== null && (
                <p>
                  {o.shipping === null
                    ? "Frete a confirmar para seu CEP"
                    : o.shipping === 0
                      ? "Frete grátis informado; confirme para seu CEP"
                      : `Frete informado: ${formatBRL(o.shipping)}`}
                </p>
              )}
              <small>
                Revisão manual:{" "}
                {new Date(o.verifiedAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </small>
              <a
                className="live-primary"
                href={o.affiliateUrl || o.productUrl}
                target="_blank"
                rel={o.affiliateUrl ? "sponsored noopener" : "noopener"}
                referrerPolicy="strict-origin-when-cross-origin"
              >
                {o.price === null
                  ? "Consultar preço na Amazon"
                  : `Ver oferta no ${affiliateStoreName(o.storeId)}`}{" "}
                ↗
              </a>
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav
          className="live-form-actions storefront-pagination"
          aria-label="Páginas de ofertas"
        >
          {page > 1 && (
            <Link
              className="live-secondary"
              href={offerSearchUrl(filters, page - 1)}
            >
              Página anterior
            </Link>
          )}
          <span>
            Página {page} de {pages}
          </span>
          {page < pages && (
            <Link
              className="live-secondary"
              href={offerSearchUrl(filters, page + 1)}
            >
              Próxima página
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
