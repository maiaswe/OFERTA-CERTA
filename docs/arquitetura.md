> DOCUMENTO HISTÓRICO. As declarações de estado abaixo se referem à fase/data original. Para o estado mais recente, leia ../../CONTEXTO-COMPLETO.md.

# Decisões aprovadas e evolução

## Fase atual

A autorização desta entrega cobre a Fase 1: base visual, navegação, temas, responsividade, estados e dados fictícios. A prévia é local; não houve deploy, criação de conta, banco ou ativação de conector.

Next.js App Router, React e TypeScript foram mantidos. CSS com variáveis de tema e SVG acessível permitem validar a interface sem adicionar bibliotecas de gráficos nesta fase. Ao integrar séries reais, a camada do gráfico poderá ser substituída preservando as regras e a tabela acessível. Testes puros usam o executor nativo do Node.js; os fluxos completos usam Playwright.

## Próximos incrementos

1. PostgreSQL/Supabase: migrações, identidade de produto e permissões.
2. API interna: validação, limites compartilhados, logs sanitizados, cache e persistência.
3. Histórico append-only: produto, oferta, vendedor, pagamento, contexto de entrega, origem, disponibilidade e qualidade da coleta.
4. Primeiro conector autorizado: validar Mercado Livre como candidato; não assumir acesso a ofertas pelo simples acesso ao catálogo.
5. Testes reais de busca, falha, timeout, 429 e gravação histórica.
6. Adicionar fontes individualmente; cupons e alertas reais dependem de licença e elegibilidade.
7. Administração autenticada e publicação após validação.

Entidades previstas: ProductIdentity, ProductAlias, Store, Seller, Offer, PriceHistory, Coupon, SearchQuery, FavoriteProduct, PriceAlert, ConnectorStatus, FetchLog e AdminUser.

## Invariantes

- Preço monetário em centavos; moeda explícita; datas em UTC.
- Frete desconhecido é nulo; frete grátis é zero.
- Anúncio com atributos incompatíveis não vence uma comparação exata.
- Cada coleta autorizada gera uma observação; leitura de cache não gera coleta fictícia.
- Não combinar séries de condições, vendedores ou contextos de entrega diferentes sem declarar a regra de agregação.
- Segredos ficam no servidor; isolamento por usuário no banco; controles administrativos no servidor.
- Nenhuma fonte é habilitada sem evidência de autorização e teste real.
- Amazon fica desativada até obter autorização compatível com histórico e alertas, além de elegibilidade à API.
- Hospedagem gratuita é limitada: Vercel Hobby para uso pessoal não comercial; Supabase Free com capacidade, pausa e exportação próprias do plano.

## Referências conferidas no planejamento

- Mercado Livre, busca de catálogo: https://developers.mercadolivre.com.br/buscador-de-produtos
- Mercado Livre, termos: https://developers.mercadolivre.com.br/pt_br/termos-e-condicoes
- Amazon Brasil, políticas: https://associados.amazon.com.br/help/operating/policies
- Amazon, Creators API: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction
- Supabase: https://supabase.com/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby

As permissões efetivas da conta e as regras vigentes precisam ser verificadas novamente antes de ativar qualquer integração.
