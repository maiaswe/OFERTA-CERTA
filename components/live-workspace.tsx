"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronLeft,
  Database,
  Download,
  Heart,
  Plus,
  Search,
  ShieldCheck,
  TrendingDown,
  LogOut,
  Package,
  Store as StoreIcon,
} from "lucide-react";
import type { LiveData, LiveProduct, Observation } from "@/domain/live";
import { historicalStats } from "@/domain/live";
import { loginInput } from "@/lib/auth/forms";
import { useRouter } from "next/navigation";
import { IntegrationPanel } from "./integration-panel";
import { StoreSearch } from "./store-search";
import { CouponPanel } from "./coupon-panel";
import { AffiliatePanel } from "./affiliate-panel";

type Status = {
  setupRequired: boolean;
  user: { id: string; username: string } | null;
  storage: string;
  automaticSearch: boolean;
  setupRequiresToken: boolean;
};
const brl = (v: number | null) =>
  v === null
    ? "A confirmar"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v / 100);
const date = (v: string) =>
  new Date(v).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
const cents = (v: FormDataEntryValue | null) =>
  Math.round(Number(String(v ?? "").replace(",", ".")) * 100);
async function api(action: string, body?: unknown) {
  const response = await fetch(
    `/api/manage?action=${encodeURIComponent(action)}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    },
  );
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error ?? "Não foi possível concluir.");
  return value;
}
export function LiveWorkspace({
  view = "produtos",
  productId = "",
}: {
  view?: string;
  productId?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(view === "favoritos");
  const [selected, setSelected] = useState(productId);
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const observationKey = useRef(crypto.randomUUID());
  const load = useCallback(async () => {
    const state: Status = await api("status");
    setStatus(state);
    if (state.user) setData(await api("data"));
    else setData(null);
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    let active = true;
    api("status")
      .then(async (state) => {
        if (!active) return;
        setStatus(state);
        if (state.user) {
          const d = await api("data");
          if (active) setData(d);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
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
  function openProduct(id: string) {
    setSelected(id);
    router.push(id ? `/painel/produto/${id}` : "/painel");
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const parsed = loginInput.safeParse({
        username: form.get("username"),
        password: form.get("password"),
        ...(form.get("bootstrapToken")
          ? { bootstrapToken: form.get("bootstrapToken") }
          : {}),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api(status?.setupRequired ? "setup" : "login", parsed.data);
      await load();
    });
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const result = await api("product", {
        name: form.get("name"),
        brand: form.get("brand"),
        model: form.get("model"),
        category: form.get("category"),
        gtin: form.get("gtin"),
        mpn: form.get("mpn"),
        condition: form.get("condition"),
        origin: form.get("origin"),
        warranty: form.get("warranty") || "unknown",
        attributes: {},
      });
      await load();
      openProduct(result.id);
      setAdding(false);
      setNotice(
        "Produto salvo no seu banco. Agora você pode registrar uma oferta.",
      );
    });
  }
  async function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    await run(async () => {
      await api("observation", {
        productId: selected,
        storeId: form.get("store"),
        url: form.get("url"),
        seller: form.get("seller"),
        price: cents(form.get("price")),
        shipping:
          form.get("shipping") === "" ? null : cents(form.get("shipping")),
        fees: cents(form.get("fees")),
        discount: cents(form.get("discount")),
        payment: form.get("payment"),
        shippingContext: form.get("shippingContext") || "Destino não informado",
        observedAt: new Date(String(form.get("observedAt"))).toISOString(),
        available: form.get("available") === "on",
        exact: form.get("exact") === "on",
        idempotencyKey: observationKey.current,
        ...(form.get("couponId")
          ? {
              couponId: form.get("couponId"),
              couponConfirmed: form.get("couponConfirmed") === "on",
            }
          : {}),
      });
      observationKey.current = crypto.randomUUID();
      await load();
      element.reset();
      setNotice("Preço registrado. O histórico anterior foi preservado.");
    });
  }
  const product = data?.products.find((p) => p.id === selected);
  const normalized = query.toLocaleLowerCase("pt-BR");
  const visible =
    data?.products.filter(
      (p) =>
        (!onlyFavorites || data.favorites.some((f) => f.product_id === p.id)) &&
        `${p.name} ${p.brand} ${p.model} ${p.gtin ?? ""} ${p.mpn ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized),
    ) ?? [];
  const history =
    data?.observations.filter((o) => o.product_id === selected) ?? [];
  const latest = [
    ...new Map([...history].reverse().map((o) => [o.offer_id, o])).values(),
  ].sort((a, b) => (a.final_price ?? Infinity) - (b.final_price ?? Infinity));
  return (
    <div className="live-root">
      <header className="live-header">
        <Link href="/painel" className="live-brand">
          <span>
            <TrendingDown size={23} />
          </span>
          oferta<span className="live-brand-light">certa</span>
          <sup>MEU PAINEL</sup>
        </Link>
        <div className="live-header-actions">
          <Link href="/ofertas">Ver ofertas</Link>
          {status?.user && (
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("logout", {});
                  await load();
                })
              }
            >
              <LogOut size={16} />
              Sair
            </button>
          )}
        </div>
      </header>
      <main className="live-main">
        {error && (
          <div role="alert" className="live-message live-error">
            {error}
            <button onClick={() => run(load)}>Tentar novamente</button>
          </div>
        )}
        {notice && (
          <div role="status" className="live-message">
            <Check size={18} />
            {notice}
          </div>
        )}
        {!status && !error && (
          <div role="status" className="live-loading">
            Conectando ao seu banco…
          </div>
        )}
        {status && !status.user && (
          <section className="live-welcome">
            <div>
              <span className="live-kicker">
                SUA PRÓXIMA COMPRA, MAIS CONSCIENTE
              </span>
              <h1>
                Suas ofertas.
                <br />
                Seu histórico.
                <br />
                <em>Agora de verdade.</em>
              </h1>
              <p>
                Guarde os preços que você encontrou, compare o custo completo e
                acompanhe seus produtos em um só lugar.
              </p>
              <div className="live-trust">
                <ShieldCheck />
                Dados protegidos · Histórico preservado
              </div>
            </div>
            <form noValidate onSubmit={login} className="live-card live-login">
              <span className="live-icon">
                <Database />
              </span>
              <h2>
                {status.setupRequired
                  ? "Crie seu acesso"
                  : "Bem-vindo de volta"}
              </h2>
              <p>
                {status.setupRequired
                  ? "Este painel é pessoal. Crie a conta principal para começar."
                  : "Entre para acessar seus produtos e registros."}
              </p>
              <label>
                Usuário
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={60}
                  autoComplete="username"
                  placeholder="Seu nome de usuário"
                />
              </label>
              <label>
                Senha
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete={
                    status.setupRequired ? "new-password" : "current-password"
                  }
                  placeholder="Pelo menos 12 caracteres"
                />
              </label>
              <small>
                Use pelo menos 12 caracteres na senha. Seu usuário pode ter
                espaços e acentos.
              </small>
              <button
                type="button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ocultar senha" : "Mostrar senha"}
              </button>
              {status.setupRequired && status.setupRequiresToken && (
                <label>
                  Código de configuração
                  <input
                    name="bootstrapToken"
                    type="password"
                    required
                    autoComplete="off"
                  />
                </label>
              )}
              <button className="live-primary" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : status.setupRequired
                    ? "Criar conta e começar"
                    : "Entrar no meu painel"}
                <ArrowUpRight size={18} />
              </button>
              <small>
                {status.storage === "cloud"
                  ? "Conectado ao banco do Oferta Certa na nuvem."
                  : "Dados guardados neste computador."}
              </small>
            </form>
          </section>
        )}
        {status?.user && data && (
          <>
            <nav className="live-nav" aria-label="Meu painel">
              {[
                ["produtos", "/painel", "Meus produtos"],
                ["busca", "/painel/busca", "Buscar no Mercado Livre"],
                ["afiliados", "/painel/afiliados", "Publicar ofertas"],
                ["favoritos", "/painel/favoritos", "Favoritos"],
                ["historico", "/painel/historico", "Histórico"],
                ["cupons", "/painel/cupons", "Cupons"],
                ["integracoes", "/painel/integracoes", "Integrações"],
              ].map(([key, href, label]) => (
                <Link
                  key={key}
                  href={href}
                  aria-current={view === key ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {view === "produtos" && !productId && (
              <div className="live-heading">
                <div>
                  <span className="live-kicker">
                    BOM TER VOCÊ POR AQUI, {status.user.username.toUpperCase()}
                  </span>
                  <h1>
                    Compras melhores começam
                    <br />
                    com <em>informação real.</em>
                  </h1>
                  <p>Seu espaço para organizar produtos e acompanhar preços.</p>
                </div>
                <a
                  className="live-secondary"
                  href="/api/manage?action=export"
                  download
                >
                  <Download size={17} />
                  Exportar meus dados
                </a>
              </div>
            )}
            <div className="live-status-row">
              <span>
                <Database size={15} />
                {status.storage === "cloud"
                  ? "Banco na nuvem conectado"
                  : "Banco local conectado"}
              </span>
              <span>{data.products.length} produtos</span>
              <span>{data.observations.length} registros carregados</span>
            </div>
            {view === "produtos" && !productId && (
              <aside className="live-integration-note">
                <StoreIcon size={22} />
                <div>
                  <strong>Seu catálogo, seus registros e suas conexões.</strong>
                  <p>
                    Conecte o Mercado Livre em Integrações para consultar seu
                    catálogo. Você também pode registrar ofertas manualmente. Os
                    alertas aparecem aqui quando uma nova coleta atinge seu
                    alvo.
                  </p>
                </div>
              </aside>
            )}
            {view === "produtos" &&
              !productId &&
              data.notifications.some((n) => !n.read_at) && (
                <section className="live-card live-notifications">
                  <h2>
                    <Bell size={19} />
                    Seu radar de preços
                  </h2>
                  {data.notifications
                    .filter((n) => !n.read_at)
                    .map((n) => (
                      <p key={n.id}>
                        {n.message}
                        <small>{date(n.created_at)}</small>
                      </p>
                    ))}
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api("read-notifications", {});
                        await load();
                      })
                    }
                  >
                    Marcar como lidas
                  </button>
                </section>
              )}
            {view === "integracoes" ? (
              <IntegrationPanel />
            ) : view === "busca" ? (
              <StoreSearch
                onSaved={async (id) => {
                  await load();
                  openProduct(id);
                }}
              />
            ) : view === "afiliados" ? (
              <AffiliatePanel />
            ) : view === "cupons" ? (
              <CouponPanel data={data} reload={load} />
            ) : view === "historico" ? (
              <section className="live-card">
                <h2>Histórico de preços</h2>
                <p>
                  Valores coletados por oferta e condição de pagamento. Os
                  registros manuais são identificados nas fontes.
                </p>
                <HistoryView observations={data.observations} />
              </section>
            ) : product ? (
              <>
                <button className="live-back" onClick={() => openProduct("")}>
                  <ChevronLeft size={17} />
                  Todos os produtos
                </button>
                <div className="live-product-title">
                  <div>
                    <span className="live-kicker">
                      {product.brand} · {product.category}
                    </span>
                    <h2>{product.name}</h2>
                    <p>
                      {product.model} · {conditionLabel(product.condition)} ·{" "}
                      {originLabel(product.origin)}
                    </p>
                    <small>
                      GTIN: {product.gtin || "não informado"} · MPN:{" "}
                      {product.mpn || "não informado"} · Garantia:{" "}
                      {product.warranty === "unknown"
                        ? "não informada"
                        : product.warranty}
                    </small>
                  </div>
                  <button
                    aria-label="Salvar favorito"
                    className="live-secondary"
                    onClick={() =>
                      run(async () => {
                        await api("favorite", {
                          productId: product.id,
                          saved: !data.favorites.some(
                            (f) => f.product_id === product.id,
                          ),
                        });
                        await load();
                      })
                    }
                    disabled={busy}
                  >
                    <Heart
                      size={20}
                      fill={
                        data.favorites.some((f) => f.product_id === product.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <div className="live-detail-grid">
                  <section>
                    <div className="live-card">
                      <h2>Ofertas registradas</h2>
                      <p className="live-muted">
                        Último registro de cada oferta. Frete desconhecido
                        mantém o total a confirmar.
                      </p>
                      {!latest.length ? (
                        <div className="live-empty">
                          <Package />
                          <h3>A primeira oferta começa aqui</h3>
                          <p>
                            Registre os dados que você conferiu no site da loja.
                          </p>
                        </div>
                      ) : (
                        latest.map((o) => (
                          <div className="live-offer" key={o.offer_id}>
                            <div>
                              <strong>{o.store_name}</strong>
                              <small>
                                {o.seller} · {o.payment}
                              </small>
                              <span className="live-tag">
                                {o.source === "manual"
                                  ? "Registro manual"
                                  : "API da loja"}{" "}
                                ·{" "}
                                {o.data_quality_status === "partial"
                                  ? "Correspondência parcial"
                                  : "Conferência informada"}
                              </span>
                              <small>
                                {date(o.source_observed_at)} ·{" "}
                                {o.available
                                  ? "Disponível quando conferido"
                                  : "Indisponível quando conferido"}
                              </small>
                              <small>{o.shipping_context}</small>
                            </div>
                            <div className="live-offer-price">
                              <strong>{brl(o.final_price)}</strong>
                              <small>
                                Produto: {brl(o.product_price)} · Frete:{" "}
                                {brl(o.shipping_price)}
                              </small>
                              <small>
                                Taxas: {brl(o.fees)} · Desconto:{" "}
                                {brl(o.discount_price)}
                              </small>
                              <a
                                href={o.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Conferir na loja <ArrowUpRight size={14} />
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="live-card">
                      <h2>Histórico preservado</h2>
                      <p className="live-muted">
                        Cada coleta é um novo registro. Comparações consideram a
                        mesma oferta e condição de pagamento.
                      </p>
                      <HistoryView observations={history} />
                    </div>
                    <form
                      className="live-card live-alert"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        run(async () => {
                          await api("alert", {
                            productId: product.id,
                            target: cents(form.get("target")),
                          });
                          await load();
                          setNotice(
                            "Alerta salvo. Você será avisado neste painel ao registrar um preço que atinja o alvo.",
                          );
                        });
                      }}
                    >
                      <h2>
                        <Bell size={18} />
                        Acompanhar preço-alvo
                      </h2>
                      <p>
                        Alvo sobre o preço do produto, antes de frete, taxas e
                        descontos.
                      </p>
                      <div>
                        <label>
                          Preço-alvo (R$)
                          <input
                            name="target"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            defaultValue={
                              data.alerts.find(
                                (a) => a.product_id === product.id,
                              )?.target_price
                                ? data.alerts.find(
                                    (a) => a.product_id === product.id,
                                  )!.target_price / 100
                                : ""
                            }
                          />
                        </label>
                        <button className="live-primary" disabled={busy}>
                          Salvar alerta
                        </button>
                      </div>
                    </form>
                  </section>
                  <form
                    onSubmit={saveObservation}
                    className="live-card live-observation"
                  >
                    <h2>Registrar preço</h2>
                    <p>
                      Use os valores que você conferiu. Não fazemos coleta
                      automática desse link.
                    </p>
                    <label>
                      Loja
                      <select name="store" required>
                        {data.stores.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Link do produto na loja
                      <input
                        type="url"
                        name="url"
                        required
                        maxLength={2048}
                        placeholder="https://…"
                      />
                    </label>
                    <label>
                      Vendedor
                      <input
                        name="seller"
                        required
                        maxLength={120}
                        placeholder="Nome exibido no anúncio"
                      />
                    </label>
                    <div className="live-fields">
                      <label>
                        Produto (R$)
                        <input
                          type="number"
                          name="price"
                          required
                          min="0.01"
                          max="1000000"
                          step="0.01"
                        />
                      </label>
                      <label>
                        Frete (R$)
                        <input
                          type="number"
                          name="shipping"
                          min="0"
                          max="100000"
                          step="0.01"
                          placeholder="A confirmar"
                        />
                      </label>
                      <label>
                        Taxas (R$)
                        <input
                          type="number"
                          name="fees"
                          min="0"
                          max="100000"
                          step="0.01"
                          defaultValue="0"
                        />
                      </label>
                      <label>
                        Desconto (R$)
                        <input
                          type="number"
                          name="discount"
                          min="0"
                          step="0.01"
                          defaultValue="0"
                        />
                      </label>
                    </div>
                    <small>
                      Preencha zero no frete apenas se a entrega for gratuita.
                    </small>
                    <label>
                      Pagamento
                      <select name="payment">
                        <option>Pix</option>
                        <option>Cartão à vista</option>
                        <option>Boleto</option>
                        <option>Cartão parcelado — valor total</option>
                      </select>
                    </label>
                    <label>
                      Destino / condição do frete
                      <input
                        name="shippingContext"
                        required
                        maxLength={100}
                        placeholder="Ex.: São Paulo/SP, entrega padrão"
                      />
                    </label>
                    <label>
                      Quando você conferiu
                      <input
                        type="datetime-local"
                        name="observedAt"
                        required
                        defaultValue={localDate()}
                      />
                    </label>
                    <label className="live-checkbox">
                      <input type="checkbox" name="available" defaultChecked />
                      Estava disponível
                    </label>
                    <label className="live-checkbox">
                      <input type="checkbox" name="exact" />
                      Conferi modelo, variante, condição, origem e garantia:
                      correspondem ao produto acima.
                    </label>
                    <label>
                      Cupom utilizado (opcional)
                      <select name="couponId">
                        <option value="">Sem cupom associado</option>
                        {data.coupons
                          .filter(
                            (c) =>
                              c.status !== "inactive" &&
                              (!c.eligible_product_ids.length ||
                                c.eligible_product_ids.includes(selected)),
                          )
                          .map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.code} ·{" "}
                              {
                                data.stores.find((s) => s.id === c.store_id)
                                  ?.name
                              }
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="live-checkbox">
                      <input type="checkbox" name="couponConfirmed" />
                      Confirmei no carrinho a aplicação do cupom e informei o
                      desconto correspondente acima.
                    </label>
                    <button className="live-primary" disabled={busy}>
                      {busy ? "Salvando…" : "Salvar no histórico"}
                      <Plus size={17} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="live-toolbar">
                  <div className="live-search">
                    <Search size={19} />
                    <input
                      aria-label="Buscar nos meus produtos"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar nos meus produtos…"
                    />
                  </div>
                  <button
                    className={
                      onlyFavorites
                        ? "live-secondary live-selected"
                        : "live-secondary"
                    }
                    onClick={() => setOnlyFavorites(!onlyFavorites)}
                  >
                    <Heart size={17} />
                    Favoritos
                  </button>
                  <button
                    className="live-primary"
                    onClick={() => setAdding(!adding)}
                  >
                    <Plus size={18} />
                    Novo produto
                  </button>
                </div>
                {adding && (
                  <form
                    onSubmit={saveProduct}
                    className="live-card live-new-product"
                  >
                    <h2>Qual produto você quer acompanhar?</h2>
                    <p>
                      Quanto mais precisa a identificação, melhor a comparação.
                    </p>
                    <label>
                      Nome do produto
                      <input
                        name="name"
                        required
                        minLength={3}
                        maxLength={160}
                        placeholder="Ex.: SSD Samsung 990 PRO 2 TB"
                      />
                    </label>
                    <div className="live-fields">
                      <label>
                        Marca
                        <input name="brand" required maxLength={60} />
                      </label>
                      <label>
                        Modelo / variante
                        <input name="model" required maxLength={100} />
                      </label>
                      <label>
                        Categoria
                        <select name="category">
                          {[
                            "Hardware",
                            "Celulares",
                            "Áudio",
                            "Eletrodomésticos",
                            "Outros",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Condição
                        <select name="condition">
                          <option value="new">Novo</option>
                          <option value="used">Usado</option>
                          <option value="refurbished">Recondicionado</option>
                        </select>
                      </label>
                      <label>
                        Origem
                        <select name="origin">
                          <option value="unknown">Não confirmada</option>
                          <option value="national">Nacional</option>
                          <option value="imported">Importado</option>
                        </select>
                      </label>
                      <label>
                        Garantia
                        <input
                          name="warranty"
                          maxLength={120}
                          placeholder="Ex.: 12 meses do fabricante"
                        />
                      </label>
                      <label>
                        GTIN / EAN (opcional)
                        <input
                          name="gtin"
                          inputMode="numeric"
                          pattern="([0-9]{8}|[0-9]{12,14})?"
                        />
                      </label>
                      <label>
                        MPN (opcional)
                        <input name="mpn" maxLength={100} />
                      </label>
                    </div>
                    <div className="live-form-actions">
                      <button type="button" onClick={() => setAdding(false)}>
                        Cancelar
                      </button>
                      <button className="live-primary" disabled={busy}>
                        Salvar produto
                      </button>
                    </div>
                  </form>
                )}
                <section className="live-catalog">
                  {visible.length ? (
                    visible.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        rows={data.observations.filter(
                          (o) => o.product_id === p.id,
                        )}
                        favorite={data.favorites.some(
                          (f) => f.product_id === p.id,
                        )}
                        open={() => openProduct(p.id)}
                      />
                    ))
                  ) : (
                    <div className="live-empty live-card">
                      <Package size={38} />
                      <h2>
                        {data.products.length
                          ? "Nenhum produto com esse filtro"
                          : "Seu catálogo está pronto para começar"}
                      </h2>
                      <p>
                        {data.products.length
                          ? "Experimente outro nome ou remova o filtro de favoritos."
                          : "Adicione o primeiro produto e comece a construir seu próprio histórico de preços."}
                      </p>
                      {!data.products.length && (
                        <button
                          className="live-primary"
                          onClick={() => setAdding(true)}
                        >
                          <Plus size={18} />
                          Adicionar primeiro produto
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
            <section className="live-stores">
              <h2>Conexões com as lojas</h2>
              <p>
                As credenciais e permissões de consulta ainda precisam ser
                aprovadas por cada loja.
              </p>
              <div>
                {data.stores.map((s) => (
                  <span key={s.id}>
                    {s.name}
                    <small>
                      {s.id === "mercadolivre"
                        ? "Configurar em Integrações"
                        : "Cadastro manual disponível"}
                    </small>
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="live-footer">
        <span>oferta certa · decisões com mais clareza</span>
        <span>
          O preço final e a disponibilidade devem ser conferidos na loja.
        </span>
      </footer>
    </div>
  );
}
function conditionLabel(v: string) {
  return (
    (
      { new: "Novo", used: "Usado", refurbished: "Recondicionado" } as Record<
        string,
        string
      >
    )[v] ?? v
  );
}
function originLabel(v: string) {
  return (
    (
      {
        national: "Nacional",
        imported: "Importado",
        unknown: "Origem não confirmada",
      } as Record<string, string>
    )[v] ?? v
  );
}
function localDate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function ProductCard({
  product,
  rows,
  favorite,
  open,
}: {
  product: LiveProduct;
  rows: Observation[];
  favorite: boolean;
  open: () => void;
}) {
  const latest = [
    ...new Map([...rows].reverse().map((o) => [o.offer_id, o])).values(),
  ].filter((o) => o.available && o.data_quality_status !== "partial");
  const prices = latest.flatMap((o) =>
    o.final_price === null ? [] : [o.final_price],
  );
  return (
    <button onClick={open} className="live-card live-product-card">
      <div className="live-product-art">
        <Package size={46} />
        {favorite && <Heart size={18} fill="currentColor" />}
      </div>
      <span className="live-kicker">{product.category}</span>
      <h3>{product.name}</h3>
      <p>
        {product.model} · {conditionLabel(product.condition)}
      </p>
      <strong>
        {latest.length
          ? brl(Math.min(...latest.map((o) => o.product_price)))
          : "Sem preço registrado"}
      </strong>
      <small>Menor preço registrado do produto</small>
      <small>
        {prices.length
          ? `Menor total conhecido: ${brl(Math.min(...prices))}`
          : "Frete e total a confirmar"}
      </small>
      <small>
        {rows.length} registros · {latest.length} ofertas correspondentes
      </small>
      <span className="live-card-link">
        Ver ofertas e histórico
        <ArrowUpRight size={17} />
      </span>
    </button>
  );
}
function HistoryView({ observations }: { observations: Observation[] }) {
  const [period, setPeriod] = useState(0);
  const [now] = useState(() => Date.now());
  const filtered = period
    ? observations.filter(
        (o) => Date.parse(o.collected_at) >= now - period * 86400000,
      )
    : observations;
  const groups = [...new Set(filtered.map((o) => o.offer_id))];
  return (
    <>
      <label className="live-period">
        Período
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          <option value={0}>Todos os registros carregados</option>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </label>
      {!groups.length && (
        <p className="live-muted">
          O gráfico aparecerá quando houver preços registrados.
        </p>
      )}
      {groups.map((id) => {
        const rows = filtered
          .filter((o) => o.offer_id === id)
          .sort(
            (a, b) => Date.parse(a.collected_at) - Date.parse(b.collected_at),
          );
        const stats = historicalStats(filtered, id);
        const vals = rows.map((r) => r.product_price);
        const min = Math.min(...vals),
          max = Math.max(...vals);
        const points = rows
          .map(
            (r, i) =>
              `${20 + (rows.length === 1 ? 220 : (i / (rows.length - 1)) * 440)},${130 - ((r.product_price - min) / (max - min || 1)) * 95}`,
          )
          .join(" ");
        return (
          <div className="live-history" key={id}>
            {rows[0].identity_snapshot?.name && (
              <h3>{rows[0].identity_snapshot.name}</h3>
            )}
            <strong>
              {rows[0].store_name} · {rows[0].seller} · {rows[0].payment}
            </strong>
            <small>{rows[0].shipping_context}</small>
            <svg
              viewBox="0 0 480 160"
              role="img"
              aria-label={`Histórico de ${rows.length} registros de preços do produto`}
            >
              <line x1="20" x2="460" y1="145" y2="145" stroke="#dfe8e2" />
              <polyline
                points={points}
                fill="none"
                stroke="#1b6443"
                strokeWidth="3"
              />
              {points.split(" ").map((p, i) => (
                <circle
                  key={rows[i].id}
                  cx={p.split(",")[0]}
                  cy={p.split(",")[1]}
                  r="4"
                  fill="#1b6443"
                >
                  <title>
                    {date(rows[i].source_observed_at)}:{" "}
                    {brl(rows[i].product_price)}
                  </title>
                </circle>
              ))}
            </svg>
            <p>
              {stats?.label ?? "Correspondência não confirmada"} · Menor
              registro: {brl(min)} · Maior: {brl(max)}
            </p>
            <p>
              Preço atual registrado: {brl(rows.at(-1)!.product_price)} · Média
              de mínimos diários anteriores: {brl(stats?.average ?? null)} ·{" "}
              {rows.length} registros no período
            </p>
            <details>
              <summary>Ver registros e fontes ({rows.length})</summary>
              <div className="live-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Conferido em</th>
                      <th>Salvo em</th>
                      <th>Produto</th>
                      <th>Total</th>
                      <th>Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((r) => (
                      <tr key={r.id}>
                        <td>{date(r.source_observed_at)}</td>
                        <td>{date(r.collected_at)}</td>
                        <td>{brl(r.product_price)}</td>
                        <td>{brl(r.final_price)}</td>
                        <td>
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {r.source === "manual" ? "Manual" : "API"}
                            {r.data_quality_status === "partial"
                              ? " · parcial"
                              : ""}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        );
      })}
    </>
  );
}
