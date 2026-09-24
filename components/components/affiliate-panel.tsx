"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  type AffiliateOffer,
  type AffiliateStoreId,
  affiliateStores,
  affiliateStoreName,
  formatBRL,
} from "@/domain/affiliates";
import { toCents } from "@/lib/pricing/money";
async function api(body?: unknown, action = "") {
  const r = await fetch(`/api/affiliates${action ? `?action=${action}` : ""}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const value = await r.json();
  if (!r.ok) throw new Error(value.error);
  return value;
}
export function AffiliateEditor({
  initial,
  onDone,
}: {
  initial?: Partial<AffiliateOffer>;
  onDone: () => void;
}) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [storeId, setStoreId] = useState<AffiliateStoreId>(
    initial?.storeId ?? "mercadolivre",
  );
  const linkOnly = storeId === "amazon";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const val = (name: string) => String(f.get(name) ?? "").trim();
      const money = (name: string) =>
        val(name) ? toCents(val(name).replace(",", ".")) : null;
      const status =
        (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
        "published"
          ? "published"
          : "draft";
      await api({
        id,
        storeId,
        title: val("title"),
        variant: val("variant"),
        condition: val("condition"),
        productUrl: val("productUrl"),
        affiliateUrl: val("affiliateUrl"),
        imageUrl: linkOnly ? null : val("imageUrl") || null,
        price: linkOnly ? null : money("price"),
        regularPrice: linkOnly ? null : money("regularPrice"),
        shipping: linkOnly ? null : money("shipping"),
        status,
        verified: f.get("verified") === "on",
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const decimal = (v?: number | null) =>
    v == null ? "" : (v / 100).toFixed(2);
  return (
    <section className="live-card">
      <h2>{initial?.id ? "Revisar oferta" : "Preparar oferta"}</h2>
      <p>
        Confira o anúncio na loja e cole o link completo. O botão de compra
        abrirá esse endereço. Publicações ficam visíveis por 24 horas; depois,
        revise o preço para publicar novamente.
      </p>
      <form onSubmit={save} className="affiliate-form">
        <label>
          Loja
          <select
            aria-label="Loja"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value as AffiliateStoreId)}
          >
            {affiliateStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <p className="live-muted">
          {affiliateStores.find((s) => s.id === storeId)?.readiness}
        </p>
        {linkOnly && (
          <p className="live-message">
            Cadastre uma descrição própria e o link do produto. Nesta
            modalidade, o visitante consulta preço e disponibilidade na Amazon.
            Links de associado podem ser colados após aprovação no programa.
          </p>
        )}
        <label>
          Nome do produto
          <input
            name="title"
            required
            minLength={3}
            maxLength={160}
            defaultValue={initial?.title}
          />
        </label>
        <label>
          Variante exata (modelo, cor, capacidade ou tamanho)
          <input
            name="variant"
            required
            minLength={3}
            maxLength={200}
            defaultValue={initial?.variant}
          />
        </label>
        <div className="live-fields">
          <label>
            Condição
            <select name="condition" defaultValue={initial?.condition ?? "new"}>
              <option value="new">Novo</option>
              <option value="used">Usado</option>
              <option value="refurbished">Recondicionado</option>
            </select>
          </label>
          {!linkOnly && (
            <label>
              Preço atual (R$)
              <input
                name="price"
                inputMode="decimal"
                required
                defaultValue={decimal(initial?.price)}
              />
            </label>
          )}
          {!linkOnly && (
            <label>
              Preço anterior comprovado (opcional)
              <input
                name="regularPrice"
                inputMode="decimal"
                defaultValue={decimal(initial?.regularPrice)}
              />
            </label>
          )}
        </div>
        <label>
          Link completo do anúncio
          <input
            name="productUrl"
            type="url"
            required
            maxLength={3000}
            defaultValue={initial?.productUrl}
            placeholder={
              storeId === "amazon"
                ? "https://www.amazon.com.br/dp/…"
                : storeId === "magalu"
                  ? "https://www.magazineluiza.com.br/…"
                  : "https://produto.mercadolivre.com.br/…"
            }
          />
        </label>
        <details open={Boolean(initial?.affiliateUrl)}>
          <summary>Adicionar link de afiliado (opcional)</summary>
          <p>
            Você pode adicionar depois. Sem ele, usamos o link normal do
            anúncio. Se informado, use um link da sua conta cuja divulgação
            neste site seja permitida pelo programa.
          </p>
          <label>
            Seu link de afiliado (opcional)
            <input
              name="affiliateUrl"
              type="url"
              maxLength={3000}
              defaultValue={initial?.affiliateUrl}
              placeholder={`Cole o link oficial de afiliado: ${affiliateStoreName(storeId)}`}
            />
          </label>
        </details>
        {!linkOnly && (
          <details>
            <summary>Imagem e frete</summary>
            <label>
              Link da imagem na loja (opcional)
              <input
                name="imageUrl"
                type="url"
                maxLength={3000}
                defaultValue={initial?.imageUrl ?? ""}
              />
            </label>
            <label>
              Frete informado (R$, opcional)
              <input
                name="shipping"
                inputMode="decimal"
                defaultValue={decimal(initial?.shipping)}
              />
            </label>
            <small>
              Deixe em branco quando depender do CEP. Preencher zero significa
              frete grátis confirmado.
            </small>
          </details>
        )}
        <label className="affiliate-check">
          <input type="checkbox" name="verified" required />
          {linkOnly
            ? "Conferi o produto, a variante e o destino do link. O preço será consultado na Amazon."
            : "Conferi agora o preço, a disponibilidade e a variante. O link abre exatamente o anúncio informado nesta oferta."}
        </label>
        {error && (
          <p role="alert" className="live-message live-error">
            {error}
          </p>
        )}
        <div className="live-form-actions">
          <button
            className="live-secondary"
            type="submit"
            value="draft"
            disabled={busy}
          >
            Salvar rascunho
          </button>
          <button
            className="live-primary"
            type="submit"
            value="published"
            disabled={busy}
          >
            {busy ? "Salvando…" : "Publicar por 24 horas"}
          </button>
          <button type="button" onClick={onDone} disabled={busy}>
            Fechar
          </button>
        </div>
      </form>
    </section>
  );
}
export function AffiliatePanel() {
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [editing, setEditing] = useState<Partial<AffiliateOffer> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setOffers((await api()).offers);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    api()
      .then((value) => {
        if (active) {
          setOffers(value.offers);
          setNow(Date.now());
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <section className="live-store-search">
      <div className="live-card">
        <span className="live-kicker">SUAS LOJAS · OFERTAS</span>
        <h2>Suas ofertas para publicar</h2>
        <p>
          Publique com o link normal do anúncio. Você pode adicionar o link de
          afiliado depois. Rascunhos e ofertas vencidas não aparecem para os
          visitantes.
        </p>
        <div className="live-form-actions">
          <button className="live-primary" onClick={() => setEditing({})}>
            Adicionar oferta
          </button>
          <Link className="live-secondary" href="/ofertas" target="_blank">
            Ver vitrine pública ↗
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="live-message live-error">
          {error}
        </p>
      )}
      {editing && (
        <AffiliateEditor
          key={editing.id ?? "new"}
          initial={editing}
          onDone={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      {!offers.length && (
        <p className="live-card">
          Nenhuma oferta preparada ainda. Comece com um anúncio que você
          conferiu na loja.
        </p>
      )}
      <div className="live-catalog">
        {offers.map((o) => (
          <article className="live-card live-product-card" key={o.id}>
            <span className="live-kicker">
              {o.status === "draft"
                ? "RASCUNHO"
                : Date.parse(o.expiresAt) <= now
                  ? "VENCIDA · REVISAR PREÇO"
                  : "PUBLICADA"}
            </span>
            <h3>{o.title}</h3>
            <p>{affiliateStoreName(o.storeId)}</p>
            <p>{o.variant}</p>
            <strong>
              {o.price === null
                ? "Consultar preço na loja"
                : formatBRL(o.price)}
            </strong>
            <p>Conferido em {new Date(o.verifiedAt).toLocaleString("pt-BR")}</p>
            <div className="live-form-actions">
              <button disabled={busy} onClick={() => setEditing(o)}>
                Editar e revisar
              </button>
              {o.status === "published" && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api({ id: o.id }, "unpublish");
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Retirar da vitrine
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
