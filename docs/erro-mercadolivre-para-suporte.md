# Oferta Certa — erro para investigação pelo Mercado Livre

**Atualização de 16/09/2026, 22:12 UTC:** nova matriz de 11 consultas registrada em `evidence/mercadolivre-support-local.json`. O 403 persiste. Request ID principal mais recente: `0d83aa47-8616-43ef-ba7a-481b6edd50d7`. Use [o chamado humano atualizado](chamado-humano-mercadolivre.md), que contém os corpos integrais e todos os identificadores. As evidências abaixo preservam a investigação anterior. O novo chamado ainda não foi enviado.

## Resumo

A autenticação funciona, mas a API recusa a leitura dos detalhes de anúncios de terceiros. Isso impede obter o link oficial (`permalink`) e confirmar o preço de venda. A causa interna do bloqueio ainda não foi identificada. Não é o antigo erro de tela CloudFront durante o login.

Aplicação: **7046681029899344**. País/site: **Brasil / MLB**.
Site: https://oferta-certa-azure.vercel.app
Uso pretendido: comparar produtos e ofertas e encaminhar visitantes ao anúncio correto. Links de afiliado serão adicionados posteriormente.

## Requisição exata recusada

Data do teste: **16/09/2026 às 15:35:15 UTC (12:35:15 de Brasília)**.

```http
GET https://api.mercadolibre.com/items/MLB6288254546
Authorization: Bearer <access_token válido, omitido>
```

HTTP recebido: **403 Forbidden**.
Campos observados no corpo:

```json
{
  "error": "access_denied",
  "message": "Access to the requested resource is forbidden"
}
```

Cabeçalho **x-request-id: 052574f8-adb6-46ab-9551-872479027459**.

Este teste foi feito diretamente contra a API, fora da interface e da normalização do Oferta Certa. Portanto, a ausência de link não é apenas um botão escondido na tela.

## Comparação dos recursos testados

| Consulta | Retorno observado |
|---|---|
| `GET /users/me` | 200; conta ativa e a mesma do navegador |
| `GET /applications/7046681029899344` | 200; aplicação ativa, fora do modo de testes e sem bloqueio declarado |
| `GET /applications/7046681029899344/grants` | 200; autorização e escopos de leitura presentes |
| `GET /products/search?site_id=MLB&status=active&q=iPhone%2015%20128%20GB&limit=3` | 200; retorna produtos de catálogo |
| `GET /products/MLB27172667/items?limit=3` | 200; retorna anúncios e preços de listagem, inclusive MLB7514973182 |
| `GET /sites/MLB/search?q=iPhone%2015%20128%20GB&limit=3` | 403; forbidden |
| `GET /items/MLB7514973182` | 403; access_denied |
| `GET /items/MLB7514973182/sale_price?context=channel_marketplace` | 403; acesso proibido |
| `GET /items/bulk?ids=MLB6288254546,MLB7514973182` | HTTP 200 no envelope, mas status_code=403 em cada item; não é sucesso de leitura |

## O que já verificamos

- Authorization Code, Refresh Token e PKCE configurados. Callback corresponde ao domínio publicado.
- `active=true`, `sandbox_mode=false`, `blocked=false`, `partial_blocked.blocked=false`, `disabled=false`.
- Permissão Publicação e sincronização selecionada em **Leitura**. Grant inclui `read`, `offline_access`, `urn:ml:mktp:publish-sync:/read-only` e `urn:ml:all:publish-sync:/read-only`.
- Não há escopos `urn:mp:` misturados. Não configuramos restrição de IP; o DevCenter disponível não mostra gerenciamento de IP. Não conseguimos verificar políticas internas não expostas.
- Conta ativa e e-mail confirmado. Endereço de entrega cadastrado e endereço fiscal visível no perfil. Apesar disso, `/users/me` ainda indica `status.list.allow=false`, `codes=["address_pending"]`. Não há prova de que isso bloqueie consultas de leitura.
- `certification_status=not_certified`. Não há confirmação de que certificação seja exigida para resolver este caso.
- Um defeito nosso que interrompia consultas seguintes após um 403 individual foi corrigido; a recusa direta da API continuou.
- Nosso retorno não contém o par `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` / `PolicyAgent` mencionado pelo assistente. Não deduzimos uma permissão faltante a partir desse outro exemplo.

## Pergunta a ser respondida pelo suporte

Qual política ou requisito negou o request ID acima? Esta aplicação está autorizada a ler detalhes, permalink e preço de anúncios de terceiros para comparação? Se faltar habilitação, qual é o procedimento oficial disponível para uma aplicação não certificada? A pendência `address_pending` influencia esses GETs, e qual cadastro falta se os endereços já aparecem no site?

O assistente automatizado já foi consultado, mas não identificou a regra interna e não abriu chamado humano. **Ainda não há protocolo de atendimento.**

## Referências

- https://developers.mercadolivre.com.br/pt_br/api-de-precos — descreve inclusive consultas com token de quem não é o vendedor, ocultando dados privados; não garante acesso irrestrito à nossa aplicação.
- https://developers.mercadolivre.com.br/pt_br/erro-403 — causas gerais do erro.
- https://developers.mercadolivre.com.br/itens-e-buscas — consulta individual/em lote e mudança para `/items/bulk`.

Este relatório não contém tokens, chave secreta, CPF, telefone ou endereço pessoal. Não envie suas credenciais ao pedir suporte.
