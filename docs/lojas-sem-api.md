# Lojas sem API — 17/09/2026

## Disponível agora

| Loja | Cadastro | Exibição pública |
|---|---|---|
| Mercado Livre | Produto, variante, preço conferido e link oficial | Preço manual e botão para a loja; busca automática continua limitada pelos 403 |
| Magazine Luiza | Produto, variante, preço conferido e link oficial | Preço manual, identificação da loja e botão para o anúncio |
| Amazon | Descrição própria do produto, variante e link oficial | Botão “Consultar preço na Amazon”, sem preço, frete ou imagem copiados da loja |

Nenhum desses novos cadastros exige chave de API. Os links de afiliado são opcionais: cole o link gerado pelo programa oficial após aprovação. O sistema preserva seus parâmetros e não cria uma atribuição de comissão por conta própria. A seleção pública busca apenas produtos revisados no painel, não todo o estoque das lojas.

## Publicar

1. Entre em `/painel/afiliados` e clique em **Adicionar oferta**.
2. Escolha a loja, escreva o nome e a variante exata e informe o link completo do produto.
3. Para Magazine Luiza ou Mercado Livre, confira e preencha o preço. Informe condições de pagamento ou restrições relevantes na descrição/variante; não compare preços de variantes diferentes.
4. Se já tiver o link de afiliado oficial, abra a seção correspondente e cole o endereço completo. Sem ele, o botão abre o endereço normal.
5. Confirme a revisão e publique. A publicação vence após 24 horas; uma nova revisão é necessária para mantê-la visível.

Em `/ofertas`, o visitante pode filtrar por loja, produto, condição e preço. Produtos sem preço cadastrado são excluídos quando há filtro de faixa de preço e ficam ao final de ambas as ordenações por preço. Nunca são tratados como R$ 0,00. A ausência de produtos cadastrados é exibida como vitrine vazia.

## Por que Amazon usa consulta na loja

As políticas oficiais de Associados restringem a apresentação de preço/disponibilidade a dados fornecidos pelos mecanismos autorizados. Sem essa fonte, esta modalidade publica somente a indicação e o link, com conteúdo descritivo próprio. A restrição de preço nulo é validada tanto no servidor quanto no banco; não depende de ocultar campos no navegador. Quando há link de associado, a vitrine inclui a identificação correspondente. Não há coleta de páginas, geração inventada de links, atualização automática ou aprovação automática nos programas de afiliados.

Referências consultadas em 17/09/2026:

- [Políticas da Amazon](https://associados.amazon.com.br/help/operating/policies)
- [Links oficiais pelo aplicativo Amazon](https://associados.amazon.com.br/help/node/topic/GH37MDS5PLQ9Z366)
- [SiteStripe](https://associados.amazon.com.br/help/node/topic/GJMMT7G4C8K4Y3AY)
- [Gerar links no Influenciador Magalu](https://www.magazinevoce.com.br/blog/artigo/como-usar-os-codigos-de-produto)

## Validação

27 testes unitários/integração, lint, compilação e fluxo completo de navegador passaram. O teste de navegador cadastra e publica as duas lojas em banco isolado, verifica preços ausentes, links de afiliado, filtro por loja, ordenação e largura móvel. Nenhum produto de teste foi inserido em produção. A migração 5 amplia as lojas permitidas e admite preço ausente somente para Amazon. A verificação de segurança do Supabase não retornou avisos.

Publicação: `dpl_3t69xjUbpNFJ9duzH2mMMuySc6ct`, promovida em 17/09/2026. O endereço principal é https://oferta-certa-azure.vercel.app. A conferência com o banco real confirmou a vitrine vazia e as três lojas disponíveis no filtro. Evidências: `evidence/staged-verification.json` e `evidence/public-search-verification.json`.
