"use client";

import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type ReactNode,
  type ComponentProps,
} from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FlaskConical,
  Heart,
  History,
  Info,
  LayoutGrid,
  Menu,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tag,
  TrendingDown,
  X,
} from "lucide-react";
import {
  bestFinal,
  categories,
  finalPrice,
  historyInPeriod,
  money,
  parseStoredFavorites,
  periods,
  products,
  searchProducts,
  sortedOffers,
  sourceLabel,
  stores,
  type Product,
} from "@/domain/demo";
import { ProductArt } from "./product-art";
import { Platform } from "./platform";

// Keep every fictional screen within the explicitly named demonstration area.
function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const destination =
    typeof href === "string" &&
    href.startsWith("/") &&
    !href.startsWith("/painel")
      ? `/demonstracao${href === "/" ? "" : href}`
      : href;
  return <NextLink {...props} href={destination} />;
}

const nav = [
  { href: "/", label: "Explorar", icon: LayoutGrid },
  { href: "/historico", label: "Histórico", icon: ChartNoAxesCombined },
  { href: "/cupons", label: "Cupons", icon: Tag },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
];
const storageEvent = "oferta-certa-storage";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEvent, callback);
  };
}
function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function useStorage(key: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readStorage(key),
    () => null,
  );
  const set = (value: string) => {
    try {
      localStorage.setItem(key, value);
      window.dispatchEvent(new Event(storageEvent));
      return true;
    } catch {
      return false;
    }
  };
  return [raw, set] as const;
}

export function OfertaApp({ route }: { route: string }) {
  return (
    <Suspense
      fallback={
        <div className="empty" role="status">
          Preparando busca…
        </div>
      }
    >
      <AppContent route={route} />
    </Suspense>
  );
}
function AppContent({ route }: { route: string }) {
  const [theme, setTheme] = useStorage("oferta-theme");
  const [favoritesRaw, setFavorites] = useStorage("oferta-favorites");
  const favorites = parseStoredFavorites(favoritesRaw);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  useEffect(() => {
    document.documentElement.dataset.theme =
      theme === "dark" ? "dark" : "light";
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    if (setFavorites(JSON.stringify(next)))
      setToast(
        next.includes(id)
          ? "Produto salvo nos favoritos deste navegador."
          : "Produto removido dos favoritos.",
      );
    else
      setToast(
        "O navegador bloqueou o armazenamento. Não foi possível salvar.",
      );
  };
  const product = products.find((p) => `produto/${p.id}` === route);
  return (
    <>
      <Platform />
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="demo-strip">
        <FlaskConical size={14} />
        <span>
          Modo demonstração{" "}
          <span className="strip-extra">
            — preços, histórico e cupons fictícios. Nenhuma loja conectada.
          </span>
        </span>
        <Link href="/painel">
          Abrir meu painel <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Oferta Certa — início">
            <span className="brand-symbol">
              <ChartNoAxesCombined size={25} />
            </span>
            oferta<span className="brand-light">certa</span>
            <span className="brand-dot" />
          </Link>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={
                  (route === "" && n.href === "/") || "/" + route === n.href
                    ? "page"
                    : undefined
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link
              className="icon-button admin-link"
              href="/admin"
              aria-label="Administração"
            >
              <Settings2 size={20} />
            </Link>
            <span className="header-divider" />
            <span className="profile" title="Uso pessoal, sem conta conectada">
              EU
            </span>
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Navegação móvel">
            {[
              ...nav,
              { href: "/admin", label: "Administração", icon: Settings2 },
            ].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)}>
                <n.icon size={18} />
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main id="conteudo" className="main">
        {route === "" && (
          <Home favorites={favorites} toggleFavorite={toggleFavorite} />
        )}
        {route === "busca" && (
          <Results
            key={query}
            query={query}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        )}
        {product && (
          <ProductDetails
            product={product}
            saved={favorites.includes(product.id)}
            toggleFavorite={() => toggleFavorite(product.id)}
            notify={setToast}
          />
        )}
        {route === "historico" && <HistoryPage />}
        {route === "cupons" && <Coupons notify={setToast} />}
        {route === "favoritos" && (
          <Favorites
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            notify={setToast}
          />
        )}
        {route === "admin" && <Admin />}
      </main>
      <footer className="footer">
        <div>
          <span className="footer-brand">oferta certa.</span>
          <span>Mais clareza. Melhores escolhas.</span>
        </div>
        <p>
          <FlaskConical size={14} /> Prévia visual · Fase 1 · Dados
          demonstrativos
        </p>
        <Link href="/admin">
          Transparência <ArrowUpRight size={14} />
        </Link>
      </footer>
      <div
        role="status"
        aria-live="polite"
        className={toast ? "toast visible" : "toast"}
      >
        {toast && (
          <>
            <Check size={18} />
            {toast}
          </>
        )}
      </div>
    </>
  );
}

function SearchBox({
  initial = "",
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    startTransition(() =>
      router.push(`/demonstracao/busca?q=${encodeURIComponent(q)}`),
    );
  }
  return (
    <form
      onSubmit={submit}
      className={`search-form ${compact ? "compact" : ""}`}
      role="search"
    >
      <Search size={22} />
      <label
        className="sr-only"
        htmlFor={compact ? "search-compact" : "search-main"}
      >
        Pesquisar produto
      </label>
      <input
        key={initial}
        id={compact ? "search-compact" : "search-main"}
        name="q"
        defaultValue={initial}
        placeholder="Qual produto você está procurando?"
        maxLength={120}
        autoComplete="off"
      />
      <button className="button primary" disabled={pending}>
        {pending ? "Buscando…" : "Buscar ofertas"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Home({
  favorites,
  toggleFavorite,
}: {
  favorites: string[];
  toggleFavorite: (id: string) => void;
}) {
  const [category, setCategory] = useState("Todos");
  const [recent] = useStorage("oferta-recent");
  let recentSearches: string[] = [];
  try {
    const parsed: unknown = JSON.parse(recent ?? "[]");
    if (Array.isArray(parsed))
      recentSearches = parsed
        .filter((x): x is string => typeof x === "string")
        .slice(0, 4);
  } catch {}
  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <p className="eyebrow">
            <span className="live-dot" /> COMPRE COM MAIS CLAREZA
          </p>
          <h1>
            Uma boa compra
            <br />
            começa com o <span>preço real.</span>
          </h1>
          <p className="hero-description">
            Compare ofertas, confira o histórico e descubra
            <br className="desktop-break" /> quando vale a pena comprar.
          </p>
          <SearchBox />
          <div className="search-examples">
            <span>Experimente</span>
            {["RTX 4060 Ti 16 GB", "SSD 1 TB", "iPhone 15"].map((q) => (
              <Link key={q} href={`/busca?q=${encodeURIComponent(q)}`}>
                {q}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        </div>
        <aside className="insight-card">
          <div className="insight-top">
            <span className="round-icon">
              <TrendingDown size={20} />
            </span>
            <span>O preço conta uma história.</span>
            <Sparkles size={18} />
          </div>
          <div className="insight-heading">
            Descubra a diferença
            <br />
            entre desconto e oportunidade.
          </div>
          <svg
            viewBox="0 0 340 100"
            fill="none"
            className="hero-chart"
            aria-hidden="true"
          >
            <path
              d="M0 24H340M0 56H340M0 88H340"
              stroke="currentColor"
              opacity=".12"
              strokeDasharray="3 5"
            />
            <path
              d="M0 32 35 32 35 20 80 20 80 40 125 40 125 34 160 34 160 59 204 59 204 48 245 48 245 71 292 71 292 86 335 86"
              stroke="#bdd78a"
              strokeWidth="3"
            />
            <circle cx="335" cy="86" r="5" fill="#bdd78a" />
          </svg>
          <div className="insight-bottom">
            <span>
              O histórico revela.
              <br />
              <strong>Você decide.</strong>
            </span>
            <span className="demo-pill">Gráfico ilustrativo</span>
          </div>
        </aside>
      </section>
      <div className="trust-row">
        <span>
          <ShieldCheck size={18} /> Produto certo, comparação justa
        </span>
        <span>
          <Tag size={18} /> Frete e condições às claras
        </span>
        <span>
          <History size={18} /> Histórico sem adivinhação
        </span>
      </div>
      {recentSearches.length > 0 && (
        <div className="recent">
          <Clock3 size={16} />
          <span>Suas buscas:</span>
          {recentSearches.map((q) => (
            <Link key={q} href={`/busca?q=${encodeURIComponent(q)}`}>
              {q || "Todos os produtos"}
            </Link>
          ))}
        </div>
      )}
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE O COMPARADOR</p>
            <h2>De olho na próxima compra</h2>
            <p className="muted">
              Exemplos para conhecer cada detalhe antes de decidir.
            </p>
          </div>
          <Link className="text-link" href="/busca">
            Ver todos os produtos <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-tabs" aria-label="Categorias">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={category === c ? "selected" : ""}
            >
              {c === "Todos" && <LayoutGrid size={16} />} {c}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {products
            .filter((p) => category === "Todos" || p.category === category)
            .slice(0, 3)
            .map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                saved={favorites.includes(p.id)}
                toggleFavorite={() => toggleFavorite(p.id)}
              />
            ))}
        </div>
      </section>
      <section className="bottom-note">
        <div className="round-icon pale">
          <CircleHelp size={23} />
        </div>
        <div>
          <h3>O menor preço nem sempre é o menor custo.</h3>
          <p>
            Frete, forma de pagamento e especificações também entram na conta.
          </p>
        </div>
        <Link href="/busca?q=RTX%204060%20Ti%2016%20GB" className="text-link">
          Experimente comparar <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
function ProductCard({
  product: p,
  saved,
  toggleFavorite,
}: {
  product: Product;
  saved: boolean;
  toggleFavorite: () => void;
}) {
  const best = bestFinal(p.offers);
  return (
    <article className="product-card">
      <div className="card-art">
        <span className="card-category">{p.category}</span>
        <button
          className={`icon-button favorite ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Remover" : "Salvar"} ${p.name} ${saved ? "dos" : "nos"} favoritos`}
          aria-pressed={saved}
          onClick={toggleFavorite}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        <Link
          href={`/produto/${p.id}`}
          aria-label={`Ver detalhes de ${p.name}`}
        >
          <ProductArt kind={p.kind} />
        </Link>
      </div>
      <div className="card-body">
        <div className="product-brand">{p.brand}</div>
        <h3>
          <Link href={`/produto/${p.id}`}>{p.name}</Link>
        </h3>
        <div className="specs">
          {p.specs.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="price-label">Preço ilustrativo do produto</div>
        <div className="price-row">
          <strong>{money(p.price)}</strong>
          <span className="price-drop">
            <ArrowDownRight size={14} />
            {Math.round((1 - p.price / p.previous) * 100)}% no exemplo
          </span>
        </div>
        <p className="final-note">
          Custo conhecido a partir de <b>{money(finalPrice(best)!)}</b>
        </p>
        <div className="card-source">
          <Clock3 size={12} />
          {sourceLabel}
        </div>
        <Link className="compare-button" href={`/produto/${p.id}`}>
          Comparar {p.offers.filter((o) => o.match === "exact").length} ofertas
          fictícias <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

function Results({
  query,
  favorites,
  toggleFavorite,
}: {
  query: string;
  favorites: string[];
  toggleFavorite: (id: string) => void;
}) {
  const [category, setCategory] = useState("Todos");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("recommended");
  const [panel, setPanel] = useState(false);
  const [scenario, setScenario] = useState("complete");
  useEffect(() => {
    let old: string[] = [];
    try {
      const v: unknown = JSON.parse(readStorage("oferta-recent") ?? "[]");
      if (Array.isArray(v))
        old = v.filter((x): x is string => typeof x === "string");
    } catch {}
    if (query) {
      try {
        localStorage.setItem(
          "oferta-recent",
          JSON.stringify(
            [query, ...old.filter((x) => x !== query)].slice(0, 4),
          ),
        );
        window.dispatchEvent(new Event(storageEvent));
      } catch {}
    }
  }, [query]);
  const matches = searchProducts(
    query,
    category,
    max ? Number(max) * 100 : undefined,
  ).sort((a, b) => (sort === "price" ? a.price - b.price : 0));
  return (
    <>
      <PageIntro
        eyebrow="ENCONTRE SEU PRODUTO"
        title={query ? `Resultados para “${query}”` : "Explore os produtos"}
        description="Catálogo demonstrativo. Os resultados abaixo não são ofertas reais."
      />
      <SearchBox compact initial={query} />
      <div className="results-toolbar">
        <button
          className="button secondary filter-trigger"
          onClick={() => setPanel(!panel)}
          aria-expanded={panel}
        >
          <SlidersHorizontal size={17} />
          Filtros
        </button>
        <p>
          <b>{matches.length}</b>{" "}
          {matches.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
        <label className="select-label">
          Ordenar{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Relevância</option>
            <option value="price">Preço do produto</option>
          </select>
        </label>
      </div>
      <div className="results-layout">
        <aside className={`filters ${panel ? "expanded" : ""}`}>
          <h2>
            <SlidersHorizontal size={18} />
            Refinar busca
          </h2>
          <label>
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Preço máximo (R$)
            <input
              type="number"
              min="0"
              step="1"
              value={max}
              placeholder="Sem limite"
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
          <p className="filter-note">
            <Info size={16} />
            Preços de produto, sem incluir frete.
          </p>
          <button
            className="text-link"
            onClick={() => {
              setCategory("Todos");
              setMax("");
            }}
          >
            Limpar filtros
          </button>
          <hr />
          <label>
            Simular estado da busca
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              <option value="complete">Consulta concluída</option>
              <option value="loading">Consultando lojas</option>
              <option value="partial">Resultado parcial</option>
              <option value="empty">Nenhum resultado</option>
              <option value="error">Erro temporário</option>
              <option value="rate">Limite de consultas</option>
            </select>
          </label>
          <small>Controle de demonstração</small>
        </aside>
        <div className="result-content">
          {scenario === "partial" && (
            <div className="notice warning" role="status">
              <Info size={20} />
              <div>
                <b>Resultado parcial simulado</b>
                <p>
                  Uma fonte fictícia não respondeu. As demais continuam
                  disponíveis.
                </p>
              </div>
            </div>
          )}
          {scenario === "loading" ? (
            <Empty
              icon={<span className="spinner" />}
              title="Consultando fontes de demonstração"
              text="Este estado é uma simulação. Nenhuma loja está sendo consultada."
            >
              <button
                className="button secondary"
                onClick={() => setScenario("complete")}
              >
                Concluir simulação
              </button>
            </Empty>
          ) : scenario === "error" || scenario === "rate" ? (
            <Empty
              icon={<Info />}
              title={
                scenario === "rate"
                  ? "Limite de consultas atingido"
                  : "Uma fonte não respondeu"
              }
              text="Exemplo de mensagem de falha. Você pode repetir a simulação."
            >
              <button
                className="button primary"
                onClick={() => setScenario("complete")}
              >
                Tentar novamente
              </button>
            </Empty>
          ) : matches.length === 0 || scenario === "empty" ? (
            <Empty
              icon={<Search />}
              title="Nenhum produto encontrado"
              text="Experimente buscar por SSD, iPhone 15, Sony ou RTX 4060 Ti."
            >
              <Link className="button secondary" href="/busca">
                Explorar catálogo
              </Link>
              {scenario === "empty" && (
                <button
                  className="text-link"
                  onClick={() => setScenario("complete")}
                >
                  Encerrar simulação
                </button>
              )}
            </Empty>
          ) : (
            <div className="product-grid results-grid">
              {matches.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  saved={favorites.includes(p.id)}
                  toggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="empty-actions">{children}</div>
    </div>
  );
}
function ProductDetails({
  product: p,
  saved,
  toggleFavorite,
  notify,
}: {
  product: Product;
  saved: boolean;
  toggleFavorite: () => void;
  notify: (text: string) => void;
}) {
  const [sort, setSort] = useState("final");
  const [onlyExact, setOnlyExact] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const best = bestFinal(p.offers);
  const shown = sortedOffers(
    p.offers.filter((o) => !onlyExact || o.match === "exact"),
    sort,
  );
  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Explorar</Link>
        <ChevronRight size={14} />
        <span>{p.name}</span>
      </div>
      <section className="detail-top">
        <div className="detail-art">
          <ProductArt kind={p.kind} />
        </div>
        <div className="detail-info">
          <p className="eyebrow">
            {p.category.toUpperCase()} · EXEMPLO DE PRODUTO
          </p>
          <h1>{p.name}</h1>
          <div className="specs">
            {p.specs.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <p className="detail-description">
            Compare a mesma configuração, com condição e origem equivalentes.
          </p>
          <div className="detail-price-label">
            Menor custo final conhecido · demonstração
          </div>
          <div className="detail-price">{money(finalPrice(best)!)}</div>
          <p className="muted">
            {best.store} ·{" "}
            {best.shipping === 0
              ? "frete grátis no exemplo"
              : `frete de ${money(best.shipping!)}`}
          </p>
          <div className="detail-actions">
            <button
              className={`button ${saved ? "secondary" : "primary"}`}
              onClick={toggleFavorite}
            >
              <Heart size={17} fill={saved ? "currentColor" : "none"} />
              {saved ? "Salvo nos favoritos" : "Salvar nos favoritos"}
            </button>
            <button
              className="button secondary"
              onClick={() => dialog.current?.showModal()}
            >
              <Bell size={17} />
              Criar alerta
            </button>
          </div>
          <p className="card-source">
            <Clock3 size={13} />
            {sourceLabel}
          </p>
        </div>
      </section>
      <div className="notice">
        <ShieldCheck size={21} />
        <div>
          <b>Compare com contexto.</b>
          <p>
            Preços fictícios em BRL, à vista. Frete desconhecido não participa
            do menor custo final.
          </p>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TODAS AS CONDIÇÕES À VISTA</p>
            <h2>Compare as ofertas</h2>
          </div>
          <label className="select-label">
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="final">Custo final conhecido</option>
              <option value="product">Preço do produto</option>
            </select>
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={onlyExact}
            onChange={(e) => setOnlyExact(e.target.checked)}
          />
          Mostrar apenas correspondências exatas
        </label>
        <div className="offer-list">
          {shown.map((o) => (
            <article
              key={o.id}
              className={`offer ${o.id === best.id ? "best" : ""}`}
            >
              <div className="offer-store">
                <span className="store-avatar">{o.store.slice(-1)}</span>
                <div>
                  <h3>{o.store}</h3>
                  <p>{o.description}</p>
                  {o.id === best.id && (
                    <span className="badge green">
                      Menor custo conhecido · exemplo
                    </span>
                  )}
                  {o.match === "partial" && (
                    <span className="badge amber">
                      Correspondência parcial — confira as especificações
                    </span>
                  )}
                </div>
              </div>
              <div className="offer-values">
                <span>
                  Produto <b>{money(o.price)}</b>
                </span>
                <span>
                  {o.shipping === null
                    ? "Frete não informado"
                    : o.shipping === 0
                      ? "Frete grátis"
                      : `Frete: ${money(o.shipping)}`}
                </span>
                <strong>
                  {finalPrice(o) === null
                    ? "Custo final desconhecido"
                    : money(finalPrice(o)!)}
                </strong>
              </div>
              <p className="offer-source">{sourceLabel}</p>
              <button
                className="button secondary offer-cta"
                onClick={() =>
                  notify(
                    "Oferta fictícia: não existe link de compra nesta demonstração.",
                  )
                }
              >
                Sobre este exemplo <Info size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <PriceChart product={p} />
      <AlertDialog dialog={dialog} product={p} notify={notify} />
    </>
  );
}

function PriceChart({ product: p }: { product: Product }) {
  const [days, setDays] = useState(30);
  const series = historyInPeriod(p, days);
  const valid = series.filter(
    (r): r is { date: string; price: number } => r.price !== null,
  );
  const values = valid.map((r) => r.price);
  const low = Math.min(...values),
    high = Math.max(...values),
    avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const floor = low * 0.93,
    range = high * 1.03 - floor;
  const x = (i: number) => 55 + (i / Math.max(series.length - 1, 1)) * 815;
  const y = (v: number) => 190 - ((v - floor) / range) * 150;
  let path = "";
  series.forEach((r, i) => {
    if (r.price === null) return;
    path += `${i === 0 || series[i - 1].price === null ? "M" : "L"}${x(i)} ${y(r.price)} `;
  });
  return (
    <section className="history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">UMA COMPRA BEM INFORMADA</p>
          <h2>Histórico de preços</h2>
          <p className="muted">
            Preço do produto · série fictícia · sem frete ou cupom
          </p>
        </div>
        <span className="badge">
          <FlaskConical size={13} />
          Demonstração
        </span>
      </div>
      <div className="periods" aria-label="Período do histórico">
        {periods.map((t) => (
          <button
            key={t.label}
            aria-pressed={days === t.days}
            className={days === t.days ? "active" : ""}
            onClick={() => setDays(t.days)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="history-stats">
        <div>
          <span>Menor preço no período</span>
          <strong className="green-text">{money(low)}</strong>
        </div>
        <div>
          <span>Preço médio</span>
          <strong>{money(avg)}</strong>
        </div>
        <div>
          <span>Maior preço</span>
          <strong>{money(high)}</strong>
        </div>
        <div>
          <span>Último preço fictício</span>
          <strong>{money(p.price)}</strong>
        </div>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 920 240"
          role="img"
          aria-label={`Histórico fictício de ${p.name}. Mínimo ${money(low)}, máximo ${money(high)}, ${values.length} observações.`}
        >
          {[low, Math.round((high + low) / 2), high].map((v, i) => (
            <g key={i}>
              <line
                x1="55"
                x2="870"
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
                strokeDasharray="4 5"
              />
              <text x="0" y={y(v) - 8} fontSize="13" fill="var(--muted)">
                {Math.round(v / 100).toLocaleString("pt-BR")}
              </text>
            </g>
          ))}
          <path
            d={path}
            stroke="var(--green-bright)"
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
          />
          {series.map((r, i) =>
            r.price !== null ? (
              <circle
                key={r.date}
                cx={x(i)}
                cy={y(r.price)}
                r="4"
                fill="var(--surface)"
                stroke="var(--green-bright)"
                strokeWidth="2"
              >
                <title>{`${r.date}: ${money(r.price)}`}</title>
              </circle>
            ) : (
              <g key={r.date}>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1="30"
                  y2="195"
                  stroke="var(--muted)"
                  strokeDasharray="2 5"
                />
                <text
                  x={x(i)}
                  y="20"
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="13"
                >
                  Sem coleta
                </text>
              </g>
            ),
          )}
          {series
            .filter(
              (_, i) =>
                i === 0 ||
                i === series.length - 1 ||
                i === Math.floor(series.length / 2),
            )
            .map((r) => (
              <text
                key={r.date}
                x={x(series.indexOf(r))}
                y="228"
                textAnchor="middle"
                fontSize="14"
                fill="var(--muted)"
              >
                {r.date.slice(8)}/{r.date.slice(5, 7)}
              </text>
            ))}
        </svg>
      </div>
      <div className="chart-caption">
        <span>
          <span className="legend-dot" />
          Preço do produto
        </span>
        <span>{values.length} registros fictícios · até 09/09/2026</span>
      </div>
      <div className="history-foot">
        <Info size={17} />
        <p>
          {values.length < 3
            ? "Histórico insuficiente."
            : values.length < 10
              ? "Tendência inicial no exemplo."
              : "Análise demonstrativa: não use esta série para decidir uma compra."}{" "}
          A coleta real começará após a integração autorizada. Períodos maiores
          exibem somente os dados disponíveis.
        </p>
      </div>
      <details className="history-table">
        <summary>
          Ver datas e valores acessíveis <ChevronDown size={15} />
        </summary>
        <table>
          <caption>Observações fictícias — preço do produto, sem frete</caption>
          <thead>
            <tr>
              <th>Data</th>
              <th>Preço</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {series.map((r) => (
              <tr key={r.date}>
                <td>{r.date.split("-").reverse().join("/")}</td>
                <td>{r.price === null ? "Sem coleta" : money(r.price)}</td>
                <td>Exemplo local</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
function HistoryPage() {
  const [id, setId] = useState("gpu");
  return (
    <>
      <PageIntro
        eyebrow="ACOMPANHE COM CONTEXTO"
        title="O preço ao longo do tempo"
        description="Conheça o gráfico com dados fictícios. Nenhum preço real foi coletado."
      />
      <label className="product-select">
        Produto acompanhado
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.specs[0]}
            </option>
          ))}
        </select>
      </label>
      <PriceChart product={products.find((p) => p.id === id)!} />
    </>
  );
}

function Coupons({ notify }: { notify: (text: string) => void }) {
  const [expired, setExpired] = useState(false);
  const [store, setStore] = useState("all");
  const couponList = [
    {
      code: "DEMO10",
      store: "Loja demonstração A",
      title: "10% de desconto ilustrativo",
      rules:
        "Somente SSD Kingston NV2 1 TB. Compra mínima fictícia de R$ 300. Limite de R$ 40. Não cumulativo.",
      expired: false,
    },
    {
      code: "DEMOFRETE",
      store: "Loja demonstração B",
      title: "Frete grátis ilustrativo",
      rules:
        "Exemplo para produtos selecionados. A elegibilidade dependeria do CEP.",
      expired: false,
    },
    {
      code: "DEMOEXPIRADO",
      store: "Loja demonstração A",
      title: "Exemplo de cupom expirado",
      rules: "Este código nunca deve ser apresentado como disponível.",
      expired: true,
    },
  ];
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      notify("Código de demonstração copiado. Ele não é válido em lojas.");
    } catch {
      notify(
        `Não foi possível copiar automaticamente. Código fictício: ${code}`,
      );
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="DESCONTOS COM REGRAS CLARAS"
        title="Cupons, sem letras miúdas"
        description="Estes códigos são apenas exemplos e não funcionam em nenhuma loja."
      />
      <div className="notice warning">
        <Tag size={20} />
        <p>
          Na versão real, cada cupom terá fonte oficial e última verificação.
          Confirme o cupom no carrinho antes de finalizar.
        </p>
      </div>
      <div className="results-toolbar">
        <label className="check-label">
          <input
            type="checkbox"
            checked={expired}
            onChange={(e) => setExpired(e.target.checked)}
          />
          Mostrar exemplos expirados
        </label>
        <label className="select-label">
          Loja
          <select value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="all">Todas as lojas fictícias</option>
            <option>Loja demonstração A</option>
            <option>Loja demonstração B</option>
          </select>
        </label>
      </div>
      <div className="coupon-grid">
        {couponList
          .filter(
            (c) =>
              (expired || !c.expired) && (store === "all" || c.store === store),
          )
          .map((c) => (
            <article
              className={`coupon-card ${c.expired ? "expired" : ""}`}
              key={c.code}
            >
              <div className="coupon-top">
                <span className="round-icon pale">
                  <Tag size={22} />
                </span>
                <span className={`badge ${c.expired ? "amber" : "green"}`}>
                  {c.expired
                    ? "Expirado · exemplo"
                    : "Fictício · sem validade comercial"}
                </span>
              </div>
              <p className="eyebrow">{c.store}</p>
              <h2>{c.title}</h2>
              <p>{c.rules}</p>
              <div className="coupon-code">
                <code>{c.code}</code>
                <button
                  className="icon-button"
                  disabled={c.expired}
                  aria-label={`Copiar ${c.code}`}
                  onClick={() => copy(c.code)}
                >
                  <Copy size={19} />
                </button>
              </div>
              <div className="coupon-meta">
                <span>
                  Validade ilustrativa:{" "}
                  {c.expired ? "01/09/2026" : "30/09/2026"}
                </span>
                <span>Origem: catálogo demonstrativo local</span>
                <span>Verificação fictícia: 10/09/2026, 09:00 BRT</span>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
function AlertDialog({
  dialog,
  product,
  notify,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  product: Product;
  notify: (t: string) => void;
}) {
  const [storedAlerts] = useStorage("oferta-alerts");
  let initialTarget = "";
  try {
    const value = JSON.parse(storedAlerts ?? "{}");
    const cents = value?.[product.id];
    if (typeof cents === "number" && Number.isFinite(cents) && cents > 0)
      initialTarget = String(cents / 100);
  } catch {}
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(new FormData(e.currentTarget).get("target"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    let alerts: Record<string, number> = {};
    try {
      const parsed: unknown = JSON.parse(readStorage("oferta-alerts") ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        alerts = Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === "number" && Number.isFinite(entry[1]),
          ),
        );
      localStorage.setItem(
        "oferta-alerts",
        JSON.stringify({ ...alerts, [product.id]: Math.round(amount * 100) }),
      );
      window.dispatchEvent(new Event(storageEvent));
      dialog.current?.close();
      notify(
        "Preço-alvo de demonstração salvo neste navegador. Nenhuma notificação será enviada.",
      );
    } catch {
      notify("Não foi possível salvar o preço-alvo neste navegador.");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="alert-dialog"
      aria-labelledby={`alert-title-${product.id}`}
    >
      <div className="dialog-top">
        <span className="round-icon pale">
          <Bell size={23} />
        </span>
        <button
          className="icon-button"
          aria-label="Fechar alerta"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
      </div>
      <h2 id={`alert-title-${product.id}`}>Qual seria o preço ideal?</h2>
      <p>
        {product.name} · {product.specs[0]}
      </p>
      <form onSubmit={save}>
        <label>
          Preço-alvo do produto (R$)
          <input
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            key={initialTarget}
            name="target"
            defaultValue={initialTarget}
            placeholder="Ex.: 2500,00"
          />
        </label>
        <p className="dialog-note">
          Simulação local, sem frete. Este alvo não monitora lojas e não envia
          notificações.
        </p>
        <button className="button primary" type="submit">
          <Bell size={17} />
          Salvar preço-alvo fictício
        </button>
      </form>
    </dialog>
  );
}
function FavoriteRow({
  product: p,
  remove,
  notify,
}: {
  product: Product;
  remove: () => void;
  notify: (s: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [alerts] = useStorage("oferta-alerts");
  let target: number | undefined;
  try {
    const v = JSON.parse(alerts ?? "{}");
    if (v && typeof v[p.id] === "number" && Number.isFinite(v[p.id]))
      target = v[p.id];
  } catch {}
  return (
    <article className="favorite-row">
      <Link className="favorite-art" href={`/produto/${p.id}`}>
        <ProductArt kind={p.kind} />
      </Link>
      <div className="favorite-info">
        <span className="eyebrow">{p.brand}</span>
        <h2>
          <Link href={`/produto/${p.id}`}>{p.name}</Link>
        </h2>
        <p>{p.specs.join(" · ")}</p>
        <small>{sourceLabel}</small>
      </div>
      <div>
        <span className="price-label">Preço ilustrativo</span>
        <strong className="favorite-price">{money(p.price)}</strong>
        <span className="target-note">
          {target ? `Alvo fictício: ${money(target)}` : "Nenhum preço-alvo"}
        </span>
      </div>
      <div className="favorite-actions">
        <button
          className="button secondary"
          onClick={() => dialog.current?.showModal()}
        >
          <Bell size={16} />
          {target ? "Editar alvo" : "Definir alvo"}
        </button>
        <button
          className="icon-button"
          onClick={remove}
          aria-label={`Remover ${p.name} dos favoritos`}
        >
          <Heart size={20} fill="currentColor" />
        </button>
      </div>
      <AlertDialog dialog={dialog} product={p} notify={notify} />
    </article>
  );
}
function Favorites({
  favorites,
  toggleFavorite,
  notify,
}: {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  notify: (s: string) => void;
}) {
  return (
    <>
      <PageIntro
        eyebrow="SUA LISTA, NO SEU TEMPO"
        title="Deixe a boa compra no radar"
        description="Favoritos e preços-alvo ficam salvos somente neste navegador."
      />
      <div className="notice">
        <Info size={19} />
        <p>
          Modo demonstração: não há monitoramento, sincronização entre aparelhos
          ou envio de alertas.
        </p>
      </div>
      {favorites.length === 0 ? (
        <Empty
          icon={<Heart size={30} />}
          title="Sua próxima compra começa aqui"
          text="Toque no coração de um produto para acompanhar os exemplos que mais interessam."
        >
          <Link className="button primary" href="/busca">
            Explorar produtos <ArrowRight size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="favorite-list">
          {products
            .filter((p) => favorites.includes(p.id))
            .map((p) => (
              <FavoriteRow
                key={p.id}
                product={p}
                remove={() => toggleFavorite(p.id)}
                notify={notify}
              />
            ))}
        </div>
      )}
    </>
  );
}
function Admin() {
  const [filter, setFilter] = useState("");
  return (
    <>
      <PageIntro
        eyebrow="TRANSPARÊNCIA DAS FONTES"
        title="Tudo começa com dados confiáveis"
        description="Painel visual de administração. Ainda não há autenticação, credenciais ou operações reais."
      />
      <div className="admin-stats">
        <div>
          <span className="round-icon pale">
            <ShieldCheck />
          </span>
          <strong>0</strong>
          <span>Fontes conectadas</span>
        </div>
        <div>
          <span className="round-icon pale">
            <History />
          </span>
          <strong>0</strong>
          <span>Coletas reais</span>
        </div>
        <div>
          <span className="round-icon pale">
            <FlaskConical />
          </span>
          <strong>4</strong>
          <span>Produtos demonstrativos</span>
        </div>
      </div>
      <div className="notice warning">
        <Info size={21} />
        <div>
          <b>Conectores desativados por padrão</b>
          <p>
            Uma loja só será ativada após validar acesso autorizado, regras de
            uso, armazenamento de histórico e testes reais.
          </p>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INTEGRAÇÕES PLANEJADAS</p>
            <h2>Fontes consideradas</h2>
          </div>
          <label className="admin-search">
            <Search size={17} />
            <input
              aria-label="Filtrar fontes"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por nome"
            />
          </label>
        </div>
        <div className="store-list">
          {stores
            .filter((s) => s.toLowerCase().includes(filter.toLowerCase()))
            .map((s) => (
              <article className="store-row" key={s}>
                <span className="store-avatar">{s[0]}</span>
                <div>
                  <h3>{s}</h3>
                  <p>
                    {s === "Amazon Brasil"
                      ? "Depende de elegibilidade e autorização para histórico e alertas"
                      : s === "Mercado Livre"
                        ? "API documentada; acesso e licença de uso ainda não validados"
                        : "Fonte autorizada ainda não validada"}
                  </p>
                </div>
                <span className="badge">Desativada</span>
              </article>
            ))}
        </div>
        {!stores.some((s) =>
          s.toLowerCase().includes(filter.toLowerCase()),
        ) && (
          <Empty
            icon={<Search />}
            title="Nenhuma fonte com esse nome"
            text="Tente outro nome de loja."
          />
        )}
      </section>
      <div className="admin-bottom">
        <section>
          <h2>Cupons e revisões</h2>
          <p>
            Cadastro real, revisão de produtos ambíguos e ofertas suspeitas
            serão implementados após o banco e as permissões de administrador.
          </p>
          <Link className="text-link" href="/cupons">
            Ver exemplos de cupons <ArrowRight size={16} />
          </Link>
        </section>
        <section>
          <h2>Histórico de operações</h2>
          <p>
            Nenhuma sincronização executada. Sem logs de API, tokens ou dados de
            usuários nesta prévia.
          </p>
          <span className="badge">Aguardando integração</span>
        </section>
      </div>
    </>
  );
}
