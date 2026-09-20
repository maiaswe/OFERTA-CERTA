> DOCUMENTO HISTÓRICO. As declarações de estado abaixo se referem à fase/data original. Para o estado mais recente, leia ../../CONTEXTO-COMPLETO.md.

# Fase 2 — base persistente e painel pessoal

Data: 11/09/2026.

## Infraestrutura

- `signal-atlas` (`wdyxmvofckabvohmsnts`) pausado com autorização explícita do proprietário. Status confirmado: INACTIVE.
- `market-analyzer-teste` (`fmxxyysedxawswwcuhgg`) preservado. A configuração pública de `https://market-analyzer-ia.vercel.app/cloud-config.js` apontava para esse projeto.
- `oferta-certa` (`ihaaiauxaublyucvduog`) criado em `sa-east-1`, organização Maías Wedig, usando a vaga gratuita liberada.
- 18 tabelas da aplicação, RLS ativada, nove lojas desativadas e histórico protegido contra alteração/exclusão.
- Papel `oc_runtime` restrito às tabelas da aplicação, sem superusuário nem criação de papéis/estrutura. Credencial guardada somente em configuração privada do servidor.
- Segredo temporário de provisionamento removido do banco após transferência para a configuração local. O certificado público oficial valida a conexão TLS com o pooler.
- Verificação de segurança do Supabase: nenhuma ocorrência retornada nesta implementação.

## Validação

Teste na nuvem: conexão como papel restrito, escrita de um registro temporário dentro de transação, leitura e rollback confirmados. Nenhum produto de teste permaneceu. A tentativa de alterar o histórico foi recusada por permissão.

Testes automatizados de API: criação de conta, bloqueio de origem externa, acesso sem sessão, cookies, produto, favorito, alerta, idempotência, preço final, frete desconhecido, imutabilidade, validação de domínio, exportação, saída, novo login e recusa de segunda conta.

No navegador do Codex, em banco local isolado: criação de conta de teste, cadastro de SSD, favorito, alvo de R$ 1.000, oferta de R$ 950 com frete de R$ 20, total de R$ 970, notificação, histórico, recarga da página e novo login preservando os registros. Visual inspecionado em desktop e 390 px, sem transbordamento horizontal; não houve erros de JavaScript no navegador durante o fluxo.

O Playwright automatizado não conseguiu abrir o Chrome nesta sessão: o Windows encerrou o processo durante a inicialização do perfil. O roteiro permanece no repositório. Isso não é registrado como teste automatizado aprovado. A inspeção pelo navegador do Codex foi o caminho alternativo.

Durante a verificação foi corrigida a checagem de origem: o Next.js pode construir uma URL interna com localhost. O backend agora compara o cabeçalho Host com a origem fixa configurada e continua conferindo Origin e Sec-Fetch-Site.

## Estado da entrega

Painel em `http://127.0.0.1:4317/painel`, com banco real na nuvem. A conta do proprietário ainda deve ser criada no formulário de primeiro acesso. O painel local não é uma publicação pública para acesso pelo celular.

O objetivo de busca automática ainda não está concluído. O proprietário informou não ter acesso de desenvolvedor ou afiliado aprovado em lojas. Não foram usados raspagem, credenciais de terceiros ou dados fictícios como se fossem ofertas reais. As tabelas de integração estão preparadas; conectores e agendamento ainda precisam ser implementados e validados com uma fonte autorizada.
