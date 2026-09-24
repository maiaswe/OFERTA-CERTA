"use client";
import { useState, type FormEvent } from "react";
import { Copy, Plus, Ticket } from "lucide-react";
import type { LiveData } from "@/domain/live";
import type { Coupon } from "@/lib/coupons/rules";
import { integrationApi } from "./integration-panel";
import { toCents } from "@/lib/pricing/money";
const money = (n: number) =>
  (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const local = (s: string | Date) => {
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function CouponPanel({
  data,
  reload,
}: {
  data: LiveData;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const value = editing && editing !== "new" ? editing : null;
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await run(async () => {
      await integrationApi("coupon", {
        ...(value ? { id: value.id } : {}),
        storeId: f.get("store"),
        code: f.get("code"),
        type: f.get("type"),
        amount: toCents(String(f.get("amount")).replace(",", ".")),
        minimumPurchase: toCents(
          String(f.get("minimum") || "0").replace(",", "."),
        ),
        productIds: f.get("product") ? [f.get("product")] : [],
        validFrom: new Date(String(f.get("from"))).toISOString(),
        validUntil: new Date(String(f.get("until"))).toISOString(),
        sourceUrl: f.get("source"),
        rules: f.get("rules"),
        status: "unverified",
      });
      await reload();
      setEditing(null);
      setNotice(
        "Cupom salvo. A confirmação de uso acontece no carrinho da loja.",
      );
    });
  }
  return (
    <section>
      <div className="live-toolbar">
        <div>
          <span className="live-kicker">DESCONTOS QUE VOCÊ ENCONTROU</span>
          <h2>Meus cupons</h2>
        </div>
        <button className="live-primary" onClick={() => setEditing("new")}>
          <Plus size={17} />
          Cadastrar cupom
        </button>
      </div>
      <p>
        Guarde o código, a fonte e as condições. Um cupom cadastrado manualmente
        ainda precisa ser aceito no carrinho.
      </p>
      {error && (
        <p role="alert" className="live-message live-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="live-message">
          {notice}
        </p>
      )}
      {editing && (
        <form
          key={value?.id ?? "new"}
          onSubmit={save}
          className="live-card live-coupon-form"
        >
          <h3>{value ? "Editar cupom" : "Novo cupom"}</h3>
          <div className="live-fields">
            <label>
              Loja
              <select name="store" defaultValue={value?.store_id}>
                {data.stores.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Código
              <input
                name="code"
                required
                minLength={2}
                maxLength={60}
                pattern="[a-zA-Z0-9_\-]+"
                defaultValue={value?.code}
              />
            </label>
            <label>
              Tipo
              <select
                name="type"
                defaultValue={value?.discount_type ?? "fixed"}
              >
                <option value="fixed">Valor em reais</option>
                <option value="percent">Porcentagem</option>
              </select>
            </label>
            <label>
              Desconto (R$ ou %)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={value ? value.amount / 100 : undefined}
              />
            </label>
            <label>
              Compra mínima (R$)
              <input
                name="minimum"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(value?.minimum_purchase ?? 0) / 100}
              />
            </label>
            <label>
              Produto
              <select
                name="product"
                defaultValue={value?.eligible_product_ids[0] ?? ""}
              >
                <option value="">Produtos que atendam às regras abaixo</option>
                {data.products.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Válido a partir de
              <input
                type="datetime-local"
                name="from"
                required
                defaultValue={local(value?.starts_at ?? new Date())}
              />
            </label>
            <label>
              Válido até
              <input
                type="datetime-local"
                name="until"
                required
                defaultValue={value ? local(value.ends_at) : undefined}
              />
            </label>
          </div>
          <label>
            Link da fonte na loja
            <input
              name="source"
              type="url"
              required
              maxLength={2048}
              placeholder="https://..."
              defaultValue={value?.source_url}
            />
          </label>
          <label>
            Regras e restrições
            <textarea
              name="rules"
              required
              minLength={3}
              maxLength={2000}
              placeholder="Ex.: somente no app, primeira compra, produtos participantes…"
              defaultValue={value?.rules}
            />
          </label>
          <div className="live-form-actions">
            <button type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button disabled={busy} className="live-primary">
              Salvar cupom
            </button>
          </div>
        </form>
      )}
      <div className="live-catalog">
        {data.coupons.map((c) => (
          <article className="live-card live-coupon" key={c.id}>
            <Ticket size={25} />
            <span className="live-kicker">
              {data.stores.find((s) => s.id === c.store_id)?.name}
            </span>
            <h3>
              {c.discount_type === "fixed"
                ? money(c.amount)
                : `${c.amount / 100}%`}{" "}
              de desconto
            </h3>
            <strong>{c.code}</strong>
            <p>{c.rules}</p>
            <p>Compra mínima: {money(c.minimum_purchase)}</p>
            <small>
              De {new Date(c.starts_at).toLocaleString("pt-BR")} até{" "}
              {new Date(c.ends_at).toLocaleString("pt-BR")}
            </small>
            <p className="live-muted">
              {c.status === "inactive"
                ? "Desativado"
                : "Cadastro manual · confirmar no carrinho"}
            </p>
            <a href={c.source_url} target="_blank" rel="noopener noreferrer">
              Ver fonte na loja ↗
            </a>
            <div className="live-form-actions">
              <button
                className="live-secondary"
                onClick={() =>
                  run(async () => {
                    await navigator.clipboard.writeText(c.code);
                    setNotice(`Código ${c.code} copiado.`);
                  })
                }
              >
                <Copy size={15} />
                Copiar
              </button>
              <button onClick={() => setEditing(c)}>Editar</button>
              {c.status !== "inactive" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await integrationApi("coupon-disable", { id: c.id });
                      await reload();
                    })
                  }
                >
                  Desativar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.coupons.length && !editing && (
        <div className="live-card live-empty">
          <Ticket size={36} />
          <h3>Seu próximo desconto começa aqui</h3>
          <p>Cadastre um cupom que você encontrou em uma das lojas.</p>
        </div>
      )}
    </section>
  );
}
