> DOCUMENTO HISTÓRICO. As declarações de estado abaixo se referem à fase/data original. Para o estado mais recente, leia ../../CONTEXTO-COMPLETO.md.

# Entrega — integração Mercado Livre

Verificação concluída em 15/09/2026.

## Implementado

- OAuth no servidor, state vinculado à sessão e a cookie seguro, PKCE opcional, consumo único e criptografia AES-256-GCM.
- Renovação sob bloqueio de linha com persistência do refresh token rotacionado. Falha invalida a conexão. Conectar, retornar e desconectar são serializados por conta.
- Conector modular para busca no catálogo, oferta destacada e consulta do anúncio. Normalização de BRL, link da loja, atributos, imagem, disponibilidade, vendedor e frete desconhecido.
- Coleta adiciona histórico, preserva identidade e marca alterações de atributos como correspondência parcial.
- Telas reais de integrações, busca, detalhes, favoritos, histórico por período e cupons manuais. Links permanentes para produtos.
- Validação do cadastro em português, usuário com acentos/espaços e criação atômica da conta com sua sessão.
- Cupons com validade, fonte, compra mínima, produto, edição/desativação e confirmação no carrinho antes de associar o desconto à observação.
- PWA inicia no painel real; o service worker não intercepta as rotas OAuth/API e não armazena preços offline.
- Migrações de produção, exemplo de ambiente sem segredos, preparação local e README de configuração/publicação.

## Evidências

- 14 testes unitários e de integração aprovados, incluindo troca/rotação de tokens simulados, state inválido/expirado/reutilizado, recusa da autorização, sessão encerrada, criptografia, regras de preço, cupons e histórico imutável.
- TypeScript, lint e compilação Next.js aprovados.
- Teste Playwright completo aprovado com banco isolado: criar conta, entrar, produto, preço, favorito, alerta, histórico, recarregar, cupom, desativação, tela de integração, exportação e nova entrada. Larguras de 1280, 768 e 390 pixels sem transbordamento horizontal na página de detalhes.
- A estrutura OAuth foi aplicada ao Supabase oferta-certa. RLS ativo nas três tabelas novas; anon e authenticated sem leitura; oc_runtime com acesso necessário. Verificação de segurança do Supabase sem alertas.
- Nenhum cadastro ou cupom de teste foi gravado no banco real. O painel real respondeu com armazenamento na nuvem e configuração inicial pendente.
- HTTPS local em https://127.0.0.1:3000 respondeu 200 com validação do certificado local e conexão ao banco na nuvem.
- Nenhuma credencial privada encontrada nos 17 arquivos estáticos verificados. O pacote exclui .env.local, chaves privadas, bancos de teste e arquivos de compilação.
- O comando de teste do navegador passou com saída 0. Seu inicializador encerra apenas o servidor de testes que criou, evitando um bloqueio de encerramento observado no Windows.

## Pendências externas e limites

O segredo real não foi preenchido, e não houve consentimento OAuth de uma conta real. Portanto, acesso efetivo às ofertas e renovação com o provedor real ainda precisam ser validados. Os tokens dos testes são fictícios e ficam apenas em banco isolado.

A gravação do histórico da API começa desativada, controlada por MELI_HISTORY_ENABLED, para habilitação conforme as condições de uso aplicáveis. A coleta é solicitada pelo usuário; não há rotina periódica. A busca não cobre todos os vendedores nem todas as lojas. O histórico manual já funciona.

O endereço local HTTPS e seu certificado de desenvolvimento foram preparados. O certificado não foi instalado como confiável no Windows. Não foi feita publicação pública na Vercel. O README descreve a troca para um domínio HTTPS de produção.
