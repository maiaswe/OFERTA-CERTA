import { test, expect } from "@playwright/test";
import path from "node:path";

test("painel completo usa banco isolado: acesso, produto, preço, favorito, histórico, alerta e exportação", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Never put browser fixtures in the real cloud database.
  const status = await (await request.get("/api/manage?action=status")).json();
  expect(status.storage).toBe("local");
  expect(status.setupRequired).toBe(true);
  await page.goto("/painel");
  await expect(
    page.getByRole("heading", { name: "Crie seu acesso" }),
  ).toBeVisible();
  await page.getByLabel("Usuário", { exact: true }).fill("usuario_teste");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("senha-temporaria-so-para-teste");
  await page.getByRole("button", { name: "Criar conta e começar" }).click();
  await expect(page.getByText("Banco local conectado")).toBeVisible();
  await page.getByRole("button", { name: "Novo produto", exact: true }).click();
  await page
    .getByLabel("Nome do produto", { exact: true })
    .fill("SSD Samsung 990 PRO 2 TB — teste");
  await page.getByLabel("Marca", { exact: true }).fill("Samsung");
  await page
    .getByLabel("Modelo / variante", { exact: true })
    .fill("990 PRO 2TB");
  await page.getByLabel("Garantia", { exact: true }).fill("12 meses");
  await page
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "SSD Samsung 990 PRO 2 TB — teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar favorito" }).click();
  await page.getByLabel("Preço-alvo (R$)", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Salvar alerta", exact: true })
    .click();
  await expect(page.getByText("Alerta salvo.", { exact: false })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Loja", exact: true })
    .selectOption("kabum");
  await page
    .getByLabel("Link do produto na loja", { exact: true })
    .fill("https://www.kabum.com.br/produto/teste");
  await page.getByLabel("Vendedor", { exact: true }).fill("Loja de teste");
  await page.getByLabel("Produto (R$)", { exact: true }).fill("950");
  await page.getByLabel("Frete (R$)", { exact: true }).fill("20");
  await page
    .getByLabel("Destino / condição do frete", { exact: true })
    .fill("São Paulo/SP");
  await page.getByLabel("Conferi modelo, variante", { exact: false }).check();
  await page
    .getByRole("button", { name: "Salvar no histórico", exact: true })
    .click();
  await expect(
    page.getByText("Preço registrado.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator(".live-offer-price").getByText("R$ 970,00", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Histórico insuficiente", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Banco local conectado")).toBeVisible();
  await page.getByRole("link", { name: "Favoritos", exact: true }).click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "SSD Samsung 990 PRO 2 TB — teste",
      }),
    })
    .click();
  await expect(
    page.locator(".live-offer-price").getByText("R$ 970,00", { exact: true }),
  ).toBeVisible();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: path.resolve("../oferta-certa-painel-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: path.resolve("../oferta-certa-painel-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Cupons", exact: true }).click();
  await page.getByRole("button", { name: "Cadastrar cupom" }).click();
  await page
    .getByRole("combobox", { name: "Loja", exact: true })
    .selectOption("kabum");
  await page
    .getByRole("textbox", { name: "Código", exact: true })
    .fill("TESTE50");
  await page.getByRole("spinbutton", { name: "Desconto (R$ ou %)" }).fill("50");
  await page.locator('input[name="until"]').fill("2027-10-01T23:59");
  await page
    .getByRole("textbox", { name: "Link da fonte na loja" })
    .fill("https://www.kabum.com.br/cupons");
  await page
    .getByRole("textbox", { name: "Regras e restrições" })
    .fill("Cupom fictício de teste.");
  await page.getByRole("button", { name: "Salvar cupom", exact: true }).click();
  await expect(page.getByText("TESTE50", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(page.getByText("Desativado", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Integrações", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Conectar Mercado Livre", exact: true }),
  ).toBeDisabled();
  const exported = await (
    await page.request.get("/api/manage?action=export")
  ).json();
  expect(exported.price_history).toHaveLength(1);
  expect(exported.coupons).toHaveLength(1);
  expect(exported.admin_users).toBeUndefined();
  expect(exported.oauth_connections).toBeUndefined();
  await page
    .getByRole("link", { name: "Publicar ofertas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar oferta", exact: true })
    .click();
  await page
    .getByLabel("Nome do produto", { exact: true })
    .fill("iPhone 15 — teste isolado");
  await page.getByLabel("Variante exata", { exact: false }).fill("128 GB azul");
  await page.getByLabel("Preço atual (R$)", { exact: true }).fill("3790,00");
  await page
    .getByLabel("Link completo do anúncio")
    .fill("https://produto.mercadolivre.com.br/MLB-123456-teste-_JM");
  const affiliateUrl =
    "https://www.mercadolivre.com.br/sec/teste?matt_tool=123&utm_source=site";
  await page.getByLabel("Conferi agora", { exact: false }).check();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByText("RASCUNHO", { exact: true })).toBeVisible();
  const publicContext = await page
    .context()
    .browser()!
    .newContext({ baseURL: "http://127.0.0.1:4318" });
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/");
  await expect(publicPage).toHaveURL(/\/ofertas$/);
  await expect(
    publicPage.getByText("Estamos preparando as primeiras ofertas."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar e revisar" }).click();
  await page.getByLabel("Conferi agora", { exact: false }).check();
  await page
    .getByRole("button", { name: "Publicar por 24 horas", exact: true })
    .click();
  await expect(page.getByText("PUBLICADA", { exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).toHaveAttribute(
    "href",
    "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM",
  );
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).not.toHaveAttribute("rel", /sponsored/);
  await expect(publicPage.getByText(/Publicidade:/)).toHaveCount(0);
  await publicPage
    .getByRole("searchbox", { name: "O que você procura?" })
    .fill("iphone 128 azul");
  await publicPage.getByLabel("Condição", { exact: true }).selectOption("new");
  await publicPage.getByLabel("Preço máximo (R$)").fill("4000");
  await publicPage.getByLabel("Ordenar por").selectOption("price_asc");
  await publicPage.getByRole("button", { name: "Buscar ofertas" }).click();
  await expect(publicPage.getByRole("status")).toContainText(
    "1 oferta encontrada",
  );
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).toHaveAttribute(
    "href",
    "https://produto.mercadolivre.com.br/MLB-123456-teste-_JM",
  );
  await publicPage.getByLabel("Preço máximo (R$)").fill("3000");
  await publicPage.getByRole("button", { name: "Buscar ofertas" }).click();
  await expect(
    publicPage.getByText("Nenhuma oferta encontrada com esses filtros."),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).toHaveCount(0);
  await publicPage.getByRole("link", { name: "Limpar filtros" }).click();
  await expect(publicPage.getByRole("status")).toContainText(
    "1 oferta encontrada",
  );
  await page.getByRole("button", { name: "Editar e revisar" }).click();
  await page
    .getByText("Adicionar link de afiliado (opcional)", { exact: true })
    .click();
  await page.getByLabel("Seu link de afiliado (opcional)").fill(affiliateUrl);
  await page.getByLabel("Conferi agora", { exact: false }).check();
  await page
    .getByRole("button", { name: "Publicar por 24 horas", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisar oferta", exact: true }),
  ).toHaveCount(0);
  await publicPage.reload();
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).toHaveAttribute("href", affiliateUrl);
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Mercado Livre" }),
  ).toHaveAttribute("rel", /sponsored/);
  await expect(publicPage.getByText(/Publicidade:/)).toBeVisible();
  await expect(
    publicPage.getByText("R$ 3.790,00", { exact: true }),
  ).toBeVisible();
  for (const width of [1280, 390]) {
    await publicPage.setViewportSize({ width, height: 900 });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await publicPage.screenshot({
    path: path.resolve("../oferta-certa-vitrine-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Retirar da vitrine" }).click();
  await expect(page.getByText("RASCUNHO", { exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByText("Estamos preparando as primeiras ofertas."),
  ).toBeVisible();
  for (const store of ["magalu", "amazon"]) {
    await page.getByRole("button", { name: "Adicionar oferta" }).click();
    await page.getByLabel("Loja", { exact: true }).selectOption(store);
    await page
      .getByLabel("Nome do produto", { exact: true })
      .fill(`Produto ${store} — teste isolado`);
    await page
      .getByLabel("Variante exata", { exact: false })
      .fill("Modelo azul 128 GB");
    await page
      .getByLabel("Link completo do anúncio", { exact: true })
      .fill(
        store === "amazon"
          ? "https://www.amazon.com.br/dp/B012345678"
          : "https://www.magazineluiza.com.br/produto/p/123456/",
      );
    if (store === "magalu")
      await page.getByLabel("Preço atual (R$)", { exact: true }).fill("123.45");
    else
      await expect(
        page.getByLabel("Preço atual (R$)", { exact: true }),
      ).toHaveCount(0);
    await page
      .getByText("Adicionar link de afiliado (opcional)", { exact: true })
      .click();
    await page
      .getByLabel("Seu link de afiliado (opcional)", { exact: true })
      .fill(
        store === "amazon"
          ? "https://amzn.to/teste?tag=teste-20"
          : "https://www.magazinevoce.com.br/magazineteste/produto/p/123456/?partner_id=123",
      );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Publicar por 24 horas" }).click();
    await expect(
      page.getByRole("heading", { name: "Preparar oferta", exact: true }),
    ).toHaveCount(0);
  }
  await publicPage.goto("/ofertas");
  await expect(
    publicPage.getByText("R$ 123,45", { exact: true }),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("link", { name: "Consultar preço na Amazon" }),
  ).toHaveAttribute("href", "https://amzn.to/teste?tag=teste-20");
  await expect(
    publicPage.getByText(
      "Como associado da Amazon, eu recebo por compras qualificadas.",
    ),
  ).toBeVisible();
  await publicPage.getByLabel("Loja", { exact: true }).selectOption("magalu");
  await publicPage.getByRole("button", { name: "Buscar ofertas" }).click();
  await expect(
    publicPage.getByRole("link", { name: "Consultar preço na Amazon" }),
  ).toHaveCount(0);
  await expect(
    publicPage.getByRole("link", { name: "Ver oferta no Magazine Luiza" }),
  ).toBeVisible();
  await publicPage.goto("/ofertas?sort=price_desc");
  expect(await publicPage.locator("article h2").allTextContents()).toEqual([
    "Produto magalu — teste isolado",
    "Produto amazon — teste isolado",
  ]);
  for (const width of [1280, 390]) {
    await publicPage.setViewportSize({ width, height: 900 });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await publicPage.screenshot({
    path: path.resolve("../oferta-certa-multilojas-mobile.png"),
    fullPage: true,
  });
  await publicContext.close();
  await page
    .getByRole("link", { name: "Buscar no Mercado Livre", exact: true })
    .click();
  await page.route("**/api/integrations?action=search*", (route) =>
    route.fulfill({
      json: {
        products: [],
        offers: [],
        unavailable: [
          {
            id: "MLB123456",
            catalogId: "MLB27172667",
            title: "iPhone 15 — retorno parcial",
            image: null,
            price: 379000,
            reason: "MELI_PERMISSION",
          },
        ],
        warnings: ["O Mercado Livre negou acesso aos detalhes (403)."],
        total: 1,
        limit: 6,
        offset: 0,
        collectedAt: new Date().toISOString(),
        coverage: "Resposta simulada no banco de teste",
        cache: "miss",
        requestId: "test",
      },
    }),
  );
  await page
    .getByRole("textbox", { name: "Buscar no Mercado Livre", exact: true })
    .fill("iPhone 15");
  await page
    .getByRole("button", { name: "Buscar no Mercado Livre", exact: true })
    .click();
  await expect(
    page.getByText("Link oficial indisponível", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("R$ 3.790,00", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver anúncio na loja" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: path.resolve("../oferta-certa-busca-parcial.png"),
    fullPage: true,
  });
  await expect(
    page.getByText("Preço de listagem — confirme no Mercado Livre", {
      exact: true,
    }),
  ).toBeVisible();
  await page.route("**/api/integrations?action=status", (route) =>
    route.fulfill({
      json: {
        configurationError: null,
        redirectUri: "https://example.test/callback",
        historyEnabled: false,
        events: [],
        connection: {
          status: "connected",
          provider_user_id: "123",
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        },
      },
    }),
  );
  await page.route("**/api/integrations?action=diagnostic", (route) =>
    route.fulfill({
      json: {
        appId: "test",
        checks: [{ status: 403, requestId: "test-request" }],
      },
    }),
  );
  await page.goto("/painel/integracoes");
  await page
    .getByText("Configuração e registros da integração", { exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar diagnóstico para suporte" })
    .click();
  const diagnosticDownload = await downloadPromise;
  expect(diagnosticDownload.suggestedFilename()).toBe(
    "diagnostico-mercadolivre.json",
  );
  await expect(page.getByText(/Relatório baixado/)).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeVisible();
  await page.getByLabel("Usuário", { exact: true }).fill("usuario_teste");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("senha-temporaria-so-para-teste");
  await page.getByRole("button", { name: "Entrar no meu painel" }).click();
  await expect(page.getByText("Banco local conectado")).toBeVisible();
  expect(errors).toEqual([]);
});
