# Consulta enviada ao assistente oficial

Enviada em 16/09/2026, às 12:36 (America/Sao_Paulo), após autorização explícita do proprietário. Recebimento confirmado na conversa do assistente oficial. Não equivale à abertura de chamado humano; ainda sem protocolo.

## Andamento da conversa

O assistente automatizado respondeu indicando os recursos de consulta de itens, enumerou causas gerais de 403 e perguntou sobre restrição de IP. Informou não encontrar documentação que ligue explicitamente `address_pending` ao bloqueio de leitura e não apresentou uma política específica para o request ID. Essa resposta genérica não confirma liberação do caso de uso nem resolve a causa.

Às 12:37 foi enviado acompanhamento: não configuramos lista de IPs, e a tela disponível não apresenta gerenciamento de IP; aplicações e grant têm os escopos, enquanto consultas de usuário e catálogo funcionam na mesma origem. Solicitamos identificação da política que recusou a requisição e encaminhamento humano ou canal acessível a aplicação não certificada. Envio confirmado na conversa. A conexão de controle do navegador foi encerrada antes da leitura da resposta; retomada depende de reconexão do Chrome ou cópia da resposta pelo proprietário.

## Conteúdo da consulta inicial

### Resposta de acompanhamento recebida pelo proprietário

O proprietário copiou a resposta do assistente: não encontrou fluxo público para identificar a política a partir do x-request-id; mencionou PA_UNAUTHORIZED_RESULT_FROM_POLICIES/PolicyAgent como indicador de permissões funcionais; não encontrou canal específico de análise para aplicação não certificada e apontou suporte como benefício do DPP. Não houve encaminhamento, diagnóstico interno nem protocolo. Nosso retorno observado é access_denied, sem aquele par de campos; portanto, não atribuímos a causa a uma permissão funcional com base nessa resposta.

Verificação complementar em fontes oficiais: a API de preços descreve consultas com token de quem não é o vendedor, ocultando metadados privados (https://developers.mercadolivre.com.br/pt_br/api-de-precos). Isso não garante acesso irrestrito de toda aplicação a todo item. O DPP é direcionado a soluções para vendedores e tem requisitos de operação, segurança e desenvolvimento (https://developers.mercadolivre.com.br/pt_br/developer-partner-program); não foi identificado um procedimento de certificação que garanta resolver o nosso 403. Não há base para prometer que mudar escopos, renovar segredo ou pagar por certificação resolva.

Destino: assistente oficial de integrações em developers.mercadolivre.com.br, com eventual orientação para suporte humano.

Assunto: API nega detalhes de anúncios de terceiros com OAuth e leitura ativos

Nossa aplicação 7046681029899344, site MLB, integra o Oferta Certa (https://oferta-certa-azure.vercel.app). A finalidade é mostrar produtos, preços e links oficiais de anúncios de terceiros para comparação; a afiliação será uma etapa posterior.

Em 16/09/2026 confirmamos: OAuth com Authorization Code, Refresh Token e PKCE; aplicação ativa, sandbox_mode=false, blocked=false, partial_blocked.blocked=false, disabled=false; escopos read, offline_access e publicação/sincronização read-only presentes na aplicação e no grant. Não há escopos urn:mp. /users/me retorna 200, conta ativa e a mesma conta conectada no navegador.

/products/search e /products/MLB27172667/items respondem 200, e a listagem retorna anúncios reais e preços, como MLB7514973182. Entretanto, /sites/MLB/search retorna 403, e /items/{id} e /items/{id}/sale_price?context=channel_marketplace retornam 403 access_denied. /items/bulk também retorna 403 por anúncio. A recusa ocorre em consulta direta à API, fora da interface do aplicativo.

Reprodução exata mais recente: GET https://api.mercadolibre.com/items/MLB6288254546 com Authorization: Bearer [omitido], em 16/09/2026 15:35:15 UTC. HTTP 403; error=access_denied; message="Access to the requested resource is forbidden"; x-request-id=052574f8-adb6-46ab-9551-872479027459.

Após cadastrar o endereço de entrega, ele aparece no site e o perfil exibe endereço fiscal, mas /users/me ainda informa status.list.allow=false e codes=["address_pending"]. Não afirmamos que essa pendência de publicação explique o bloqueio de leitura.

Podem esclarecer:

1. Esta aplicação pode consultar detalhes, permalink e preço de anúncios de terceiros para essa finalidade? Qual endpoint e autorização são exigidos?
2. Qual política ou permissão gerou a recusa no request ID informado? Há liberação adicional ou certificação necessária?
3. address_pending pode impedir essas consultas de leitura? Se sim, qual cadastro deve ser completado, já que endereço de entrega e endereço fiscal constam no site?

Não incluímos access token, refresh token, chave secreta, CPF, telefone ou endereço pessoal.
