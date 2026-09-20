import { test, expect } from "@playwright/test";

test("busca, filtros, variantes e histórico", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demonstracao");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "preço real",
  );
  await page
    .getByRole("textbox", { name: "Pesquisar produto" })
    .fill("RTX 4060 Ti 16 GB");
  await page.getByRole("button", { name: "Buscar ofertas" }).click();
  await expect(page).toHaveURL(/busca\?q=/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Comparar 3 ofertas fictícias" })
    .click();
  await expect(page.locator(".offer")).toHaveCount(3);
  await expect(
    page.getByText("Frete não informado", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mostrar apenas correspondências exatas").uncheck();
  await expect(page.locator(".offer")).toHaveCount(4);
  await expect(
    page.getByText("Correspondência parcial — confira as especificações"),
  ).toBeVisible();
  await page.getByRole("button", { name: "7 dias", exact: true }).click();
  await expect(
    page.getByText("4 registros fictícios", { exact: false }),
  ).toBeVisible();
  await page.getByText("Ver datas e valores acessíveis").click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "30 dias", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Sem coleta" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("favorito e alvo persistem; dialog respeita Escape", async ({ page }) => {
  await page.goto("/demonstracao/produto/ssd");
  await page.getByRole("button", { name: "Salvar nos favoritos" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salvo nos favoritos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Criar alerta", exact: true }).click();
  await page.getByLabel("Preço-alvo do produto (R$)").fill("300");
  await page
    .getByRole("button", { name: "Salvar preço-alvo fictício" })
    .click();
  await page.goto("/demonstracao/favoritos");
  await expect(page.getByText("Alvo fictício: R$ 300,00")).toBeVisible();
  await page.getByRole("button", { name: "Editar alvo" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Remover SSD Kingston NV2 dos favoritos" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sua próxima compra começa aqui" }),
  ).toBeVisible();
});
test("cupons são explicitamente fictícios, copiáveis e expirados ficam ocultos", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/demonstracao/cupons");
  await expect(
    page.getByText("DEMOEXPIRADO", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Copiar DEMO10", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "DEMO10",
  );
  await expect(page.getByRole("status")).toContainText("não é válido");
  await page.getByLabel("Mostrar exemplos expirados").check();
  await expect(page.getByText("DEMOEXPIRADO", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copiar DEMOEXPIRADO" }),
  ).toBeDisabled();
});
test("estados vazio, parcial, carregamento, falha e limite têm saída", async ({
  page,
}) => {
  await page.goto("/demonstracao/busca?q=xyz");
  await expect(
    page.getByRole("heading", { name: "Nenhum produto encontrado" }),
  ).toBeVisible();
  await page.goto("/demonstracao/busca");
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("Áudio");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByLabel("Preço máximo (R$)").fill("100");
  await expect(
    page.getByRole("heading", { name: "Nenhum produto encontrado" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  const scenario = page.getByRole("combobox", {
    name: "Simular estado da busca",
    exact: true,
  });
  await scenario.selectOption("partial");
  await expect(page.getByText("Resultado parcial simulado")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(4);
  await scenario.selectOption("loading");
  await expect(
    page.getByRole("heading", { name: "Consultando fontes de demonstração" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Concluir simulação" }).click();
  await scenario.selectOption("error");
  await expect(
    page.getByRole("heading", { name: "Uma fonte não respondeu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await scenario.selectOption("rate");
  await expect(
    page.getByRole("heading", { name: "Limite de consultas atingido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".product-card")).toHaveCount(4);
});
test("temas, navegação móvel e fontes desativadas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demonstracao");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation", { name: "Navegação móvel" })
    .getByRole("link", { name: "Administração" })
    .click();
  await expect(page.locator(".store-row")).toHaveCount(12);
  await expect(page.locator(".store-row .badge").first()).toHaveText(
    "Desativada",
  );
  await page.getByRole("textbox", { name: "Filtrar fontes" }).fill("Amazon");
  await expect(page.locator(".store-row")).toHaveCount(1);
});
for (const width of [375, 390, 768, 1024, 1280])
  test(`todas as telas sem overflow a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of [
      "/",
      "/busca",
      "/produto/gpu",
      "/historico",
      "/cupons",
      "/favoritos",
      "/admin",
    ]) {
      await page.goto(`/demonstracao${path === "/" ? "" : path}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        path,
      ).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });
test("URL inexistente retorna página apropriada", async ({ page }) => {
  await page.goto("/inexistente");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
