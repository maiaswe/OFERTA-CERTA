# Mercado Livre: anúncios, preços e afiliação

Estado atualizado em 16/09/2026. Escopo atual: somente Mercado Livre, conforme orientação do proprietário. Amazon, Shopee, TikTok Shop e Magazine Luiza estão adiados.

### Execução do diagnóstico fornecido pelo proprietário

Em 16/09/2026, 22:12:25–22:12:27 UTC, foram repetidas 11 consultas locais com o mesmo token: conta, aplicação, grants e catálogo retornaram 200; busca geral, detalhes e sale_price continuaram 403; o bulk retornou 403 em ambos os elementos. Relatório integral de erros, horários e IDs em `evidence/mercadolivre-support-local.json`. Chamado pronto em `chamado-humano-mercadolivre.md`, ainda não enviado: o controle de abas retornou Transport closed, e a alternativa de controle do Chrome foi encerrada por não conseguir identificar a URL com segurança. Nenhum protocolo humano foi obtido.

A confirmação de preço agora exige sale_price válido. Removida a alternativa automática por prices/price legado em falhas transitórias. Cache atualizado para meli-offers-v6. Valores de catálogo permanecem informativos, identificados como “Preço de listagem — confirme no Mercado Livre”, fora da comparação. O painel privado permite baixar um novo diagnóstico feito pelo servidor, com região e plataforma, limite de duas execuções a cada cinco minutos, interrupção por 401/429 e sem credenciais. A comparação autenticada com Vercel está pendente de execução pelo painel.

Publicado em `dpl_5FYW9sX6AoneJbYFiR4BDMxEtSo6`, promovido ao domínio principal após conferência. Validação desta etapa: 26 testes unitários/integração, lint, build local e remoto, fluxo completo de navegador com download do relatório simulado e aviso de preço de listagem. Em produção, busca pública respondeu 200 e o diagnóstico recusou acesso sem sessão com 401. O teste de download usa resposta simulada; não comprova execução autenticada da matriz na Vercel.

Nova entrega: busca pública em `/ofertas` por título e variante, condição, preço mínimo/máximo, ordenação e paginação de 12 ofertas. A entrada `/` e `/busca` encaminham a essa busca; a demonstração fictícia fica em `/demonstracao`. Somente ofertas publicadas e com revisão válida aparecem; rascunhos e expiradas ficam ocultos. A seleção é cadastrada pelo proprietário e não representa todo o Mercado Livre. O relatório pronto para investigação externa está em [erro-mercadolivre-para-suporte.md](erro-mercadolivre-para-suporte.md).

Entrega publicada em 16/09/2026: implantação `dpl_FCVRrCuBuTC9ba1ersfXHqpFPBVF`. Compilação de produção, lint, 23 testes unitários/integração, fluxo completo do painel/vitrine e 11 testes da demonstração passaram. A versão preparada foi conferida com o banco real antes da promoção. Evidências em `evidence/staged-verification.json` e `evidence/public-search-verification.json`. O banco de produção ainda não possui ofertas revisadas publicadas; o site apresenta esse estado de forma explícita.

Atualização publicada e conferida em 16/09/2026: https://oferta-certa-azure.vercel.app/ofertas. Implantação `dpl_FSuNNg7zkRYywz6h9BjuVhkSeGRS`, promovida após conferência da versão preparada com o banco real. A publicação agora aceita o link normal do anúncio; afiliado é opcional e pode ser adicionado depois. O painel publicado foi conferido no navegador, a vitrine pública respondeu 200 e a API privada de ofertas respondeu 401 sem sessão. Os 21 testes unitários/integração, lint, compilação e teste de navegador passaram. O teste de navegador publicou com URL normal e depois adicionou afiliado, validando o destino e a divulgação em cada etapa, em banco isolado. Nenhum anúncio de teste foi publicado no banco real. A obtenção automática dos links continua pendente do diagnóstico dos erros da API; esta entrega não os resolve.

## Diagnóstico real

### Reauditoria de 16/09/2026

Investigação adicional: `GET /applications/{app_id}` retornou aplicação ativa, `sandbox_mode:false`, `blocked:false`, `partial_blocked.blocked:false` e `disabled:false`. Escopos não incluem `urn:mp:` (a documentação atual exige separar Mercado Pago de Mercado Livre). Certificação `not_certified` observada, sem prova de relação causal com os 403. A conta confirmou e-mail, compras e vendas habilitadas, mas `status.list.allow:false` com código `address_pending`: pendência de endereço para publicar anúncios. É uma pista de cadastro incompleto, não prova de que cause recusa de leitura de anúncios de terceiros. Não foi alterado nenhum dado cadastral. A inspeção do DevCenter solicitou validação por telefone ao proprietário.

Consulta direta do anúncio continuou 403 `access_denied`, mensagem `Access to the requested resource is forbidden`, resposta JSON, request ID `83a2b8bc-9fb6-4729-8a9d-ea603f31d99d`. Evidência de configuração sanitizada: `evidence/mercadolivre-application-state.json`. Não é a antiga página HTML de erro do login OAuth. Próximo teste: revisar pendências cadastrais e configuração visual, então comparar a mesma consulta após qualquer correção necessária.

Inspeção visual após a confirmação telefônica: callback corresponde à produção; Authorization Code, Refresh Token e PKCE selecionados; somente unidade Mercado Livre; Publicação e sincronização está selecionada em Leitura. Nenhuma alteração foi salva no DevCenter. Em Meu perfil → Endereços não havia endereço cadastrado. Formulário oficial aberto para o proprietário preencher os dados corretos. Após salvar, conferir se `address_pending` desaparece e repetir a consulta do mesmo anúncio; mesmo que persista o 403, o teste elimina essa hipótese sem ampliar permissões.

Resultado após o proprietário salvar o endereço: endereço de entrega visível, perfil também mostra endereço fiscal. A identidade da conta no navegador coincide com o token. A API ainda informa `address_pending` e dados de endereço do perfil ausentes. A repetição do mesmo `/items/MLB6288254546` continuou 403 em 16/09/2026 às 15:35:15 UTC, request ID `052574f8-adb6-46ab-9551-872479027459`. Não há confirmação de causa nem motivo para pedir repetidos recadastros. Evidência: `evidence/mercadolivre-after-address.json`. Consulta ao suporte preparada em `consulta-suporte-mercadolivre.md`, sem credenciais ou dados pessoais; ainda não enviada.

Atualização: o proprietário autorizou o envio, e a consulta foi enviada ao assistente oficial às 12:36, seguida de pergunta sobre diagnóstico interno e encaminhamento às 12:37. A primeira resposta foi genérica e pediu confirmação de restrição de IP. DevCenter não mostra gerenciamento de IP nesta aplicação, e não configuramos lista permitida; isso não prova ausência de política interna. O assistente não confirmou causa nem concessão para leitura de terceiros. Sem chamado humano/protocolo até o último estado observado. Consulte o registro da conversa em `consulta-suporte-mercadolivre.md`.

O diagnóstico anterior não comprova que o Mercado Livre proíba fornecer links. A documentação prevê `permalink` e a API de preços descreve inclusive um cenário com token que não pertence ao vendedor (sem os metadados de promoção). O motivo preciso dos nossos 403 permanece não identificado.

Testes diretos, fora da interface e da normalização do aplicativo: `/users/me` respondeu 200, conta ativa MLB e identidade correspondente à conexão; `/applications/{app_id}/grants` confirmou o grant e os scopes de leitura de publicação/sincronização; a consulta dos próprios anúncios respondeu 200, com zero anúncios. Portanto, não constatamos token trocado, conta inativa ou ausência desse scope de leitura.

A documentação atualizada em 31/08/2026 introduziu `/items/bulk?ids=...` (substituindo o lote antigo, com migração até 25/10/2026). O novo endereço foi testado com dois anúncios e devolveu `status_code:403` em ambos, apesar de HTTP 200 no envelope. A troca de endereço não resolveu o bloqueio. Evidência: `evidence/mercadolivre-access-audit.json`.

Foi encontrado e corrigido um defeito nosso: um 403 individual interrompia a consulta de alguns anúncios seguintes. Agora cada anúncio é consultado independentemente, dentro dos limites de tempo e concorrência. O cache da busca passou à versão 5; teste de regressão comprova que uma oferta acessível depois de três recusas ainda aparece. Os 21 testes passaram. A busca real após a correção continuou com sete listagens e zero ofertas completas.

### Fluxo afiliado desejado

O objetivo é busca pública → escolher anúncio → botão com link de afiliado válido. A busca pública já funciona sobre as ofertas cadastradas e revisadas pelo proprietário. A descoberta automática de anúncios completos e a geração automática de links afiliados continuam pendentes. Um `permalink` normal não comprova atribuição de comissão.

Nas instruções oficiais consultadas, os links afiliados são gerados pela Barra de Afiliados ou pelo Gerador de Links do Portal. Não foi encontrada documentação pública oficial de uma API de geração afiliada para esta aplicação. Isso não equivale a provar que nenhuma integração privada ou parceria exista. É necessário confirmar com o programa uma forma autorizada de automatizar a geração; alternativamente, a busca pode operar sobre ofertas com links oficiais previamente gerados, deixando claro o limite dessa cobertura.

Referências da reauditoria: [erro 403](https://developers.mercadolivre.com.br/pt_br/convivencia-me1-me2/erro-403), [permissões](https://developers.mercadolivre.com.br/pt_br/permissoes-funcionais), [grants](https://developers.mercadolivre.com.br/devcenter/gerencie-seu-aplicativo), [lote atualizado](https://developers.mercadolivre.com.br/itens-e-buscas), [geração oficial de links afiliados](https://www.mercadolivre.com.br/l/afiliados-gere-seus-links).

OAuth conectado. `/sites/MLB/search` retorna 403. `/products/search` e `/products/{id}/items` respondem e fornecem catálogos e anúncios com preço de listagem. Na amostra de iPhone 15, sete anúncios retornaram preço na busca integrada em 1,8 segundo, mas nenhum anúncio ficou completo.

`/items/MLB6288254546` e `/items/MLB6288254546/sale_price?context=channel_marketplace` retornam 403 `access_denied`. A consulta oficial em lote `/items?ids=MLB6288254546` retorna HTTP 200 com código 403 no elemento. Não foi interpretada como sucesso. Os relatórios sanitizados estão em `docs/evidence/mercadolivre-*.json`.

Isso é uma recusa da API na conexão testada. A resposta não identifica a permissão ou regra exata. Não há evidência de que reconectar ou trocar o segredo resolva. Não alteramos a aplicação no DevCenter. A consulta autorizada ao assistente oficial foi enviada em 16/09, conforme registro acima.

## Implementado

- Descoberta geral quando disponível, com alternativa oficial por catálogo; até seis produtos e três anúncios por produto em cada página.
- Hidratação do anúncio e confirmação de preço exclusivamente por `/sale_price`; falhas não são substituídas automaticamente por preço legado ou por `/prices`.
- Preços positivos em BRL, centavos inteiros, frete desconhecido preservado e desconto somente quando o preço anterior é maior.
- URLs oficiais retornadas preservadas integralmente. Sem fabricação de permalink ou de códigos de afiliado.
- Comparação apenas no grupo da mesma identidade, atributos críticos e condição. Cobertura parcial e frete não incluído informados na tela.
- Anúncios incompletos mostram preço de listagem, quando disponível, e o motivo da exclusão. Nenhum botão falso de compra.
- Cache privado de 45 segundos com versão e geração da conexão; concorrência limitada a três, uma repetição transitória, pausa por 429 e orçamento de 40 segundos por busca.
- Catálogos sem publicações não interrompem as demais consultas. Logs sanitizados por endpoint lógico e resumo com identificador da busca.
- Área privada de ofertas afiliadas e vitrine pública `/ofertas`. O usuário revisa preço, variante, disponibilidade e links; publicações expiram após 24 horas. Rascunhos ficam privados. Cada alteração conserva uma revisão imutável.
- Tokens continuam criptografados e restritos ao servidor. Novas tabelas com RLS, sem acesso direto anon/authenticated; escrita exige sessão e origem autorizada. Verificação de segurança do Supabase sem avisos.

## Validação e limites

23 testes unitários/integração passaram, incluindo OAuth, preço, preservação de links, 403, 429, cache, rascunho/publicação/expiração, revisões imutáveis e busca pública com filtros e paginação. O fluxo completo de navegador passou em banco local isolado: publicação, busca sem autenticação, filtros, preço, link normal, inclusão posterior de afiliação, retirada e visualização móvel. Os 11 testes de navegador da demonstração também passaram. As respostas simuladas testam comportamento; não demonstram que a API liberou anúncios reais. A busca automática real continua sem oferta completa por recusa da API, de causa ainda desconhecida.

A gravação do histórico obtido automaticamente pela API permanece desabilitada pela configuração `MELI_HISTORY_ENABLED=false`. O histórico manual existente continua disponível. Não foi adicionado agendamento nem alegação de atualização automática dos preços curados.

## Como operar agora

1. Abra `/painel/afiliados` e escolha Adicionar oferta.
2. Informe título, variante, condição, preço conferido e link completo do anúncio.
3. Cole o link completo do anúncio. O link de afiliado é opcional, em uma seção separada, e pode ser adicionado depois. Enquanto estiver vazio, o botão abre exatamente o link normal salvo. O aplicativo não gera atribuição de comissão por conta própria.
4. Confirme a revisão e publique. Em `/ofertas`, o botão leva ao link informado, sem alteração dos parâmetros.
5. Revise o preço antes de republicar após 24 horas. Retire a publicação se ficar indisponível.

## Próximo passo para a busca automática completa

O proprietário pode usar [o relatório detalhado](erro-mercadolivre-para-suporte.md) para buscar atendimento que identifique a política interna. A consulta ao assistente automatizado já foi enviada, mas não há chamado humano nem causa confirmada. Texto inicial usado como referência:

> Minha aplicação 7046681029899344 concluiu OAuth com PKCE no Oferta Certa. Em 15/09/2026, `/products/search` e `/products/MLB27172667/items` responderam 200 e retornaram anúncios, incluindo MLB6288254546. Porém `/sites/MLB/search`, `/items/MLB6288254546` e `/items/MLB6288254546/sale_price?context=channel_marketplace` retornam 403; o lote `/items?ids=MLB6288254546` também tem código 403 no elemento. A finalidade é exibir produtos, preços e links oficiais para comparação e divulgação afiliada. Quais permissões/aprovações são necessárias, e esse uso de anúncios de terceiros está disponível para minha aplicação?

## Referências oficiais consultadas

- [API de preços](https://developers.mercadolivre.com.br/pt_br/api-de-precos): `sale_price`, `amount`, `regular_amount`, canal e alternativa `prices`.
- [Concorrência em catálogo](https://developers.mercadolivre.com.br/pt_br/produto-analise-benchmarking/concorrencia-em-catalogo): anúncios associados a um produto.
- [Busca de produtos](https://developers.mercadolivre.com.br/buscador-de-produtos): catálogo e identidade do produto.
