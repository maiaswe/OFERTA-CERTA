"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Search, Package } from "lucide-react";
import { integrationApi } from "./integration-panel";
import { AffiliateEditor } from "./affiliate-panel";
import type { SearchResult, NormalizedOffer } from "@/lib/connectors/types";
import { formatBRL } from "@/domain/affiliates";
const conditionLabel = (v: string) =>
  v === "new"
    ? "Novo"
    : v === "used"
      ? "Usado"
      : v === "refurbished"
        ? "Recondicionado"
        : "Condição a confirmar";
const reasons: Record<string, string> = {
  MELI_PERMISSION: "O Mercado Livre não liberou os detalhes deste anúncio.",
  missing_permalink: "A loja não retornou o link do anúncio.",
  missing_price: "A loja não retornou um preço de venda válido.",
  invalid_price: "Preço fora do formato esperado.",
  inactive_item: "Anúncio indisponível.",
  incompatible_variant: "A variante não corresponde à consulta.",
  invalid_offer: "Dados incompletos retornados pela loja.",
};
export function StoreSearch({
  onSaved,
}: {
  onSaved: (id: string) => Promise<void>;
}) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<NormalizedOffer | null>(null);
  const [group, setGroup] = useState("");
  const [condition, setCondition] = useState("");
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function search(e?: FormEvent, offset = 0) {
    e?.preventDefault();
    await run(async () => {
      setResult(null);
      setEditing(null);
      setGroup("");
      setResult(
        await integrationApi("search", undefined, {
          q: query.trim(),
          attributes: JSON.stringify({
            ...(brand.trim() ? { BRAND: brand.trim() } : {}),
            ...(model.trim() ? { MODEL: model.trim() } : {}),
          }),
          offset: String(offset),
        }),
      );
    });
  }
  const groups = [
    ...new Map(
      (result?.offers ?? []).map((o) => [o.productKey ?? o.id, o.title]),
    ).entries(),
  ];
  const displayed = (result?.offers ?? []).filter(
    (o) =>
      (!group || (o.productKey ?? o.id) === group) &&
      (!condition || o.condition === condition),
  );
  if (group) displayed.sort((a, b) => a.price - b.price);
  return (
    <section className="live-store-search">
      <div className="live-card">
        <span className="live-kicker">MERCADO LIVRE</span>
        <h2>Busque anúncios e confira as ofertas</h2>
        <p>
          Preço, variante e link oficial na mesma consulta.{" "}
          <Link href="/painel/integracoes">Gerenciar conexão</Link> ·{" "}
          <Link href="/painel/afiliados">Minhas ofertas</Link>
        </p>
        <form onSubmit={search}>
          <div className="live-toolbar">
            <label className="live-search">
              <Search size={20} />
              <input
                required
                minLength={3}
                maxLength={120}
                aria-label="Buscar no Mercado Livre"
                placeholder="Ex.: iPhone 15 128 GB azul"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="live-primary" disabled={busy}>
              {busy ? "Consultando anúncios…" : "Buscar no Mercado Livre"}
            </button>
          </div>
          <details>
            <summary>Filtrar marca e modelo</summary>
            <div className="live-fields">
              <label>
                Marca
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Modelo
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  maxLength={120}
                />
              </label>
            </div>
          </details>
        </form>
      </div>
      {busy && (
        <p role="status">
          Consultando anúncios, preços e links. Isso pode levar alguns segundos.
        </p>
      )}
      {error && (
        <p className="live-message live-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <AffiliateEditor
          key={editing.id}
          initial={{
            title: editing.title,
            variant:
              Object.values(editing.attributes)
                .slice(0, 6)
                .join(" · ")
                .slice(0, 200) || editing.title,
            condition: ["new", "used", "refurbished"].includes(
              editing.condition,
            )
              ? (editing.condition as "new" | "used" | "refurbished")
              : "new",
            productUrl: editing.url,
            imageUrl: editing.image,
            price: editing.price,
            regularPrice: editing.regularPrice ?? null,
            shipping: null,
          }}
          onDone={() => setEditing(null)}
        />
      )}
      {result && (
        <>
          {result.warnings.map((w) => (
            <p key={w} className="live-message" role="status">
              {w}
            </p>
          ))}
          <p className="live-muted">{result.coverage}</p>
          <p>
            <strong>
              {result.offers.length} ofertas com preço e link confirmados
            </strong>{" "}
            · {result.unavailable.length} anúncios incompletos nesta consulta
          </p>
          {result.offers.length > 0 && (
            <div className="live-fields">
              <label>
                Comparar a mesma variante
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="">Todos os produtos (sem ranking)</option>
                  {groups.map(([key, title]) => (
                    <option key={key} value={key}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Condição
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="new">Novo</option>
                  <option value="used">Usado</option>
                  <option value="refurbished">Recondicionado</option>
                </select>
              </label>
            </div>
          )}
          <div className="live-catalog">
            {displayed.map((o, i) => (
              <article className="live-card live-product-card" key={o.id}>
                <div className="live-product-art">
                  {o.image ? (
                    <Image
                      unoptimized
                      width={300}
                      height={180}
                      src={o.image}
                      alt={o.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package size={46} />
                  )}
                </div>
                <span className="live-kicker">
                  MERCADO LIVRE · {conditionLabel(o.condition)}
                </span>
                <h3>{o.title}</h3>
                {group && i === 0 && displayed.length > 1 && (
                  <p>
                    Menor preço do produto entre estes anúncios equivalentes.
                    Frete não incluído.
                  </p>
                )}
                {o.regularPrice && (
                  <small>
                    <del>{formatBRL(o.regularPrice)}</del> · {o.discountPercent}
                    % de desconto
                  </small>
                )}
                <strong>{formatBRL(o.price)}</strong>
                <p>{o.shippingLabel}</p>
                <p>
                  Vendedor {o.sellerName ?? o.sellerId} · {o.id}
                  <br />
                  Consultado em {new Date(o.observedAt).toLocaleString("pt-BR")}
                </p>
                {o.priceSource === "legacy_item" && (
                  <p>Preço alternativo do anúncio; confirme na loja.</p>
                )}
                <div className="live-form-actions">
                  <a
                    className="live-primary"
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver anúncio na loja ↗
                  </a>
                  <button disabled={busy} onClick={() => setEditing(o)}>
                    Preparar oferta
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const v = await integrationApi("collect", {
                          itemId: o.id,
                          idempotencyKey: crypto.randomUUID(),
                        });
                        await onSaved(v.productId);
                      })
                    }
                  >
                    Registrar no histórico
                  </button>
                </div>
              </article>
            ))}
          </div>
          {result.unavailable.length > 0 && (
            <>
              <h2>Anúncios que precisam de confirmação</h2>
              <p>
                O preço de listagem pode diferir do preço de venda. Sem link
                oficial confirmado, estes anúncios não entram no ranking. Você
                pode preparar uma oferta com o link conferido por você em{" "}
                <Link href="/painel/afiliados">Minhas ofertas</Link>.
              </p>
              <div className="live-catalog">
                {result.unavailable.map((o) => (
                  <article className="live-card live-product-card" key={o.id}>
                    <div className="live-product-art">
                      {o.image ? (
                        <Image
                          unoptimized
                          width={300}
                          height={180}
                          src={o.image}
                          alt={o.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package size={46} />
                      )}
                    </div>
                    <span className="live-kicker">
                      ANÚNCIO INCOMPLETO · {o.id}
                    </span>
                    <h3>{o.title}</h3>
                    <strong>
                      {o.price === null
                        ? "Preço não informado"
                        : formatBRL(o.price)}
                    </strong>
                    <small>Preço de listagem — confirme no Mercado Livre</small>
                    <p>
                      {reasons[o.reason] ??
                        "Não foi possível confirmar este anúncio agora."}
                    </p>
                    <p>Link oficial indisponível</p>
                  </article>
                ))}
              </div>
            </>
          )}
          {!result.offers.length && !result.unavailable.length && (
            <p className="live-card">
              Nenhum anúncio encontrado com esses filtros nesta página. Tente
              outro termo ou outra página.
            </p>
          )}
          <div className="live-form-actions">
            <button
              disabled={busy || result.offset === 0}
              onClick={() =>
                search(undefined, Math.max(0, result.offset - result.limit))
              }
            >
              Página anterior
            </button>
            <span>Página {Math.floor(result.offset / result.limit) + 1}</span>
            <button
              disabled={
                busy ||
                result.offset + result.limit >= result.total ||
                result.offset + result.limit > 980
              }
              onClick={() => search(undefined, result.offset + result.limit)}
            >
              Próxima página
            </button>
          </div>
        </>
      )}
    </section>
  );
}
