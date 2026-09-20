# Oferta Certa

Busca pública de ofertas revisadas e painel privado para organizar produtos, preços, cupons e histórico. Next.js App Router, TypeScript, PostgreSQL/Supabase e PWA. A entrada `/` abre `/ofertas`; a demonstração fictícia fica em `/demonstracao`, e o painel com dados persistentes está em `/painel`.

O OAuth do Mercado Livre foi conectado com a conta real em produção. A API permite descobrir catálogos e listar anúncios com preços, mas os testes de 15–16/09/2026 retornaram 403 nos detalhes e no preço de venda desses anúncios. A interface distingue ofertas completas de listagens informativas, sem fabricar links. Desde 17/09, o painel também permite cadastrar Magazine Luiza com preço manual e Amazon com botão de consulta de preço na loja, sem APIs. Consulte [o guia das lojas sem API](docs/lojas-sem-api.md).

Em `/painel/afiliados` (Publicar ofertas), o proprietário escolhe Mercado Livre, Magazine Luiza ou Amazon, revisa o produto e o link, salva rascunho e publica por 24 horas. Preço manual é usado em Mercado Livre e Magazine Luiza; Amazon fica sem cotação neste modo. O link de afiliado é opcional e pode ser adicionado depois. A vitrine `/ofertas` usa o endereço do anúncio enquanto não houver link de afiliado; divulga afiliação quando houver ofertas com atribuição. Não há ofertas fictícias no banco de produção. Consulte [o diagnóstico do Mercado Livre](docs/mercadolivre-ofertas.md).

A busca pública já filtra as ofertas revisadas por produto/variante, condição e faixa de preço, com ordenação e paginação. Ela não consulta todos os anúncios do Mercado Livre. Para investigar a recusa externa enquanto o app evolui, use [o relatório detalhado do erro 403](docs/erro-mercadolivre-para-suporte.md).

## Começar nesta instalação

```sh
npm run build
npm start
```

Abra [Meu painel](http://127.0.0.1:4317/painel). O servidor precisa continuar em execução. Esse endereço funciona neste computador e usa o banco Supabase **oferta-certa** já configurado no arquivo privado `.env.local`.

Crie um usuário de 3 a 60 caracteres e uma senha de 12 a 128 caracteres. O usuário aceita espaços e acentos. A conta é pessoal: há uma única conta principal, e os demais acessos usam esse mesmo cadastro. Uma senha curta agora mostra uma mensagem explícita. Não use as contas fictícias dos testes no banco real.

## Telas

| Endereço | Função |
| --- | --- |
| `/painel` | Produtos cadastrados, busca local, novos registros e avisos de preço-alvo |
| `/painel/busca` | Descoberta de anúncios, preço de venda, link e estados explícitos de dados incompletos |
| `/painel/afiliados` | Revisar produtos e links do Mercado Livre, Amazon e Magazine Luiza; publicar ou retirar da vitrine |
| `/ofertas` | Busca pública por loja, produto/variante, condição, faixa de preço, ordenação e paginação; somente ofertas revisadas e não vencidas |
| `/demonstracao` | Demonstração isolada com produtos fictícios |
| `/painel/produto/[id]` | Detalhes, ofertas, favorito, alerta e histórico do produto salvo |
| `/painel/historico` | Gráficos por oferta e período, registros e fontes |
| `/painel/favoritos` | Produtos salvos como favoritos |
| `/painel/cupons` | Cadastro, edição, cópia e desativação de cupons manuais |
| `/painel/integracoes` | Conectar, reconectar, desconectar, validade e registros de erro |

## Instalar em outro computador

Use Node.js 24 e npm. Instale as dependências com `npm ci`, copie `.env.example` para `.env.local` e configure o banco. Nunca envie `.env.local` ao Git, ao navegador ou a um pacote de distribuição.

Para um banco local de desenvolvimento, defina `DATABASE_MODE=local` e um `LOCAL_DATA_DIR` persistente. As migrações são aplicadas automaticamente somente nesse modo. Na Vercel, o aplicativo exige PostgreSQL externo: arquivos locais não são armazenamento durável.

## Variáveis do servidor

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL com usuário restrito; no Supabase desta instalação, pooler de transações, porta 6543 |
| `APP_ORIGIN` | Origem exata do painel: protocolo, domínio e porta, sem caminho |
| `ADMIN_BOOTSTRAP_TOKEN` | Código aleatório de pelo menos 32 caracteres para criar a primeira conta em endereço público; dispensado no loopback |
| `MELI_CLIENT_ID` | ID configurado: `7046681029899344` |
| `MELI_CLIENT_SECRET` | Segredo preenchido manualmente pelo proprietário; nunca uma variável `NEXT_PUBLIC_` |
| `MELI_REDIRECT_URI` | Retorno exato cadastrado no Mercado Livre |
| `MELI_USE_PKCE` | `true` somente quando PKCE estiver habilitado na aplicação do Mercado Livre |
| `OAUTH_ENCRYPTION_KEY` | Chave aleatória de 32 bytes em Base64, usada para criptografar tokens |
| `MELI_HISTORY_ENABLED` | `true` habilita gravação das coletas da API após conferência das condições de uso; padrão `false` |

`npm run setup:oauth` gera a chave de proteção e acrescenta os campos ausentes ao arquivo privado. Preserva valores existentes e não imprime credenciais. A instalação atual já foi preparada por esse comando. Guarde a chave com segurança: para trocá-la, desconecte a integração e autorize novamente depois da alteração.

`MELI_ACCESS_TOKEN` e `MELI_REFRESH_TOKEN` no exemplo são apenas placeholders e **não são lidos pelo aplicativo**. Os tokens nascem no OAuth e ficam no banco. `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` também estão documentados no exemplo, mas não são necessários neste backend, que usa a conexão PostgreSQL restrita. Não coloque uma chave privilegiada no frontend.

## Configurar o Mercado Livre

1. Em [Minhas aplicações](https://developers.mercadolivre.com.br/devcenter), abra a aplicação correspondente ao ID acima e copie seu segredo apenas para `MELI_CLIENT_SECRET` em `.env.local`.
2. Cadastre exatamente `https://127.0.0.1:3000/api/auth/mercadolivre/callback` como retorno de desenvolvimento. Não substitua `127.0.0.1` por `localhost`, não remova HTTPS e não acrescente uma barra final.
3. Confira as permissões de leitura e acesso offline necessárias. Se ativar PKCE no Mercado Livre, defina `MELI_USE_PKCE=true` no servidor.
4. Inicie o painel HTTPS conforme a seção seguinte, entre na conta do Oferta Certa e abra **Integrações → Conectar Mercado Livre**.
5. Autorize no site oficial. O retorno deverá mostrar **Conectado**, o identificador da conta e a validade. Teste uma busca.

Criar uma aplicação e autorizar a conta não garante acesso a todos os anúncios. Se a API retornar 403, o painel informa a falta de permissão; não substitui isso por preços fictícios. Consulte os guias oficiais de [criação da aplicação](https://developers.mercadolivre.com.br/pt_br/realizacao-de-testes/crie-uma-aplicacao-no-mercado-livre), [autorização](https://developers.mercadolivre.com.br/pt_br/mensagens-post-venda/autenticacao-e-autorizacao) e [permissões](https://developers.mercadolivre.com.br/pt_br/permissoes-funcionais/).

Para atendimento: **Integrações → Configuração e registros da integração → Baixar diagnóstico para suporte**. O relatório consulta recursos fixos pelo servidor e registra horário UTC, status, corpo dos erros, request ID, plataforma e região. Inclui IDs técnicos da conta e aplicação; envie somente ao suporte oficial. Não inclui chaves ou tokens. Limite: duas execuções a cada cinco minutos. Chamado atualizado: [chamado-humano-mercadolivre.md](docs/chamado-humano-mercadolivre.md). O erro 403 ainda não está resolvido.

### HTTPS local

O endereço HTTP da porta 4317 serve para usar o painel manual. O OAuth configurado exige **HTTPS na porta 3000**, com o mesmo domínio no início e no retorno para preservar o cookie de autorização.

O comando `npm run dev:https` usa certificados locais em `.local-data/tls/localhost.key` e `.local-data/tls/localhost.crt`, define `APP_ORIGIN=https://127.0.0.1:3000` apenas para esse processo e inicia Next.js em modo de desenvolvimento. Os certificados desta instalação já foram gerados, mas não foram adicionados ao repositório nem instalados como confiáveis no Windows. Um certificado local não confiável pode exigir configuração de confiança no navegador antes do teste. Não use esse certificado em produção.

Em outra instalação, gere um certificado de desenvolvimento para `127.0.0.1` e `localhost` com sua ferramenta de certificados local, salvando nos caminhos acima. Por exemplo, com OpenSSL:

```sh
mkdir -p .local-data/tls
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -keyout .local-data/tls/localhost.key -out .local-data/tls/localhost.crt -days 365 -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost'
npm run dev:https
```

No PowerShell, crie a pasta com `New-Item -ItemType Directory -Force .local-data/tls`. Em Windows com Git instalado, o executável pode estar em `C:\Program Files\Git\usr\bin\openssl.exe`.

### Fluxo implementado

- `GET /api/auth/mercadolivre/connect`: exige sessão, limita tentativas, cria `state` aleatório com validade de dez minutos e redireciona à autorização oficial. O cookie de vínculo usa HttpOnly, Secure e SameSite=Lax; a sessão principal continua SameSite=Strict.
- `GET /api/auth/mercadolivre/callback`: valida cookie, estado de uso único e sessão ainda válida no banco. Troca o código no servidor, guarda tokens criptografados e redireciona sem credenciais na URL final.
- `accessToken()`: antes de uma consulta, renova quando faltam menos de dois minutos para expirar. O bloqueio de linha serializa renovações concorrentes. Um 401 pode provocar uma única renovação e nova tentativa. Falha de renovação limpa os tokens e exige reautorização.
- **Desconectar** apaga as credenciais locais e cancela autorizações pendentes. A revogação do consentimento no provedor também pode ser feita na conta do Mercado Livre.

Chamadas de token usam POST com formulário em `https://api.mercadolibre.com/oauth/token`. Chamadas de produto usam Bearer no cabeçalho. Não há busca autenticada diretamente do navegador para o Mercado Livre.

## Cobertura da busca e do histórico

O conector consulta os recursos documentados `/products/search`, `/products/{id}` e `/items/{id}`. A busca é de **produtos de catálogo**, com até 20 resultados por página. Marca e modelo refinam essa página. O detalhe consulta o anúncio indicado em `buy_box_winner`, quando disponível. Essa oferta destacada não é uma varredura de todos os vendedores. Fontes: [buscador de produtos](https://developers.mercadolivre.com.br/buscador-de-produtos) e [competição no catálogo](https://developers.mercadolivre.com.br/pt_br/concorrencia-em-catalogo).

Cada clique em **Acompanhar e registrar preço** faz uma nova consulta e acrescenta uma observação, quando o histórico da API estiver habilitado. Os testes validam esse caminho com respostas simuladas. Não existe coleta periódica agendada nesta versão.

Cada anúncio importado mantém sua própria identidade. Não há união automática de anúncios diferentes por semelhança de título. Mudanças em atributos, catálogo, condição ou garantia geram correspondência parcial, excluída das estatísticas de correspondência confirmada. Registros manuais dependem da conferência explícita do usuário.

Os preços são centavos inteiros. Frete desconhecido permanece nulo e impede afirmar um total. A indicação de frete grátis no anúncio não confirma o custo para um CEP específico. O preço anunciado pode mudar com o pagamento e no carrinho.

O histórico é protegido por trigger contra alteração e exclusão, conserva a fonte e a identidade do momento da coleta e não inventa períodos anteriores. A média usa mínimos diários anteriores da mesma oferta. Menos de três registros é histórico insuficiente. Os gráficos permitem 7, 30, 90 dias ou todos os registros carregados.

Cupons são manuais, com fonte HTTPS da loja, validade, compra mínima, restrições e produto participante. Percentuais usam centésimos de ponto percentual (10% = 1000). Vincular um cupom a um registro exige confirmação de aplicação no carrinho e desconto compatível com as regras. Editar o cupom depois não altera observações antigas.

## Banco e migrações

As migrações em `supabase/migrations/` foram criadas com Supabase CLI:

1. `20260911154219_core.sql`: tabelas principais, histórico imutável e RLS.
2. `20260911155101_oauth_connectors.sql`: conexões/estados/eventos OAuth, identificação externa dos anúncios e regras de cupons.

**O Supabase desta instalação já recebeu ambas as estruturas. Não reaplique o SQL inicial ao banco existente.** Como a aplicação foi feita pelo conector Supabase, as versões do histórico interno do CLI podem ter identificadores diferentes dos arquivos locais. Antes de adotar `db push` nesse banco, confira e reconcilie o histórico com `supabase migration list` e `supabase migration repair`; não marque versões como aplicadas sem conferir a estrutura.

Para um projeto Supabase novo e vazio, instale/use o CLI, execute `supabase init` se ainda não houver `config.toml`, vincule o projeto com `supabase link --project-ref SEU_PROJETO`, revise `supabase db push --dry-run` e aplique `supabase db push`. Nunca use `db reset` no banco real.

Depois das migrações, execute `db/server-role.sql` como administrador e defina uma senha forte para `oc_runtime` pelo mecanismo seguro de administração do seu PostgreSQL. O arquivo não contém senha. Configure `DATABASE_URL` com esse usuário; no pooler Supabase, o nome inclui o sufixo do projeto conforme a tela de conexão. Nesta instalação isso já foi feito. O certificado público do Supabase está em `db/certs/` e a conexão valida certificado e hostname.

## Publicar na Vercel

O projeto usa rotas Next.js padrão, sem servidor personalizado em produção. Envie o código a um repositório privado, importe-o na Vercel como Next.js e mantenha `npm run build`. Configure as variáveis **no servidor** e um PostgreSQL externo. Não envie `.env.local`, `.local-data`, certificados privados, banco de testes ou `node_modules`.

Defina `APP_ORIGIN` com a origem HTTPS estável da implantação e troque `MELI_REDIRECT_URI` para essa origem seguida de `/api/auth/mercadolivre/callback`. Cadastre a mesma URL na aplicação do Mercado Livre antes de reconectar. Não use uma URL temporária de preview para uma conexão permanente. Crie a conta principal no painel local conectado ao mesmo banco ou use `ADMIN_BOOTSTRAP_TOKEN` no primeiro acesso público.

Publicado em 15/09/2026 no plano Hobby da Vercel: **https://oferta-certa-azure.vercel.app/painel**. O servidor usa o banco existente e a conta principal já criada. `APP_ORIGIN` e `MELI_REDIRECT_URI` de produção já usam esse domínio. O endereço de retorno a salvar no Mercado Livre é `https://oferta-certa-azure.vercel.app/api/auth/mercadolivre/callback`. O cadastro externo e a autorização real ainda precisam ser concluídos. A configuração local continua independente. Veja `docs/publicacao-vercel.md`.

## Testes e limites

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e:live
```

Os testes unitários e de integração usam PGlite isolado: conta, OAuth, state, PKCE, troca/rotação/invalidação dos tokens, permissões, normalização, dinheiro, cupons, persistência e imutabilidade. O teste de navegador usa banco separado e não grava no Supabase real. `npm run test:e2e` cobre a demonstração original.

O MVP carrega até 200 produtos e os 1.000 registros mais recentes; gráficos e médias mostram esse recorte. A exportação inclui o histórico completo. Alertas aparecem apenas dentro do painel e dependem de uma nova observação; não há envio de mensagens ou push. Recuperação de senha ainda exige intervenção administrativa. Uso público com múltiplos usuários exigirá adaptar o isolamento de dados e a regra de conta única.

O PWA abre `/painel` e possui uma página offline. Não armazena preços, respostas da API ou credenciais no cache offline. Outras lojas continuam disponíveis para registros manuais; uma integração futura precisa de sua própria fonte autorizada. Não existe neste projeto uma API universal gratuita para todas as lojas.

## Estrutura

```text
src/app/                  páginas e rotas de API
src/components/           telas da demonstração e painel real
src/lib/auth/             validação, OAuth e criptografia
src/lib/connectors/       contrato, registro e conector Mercado Livre
src/lib/pricing/          cálculo em centavos
src/lib/history/          coleta e identidade do anúncio
src/lib/coupons/          regras e persistência
src/server/               autenticação do painel, banco e APIs
src/domain/               produtos, observações e estatísticas
supabase/migrations/      migrações de produção
db/                       migração local inicial, certificado público e papel do servidor
public/                   ícones, manifesto e página offline
tests/                    testes unitários, integração e navegador
docs/                     registros das entregas
```
