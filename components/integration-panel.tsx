"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- OAuth needs full browser navigation without prefetch. */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Link2,
  RefreshCw,
  Unplug,
  ShieldCheck,
} from "lucide-react";

export async function integrationApi(
  action: string,
  body?: unknown,
  params: Record<string, string> = {},
) {
  const response = await fetch(
    `/api/integrations?${new URLSearchParams({ action, ...params })}`,
    {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir.");
  return data;
}
type State = {
  configurationError: string | null;
  redirectUri: string;
  historyEnabled: boolean;
  connection: {
    status: string;
    provider_user_id: string;
    expires_at: string;
    updated_at: string;
    last_error: string | null;
  } | null;
  events: { event: string; error_code: string | null; created_at: string }[];
};
const date = (s: string) => new Date(s).toLocaleString("pt-BR");
export function IntegrationPanel() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    integrationApi("status")
      .then((s) => {
        if (active) setState(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const result = new URLSearchParams(window.location.search).get("oauth");
    if (result) {
      setTimeout(() => {
        if (active) {
          if (result === "connected")
            setNotice("Mercado Livre conectado. Você já pode testar a busca.");
          else
            setError(
              result === "OAUTH_STATE"
                ? "Esta autorização expirou ou já foi utilizada. Inicie uma nova conexão."
                : result === "OAUTH_DENIED"
                  ? "A autorização foi cancelada no Mercado Livre."
                  : "A conexão não foi concluída. Confira a configuração e tente novamente.",
            );
        }
      }, 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      active = false;
    };
  }, []);
  async function refresh(disconnect = false) {
    setBusy(true);
    setError("");
    try {
      if (disconnect) {
        await integrationApi("disconnect", {});
        setNotice(
          "A conexão foi removida deste aplicativo. Você também pode revogar a autorização no Mercado Livre.",
        );
      }
      setState(await integrationApi("status"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const connection = state?.connection;
  async function downloadDiagnostic() {
    setBusy(true);
    setError("");
    try {
      const report = await integrationApi("diagnostic", {});
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "diagnostico-mercadolivre.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Relatório baixado. Envie ao suporte oficial do Mercado Livre: ele contém horários, erros e IDs técnicos, sem chaves ou tokens.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="live-card live-integrations">
      <span className="live-kicker">CONTROLE DAS SUAS CONEXÕES</span>
      <h2>Integrações</h2>
      <p>
        Conecte sua conta para consultar os produtos que o Mercado Livre
        disponibilizar à sua aplicação.
      </p>
      {error && (
        <p role="alert" className="live-message live-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="live-message">
          {notice}
        </p>
      )}
      {!state ? (
        <p>Carregando conexão…</p>
      ) : (
        <>
          <div className="live-provider-heading">
            <span className="live-provider-logo">ML</span>
            <div>
              <h3>Mercado Livre</h3>
              <span>
                {connection?.status === "connected"
                  ? "Conectado"
                  : connection?.status === "invalid"
                    ? "Precisa reconectar"
                    : "Ainda não conectado"}
              </span>
            </div>
            {connection?.status === "connected" && (
              <CheckCircle2 color="#176444" />
            )}
          </div>
          {state.configurationError && (
            <div className="live-message">
              <strong>Falta concluir a configuração</strong>
              <p>{state.configurationError}</p>
            </div>
          )}
          {connection && (
            <dl className="live-integration-details">
              <div>
                <dt>Conta Mercado Livre</dt>
                <dd>{connection.provider_user_id}</dd>
              </div>
              <div>
                <dt>Validade do acesso atual</dt>
                <dd>{date(connection.expires_at)}</dd>
              </div>
              <div>
                <dt>Última atualização</dt>
                <dd>{date(connection.updated_at)}</dd>
              </div>
            </dl>
          )}
          <div className="live-form-actions">
            {state.configurationError ? (
              <button className="live-primary" disabled>
                <Link2 size={16} />
                Conectar Mercado Livre
              </button>
            ) : (
              <a className="live-primary" href="/api/auth/mercadolivre/connect">
                <Link2 size={16} />
                {connection ? "Reconectar" : "Conectar Mercado Livre"}
              </a>
            )}
            <button
              className="live-secondary"
              disabled={busy}
              onClick={() => refresh()}
            >
              <RefreshCw size={16} />
              Atualizar status
            </button>
            {connection?.status === "connected" && (
              <button
                className="live-secondary"
                disabled={busy}
                onClick={() => refresh(true)}
              >
                <Unplug size={16} />
                Desconectar
              </button>
            )}
          </div>
          <p className="live-muted">
            <ShieldCheck size={16} /> A autorização é renovada pelo servidor
            quando necessário. Suas credenciais ficam protegidas.
          </p>
          <p>
            Histórico da API:{" "}
            {state.historyEnabled
              ? "habilitado para as coletas que você solicitar"
              : "aguardando habilitação conforme as condições de uso"}
            . Os registros manuais já estão disponíveis.
          </p>
          <Link href="/painel/busca" className="live-card-link">
            Ir para a busca →
          </Link>
          <details>
            <summary>Configuração e registros da integração</summary>
            <p>
              Para investigar problemas, gere um relatório com testes feitos
              pelo servidor do site. Ele inclui o ID da conta e deve ser enviado
              apenas ao suporte oficial.
            </p>
            <button
              className="live-secondary"
              disabled={busy || connection?.status !== "connected"}
              onClick={downloadDiagnostic}
            >
              {busy ? "Aguarde…" : "Baixar diagnóstico para suporte"}
            </button>
            <p>Endereço de retorno cadastrado:</p>
            <code className="live-wrap">{state.redirectUri}</code>
            <p>
              Use exatamente o mesmo endereço na aplicação do Mercado Livre e no
              servidor.
            </p>
            {state.events.length ? (
              <ul>
                {state.events.map((e, i) => (
                  <li key={i}>
                    {date(e.created_at)} ·{" "}
                    {(
                      {
                        connected: "Conexão concluída",
                        refreshed: "Acesso renovado",
                        disconnected: "Conexão removida",
                        callback_failed: "Falha na autorização",
                        refresh_failed: "Falha na renovação",
                      } as Record<string, string>
                    )[e.event] ?? "Evento da integração"}
                    {e.error_code && ` · ${e.error_code}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma tentativa registrada.</p>
            )}
          </details>
          <section>
            <h3>Amazon e Magazine Luiza</h3>
            <p>
              Disponíveis para cadastro sem API. No Magazine Luiza, informe o
              preço conferido. Na Amazon, publique o produto com o botão para
              consultar preço na loja. Cole o link de afiliado oficial quando
              tiver aprovação no programa.
            </p>
            <Link href="/painel/afiliados" className="live-card-link">
              Cadastrar produtos dessas lojas →
            </Link>
          </section>
        </>
      )}
    </section>
  );
}
