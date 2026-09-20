> DOCUMENTO HISTÓRICO. As declarações de estado abaixo se referem à fase/data original. Para o estado mais recente, leia ../../CONTEXTO-COMPLETO.md.

# Entrega da Fase 1 — Oferta Certa

Data: 10/09/2026. Escopo: interface demonstrativa, sem backend de ofertas ou integrações comerciais.

## Implementado

- Início, busca, detalhes de quatro produtos, histórico, cupons, favoritos e administração informativa.
- Identidade visual em verde, fontes locais servidas pelo Next.js, temas claro e escuro e ilustrações SVG identificadas.
- Busca por termos e atributos do catálogo fictício, categorias, teto de preço e ordenação.
- Comparação que separa preço do produto e custo final; frete desconhecido não é zero; anúncio de 8 GB não vence a comparação de 16 GB.
- Gráfico fictício com seis opções de período, mínimo, média, máximo, última observação e lacuna sem interpolação. Tabela acessível com datas e valores.
- Cupons de exemplo copiáveis; expirados ocultos inicialmente e com cópia desabilitada.
- Favoritos, alvos, tema e buscas recentes persistidos apenas no navegador. Alvos podem ser editados e não enviam notificações.
- Menu móvel, foco visível, diálogo nativo com Escape, link de salto para conteúdo e redução de movimento.
- Estados demonstrativos de carregamento, vazio, falha, resultado parcial e limite, todos com saída clara.
- Fontes reais listadas como desativadas. Nenhum segredo, operação administrativa real ou link fictício de compra.
- Manifesto, ícones PWA e fallback offline de produção; nenhuma oferta é guardada pelo service worker.
- Comandos reproduzíveis, dependências fixadas, lockfile, testes e documentação.

## Validação final

| Verificação | Resultado |
|---|---|
| ESLint | Aprovado, sem erros ou avisos |
| TypeScript | Aprovado |
| Testes unitários | 6 aprovados |
| Build de produção | Aprovado |
| Playwright em produção, Chrome | 11 aprovados em 10,3 segundos |
| Larguras | 375, 390, 768, 1024 e 1280 px, sete telas sem rolagem horizontal |
| Inspeção visual | Início desktop e celular; comparação; tema escuro |
| Persistência | Favoritos após recarga e preço-alvo verificados |
| Cupons | Clipboard, aviso de código fictício e expiração verificados |
| URLs e recursos online | Nenhuma resposta HTTP de erro na verificação final das sete telas |
| Console online | Nenhum erro de execução encontrado na verificação final |
| PWA | Manifesto e ícones válidos; service worker ativo; fallback offline exibido |

O teste offline provocou deliberadamente uma mensagem `ERR_INTERNET_DISCONNECTED`, preservada no relatório JSON. Ela não é um erro observado durante navegação online.

Foi corrigida uma divergência de hidratação no título SVG do gráfico e repetida a suíte. Também foi ajustado o teste para usar o nome acessível do seletor de categoria. O runner agent-browser não respondeu neste ambiente; a verificação foi concluída com Playwright e Chrome local.

## Medição local de desempenho

Na navegação de produção medida: resposta inicial de 19 ms, DOM pronto em 57 ms, carregamento em 199 ms e aproximadamente 237 kB de recursos transferidos. Não houve recursos de terceiros no navegador. Esses números são uma observação em localhost, sem simulação de rede móvel, e não constituem benchmark de hospedagem pública ou auditoria Lighthouse.

Dados brutos: `verificacao-producao.json`.

## Limites desta entrega

- Todos os preços, séries, lojas de oferta e cupons são demonstrações. Não representam preços vigentes ou lojas conectadas.
- A busca cobre apenas quatro produtos de exemplo. Pesquisas como iPhone 17 retornarão vazio nesta fase.
- O histórico não é gravado em banco. A série é um fixture fixo para testar a interface.
- Não há login, controle administrativo real, servidor de comparação, consulta por CEP ou alerta externo.
- Não houve publicação ou instalação em dispositivo físico. O teste móvel foi feito em viewports de navegador.
- A prévia é acessível apenas neste computador. O README explica como iniciá-la novamente.
- O administrador visual não permite ativar fontes ou cadastrar credenciais.

## Próxima fase

Banco, migrações, identidade de produto, API interna e permissões. Somente depois, validar e implementar um conector autorizado com coleta e histórico reais. A aplicação completa ainda não atende ao critério de aceitação de fonte real; a Fase 1 visual está entregue.
