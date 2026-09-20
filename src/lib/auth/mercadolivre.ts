import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import type { DB } from "../../server/database.ts";
import {
  AppError,
  appOrigin,
  requireUser,
  sessionToken,
  tokenHash,
  checkOrigin,
  rateLimit,
} from "../../server/security.ts";
import { encrypt, decrypt, checkEncryptionKey } from "./crypto.ts";

export const PROVIDER = "mercadolivre";
const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
export type Fetcher = typeof fetch;
export function oauthConfig() {
  const clientId = process.env.MELI_CLIENT_ID ?? "";
  const clientSecret = process.env.MELI_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.MELI_REDIRECT_URI ??
    "https://127.0.0.1:3000/api/auth/mercadolivre/callback";
  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new AppError(
      503,
      "Confira o endereço de retorno da integração.",
      "OAUTH_CONFIG",
    );
  }
  if (
    !/^\d+$/.test(clientId) ||
    clientSecret.length < 8 ||
    /placeholder|preencha|your_|seu_/i.test(clientSecret)
  )
    throw new AppError(
      503,
      "Preencha MELI_CLIENT_ID e MELI_CLIENT_SECRET no servidor para conectar.",
      "OAUTH_CONFIG",
    );
  if (
    redirect.protocol !== "https:" ||
    redirect.pathname !== "/api/auth/mercadolivre/callback" ||
    redirect.search ||
    redirect.hash ||
    redirect.username ||
    redirect.password
  )
    throw new AppError(
      503,
      "Use o endereço HTTPS de retorno cadastrado no Mercado Livre.",
      "OAUTH_CONFIG",
    );
  checkEncryptionKey();
  return {
    clientId,
    clientSecret,
    redirectUri,
    pkce: process.env.MELI_USE_PKCE === "true",
  };
}
export function authorizationUrl(
  config: Pick<ReturnType<typeof oauthConfig>, "clientId" | "redirectUri">,
  state: string,
  verifier?: string,
) {
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  }).toString();
  if (verifier) {
    url.searchParams.set(
      "code_challenge",
      createHash("sha256").update(verifier).digest("base64url"),
    );
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}
const tokenSchema = z.object({
  access_token: z.string().min(1).max(8192),
  refresh_token: z.string().min(1).max(8192),
  token_type: z.string().regex(/^bearer$/i),
  expires_in: z.number().int().min(60).max(31536000),
  user_id: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
    .transform(String),
  scope: z.string().max(2000).default(""),
});
type Tokens = z.infer<typeof tokenSchema>;
async function tokenRequest(
  params: Record<string, string>,
  fetcher: Fetcher,
): Promise<Tokens> {
  let response: Response;
  try {
    response = await fetcher(TOKEN_URL, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AppError(
      502,
      "O Mercado Livre não respondeu à autorização. Conecte novamente.",
      "OAUTH_NETWORK",
    );
  }
  if (!response.ok)
    throw new AppError(
      502,
      "O Mercado Livre recusou a autorização. Confira a configuração e conecte novamente.",
      `OAUTH_HTTP_${response.status}`,
    );
  const parsed = tokenSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success)
    throw new AppError(
      502,
      "A autorização não retornou as credenciais esperadas. Verifique a permissão de acesso offline.",
      "OAUTH_RESPONSE",
    );
  return parsed.data;
}
export function exchangeCode(
  code: string,
  verifier?: string,
  fetcher: Fetcher = fetch,
) {
  const config = oauthConfig();
  return tokenRequest(
    {
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      ...(verifier ? { code_verifier: verifier } : {}),
    },
    fetcher,
  );
}
export function refreshTokens(refreshToken: string, fetcher: Fetcher = fetch) {
  const config = oauthConfig();
  return tokenRequest(
    {
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    },
    fetcher,
  );
}
export async function oauthLog(
  db: DB,
  event: string,
  code: string | null = null,
) {
  await db.query(
    "INSERT INTO oc_oauth_events(id,provider,event,error_code) VALUES($1,$2,$3,$4)",
    [randomUUID(), PROVIDER, event, code],
  );
  await db.query(
    "DELETE FROM oc_oauth_events WHERE created_at < now()-interval '90 days'",
  );
}
function stateCookie(value: string) {
  return `oc_meli_state=${value}; Path=/api/auth/mercadolivre/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=${value ? 600 : 0}`;
}
function redirect(path: string, cookie?: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}
export async function connectOAuth(db: DB, request: Request) {
  checkOrigin(request);
  const user = await requireUser(db, request);
  await rateLimit(db, `oauth:${user.id}`, 10, 600);
  const config = oauthConfig();
  if (new URL(config.redirectUri).origin !== new URL(appOrigin()).origin)
    throw new AppError(
      503,
      "Abra o painel no mesmo endereço HTTPS configurado para o retorno do Mercado Livre.",
      "OAUTH_ORIGIN",
    );
  const state = randomBytes(32).toString("hex");
  const verifier = config.pkce
    ? randomBytes(48).toString("base64url")
    : undefined;
  await db.transaction(async (tx) => {
    await tx.query("SELECT id FROM oc_admin_users WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    await tx.query(
      "DELETE FROM oc_oauth_states WHERE user_id=$1 OR expires_at<=now()",
      [user.id],
    );
    await tx.query(
      "INSERT INTO oc_oauth_states(state_hash,user_id,session_hash,code_verifier,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
      [
        tokenHash(state),
        user.id,
        tokenHash(sessionToken(request)),
        verifier ? encrypt(verifier, `state:${tokenHash(state)}`) : null,
      ],
    );
  });
  return redirect(
    authorizationUrl(config, state, verifier),
    stateCookie(state),
  );
}
async function saveTokens(db: DB, userId: string, tokens: Tokens) {
  const context = `${PROVIDER}:${userId}`;
  await db.query(
    `INSERT INTO oc_oauth_connections(id,provider,user_id,provider_user_id,access_token,refresh_token,token_type,scope,expires_at,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+$9*interval '1 second','connected')
    ON CONFLICT(provider,user_id) DO UPDATE SET provider_user_id=excluded.provider_user_id,access_token=excluded.access_token,
    refresh_token=excluded.refresh_token,token_type=excluded.token_type,scope=excluded.scope,expires_at=excluded.expires_at,
    status='connected',last_error=NULL,updated_at=now(),generation=oc_oauth_connections.generation+1`,
    [
      randomUUID(),
      PROVIDER,
      userId,
      tokens.user_id,
      encrypt(tokens.access_token, `${context}:access`),
      encrypt(tokens.refresh_token, `${context}:refresh`),
      tokens.token_type,
      tokens.scope,
      tokens.expires_in,
    ],
  );
}
export async function callbackOAuth(
  db: DB,
  request: Request,
  fetcher: Fetcher = fetch,
) {
  const target = new URL("/painel/integracoes", appOrigin());
  try {
    const url = new URL(request.url);
    const config = oauthConfig();
    const host = request.headers.get("host") ?? url.host;
    if (host !== new URL(config.redirectUri).host)
      throw new AppError(400, "Retorno inválido.", "OAUTH_STATE");
    const state = url.searchParams.get("state") ?? "";
    const cookie =
      request.headers
        .get("cookie")
        ?.match(/(?:^|;\s*)oc_meli_state=([a-f0-9]{64})(?:;|$)/)?.[1] ?? "";
    if (
      !/^[a-f0-9]{64}$/.test(state) ||
      cookie.length !== state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
    )
      throw new AppError(
        400,
        "Autorização expirada ou inválida. Conecte novamente.",
        "OAUTH_STATE",
      );
    const owner = (
      await db.query<{ user_id: string }>(
        "SELECT user_id FROM oc_oauth_states WHERE state_hash=$1",
        [tokenHash(state)],
      )
    ).rows[0];
    if (!owner)
      throw new AppError(
        400,
        "Autorização expirada ou já utilizada.",
        "OAUTH_STATE",
      );
    const result = await db.transaction(async (tx) => {
      // Serialize connect/callback/disconnect so an in-flight callback cannot restore a disconnected account.
      await tx.query("SELECT id FROM oc_admin_users WHERE id=$1 FOR UPDATE", [
        owner.user_id,
      ]);
      const pending = (
        await tx.query<{ user_id: string; code_verifier: string | null }>(
          `DELETE FROM oc_oauth_states WHERE state_hash=$1 AND expires_at>now() AND EXISTS
      (SELECT 1 FROM oc_sessions s JOIN oc_admin_users u ON u.id=s.user_id WHERE s.token_hash=oc_oauth_states.session_hash AND s.expires_at>now() AND u.status='active')
      RETURNING user_id,code_verifier`,
          [tokenHash(state)],
        )
      ).rows[0];
      if (!pending) return "OAUTH_STATE";
      if (url.searchParams.has("error")) return "OAUTH_DENIED";
      const code = url.searchParams.get("code") ?? "";
      if (!code || code.length > 2048) return "OAUTH_CODE";
      const verifier = pending.code_verifier
        ? decrypt(pending.code_verifier, `state:${tokenHash(state)}`)
        : undefined;
      let tokens: Tokens;
      try {
        tokens = await exchangeCode(code, verifier, fetcher);
      } catch (error) {
        return error instanceof AppError ? error.code : "OAUTH_INTERNAL";
      }
      await saveTokens(tx, pending.user_id, tokens);
      await oauthLog(tx, "connected");
      return "connected";
    });
    if (result !== "connected") await oauthLog(db, "callback_failed", result);
    target.searchParams.set("oauth", result);
  } catch (error) {
    const code = error instanceof AppError ? error.code : "OAUTH_INTERNAL";
    await oauthLog(db, "callback_failed", code).catch(() => {});
    target.searchParams.set("oauth", code);
  }
  return redirect(target.toString(), stateCookie(""));
}
type Connection = {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string;
  provider_user_id: string;
  status: string;
  generation: number;
};
export async function accessToken(
  db: DB,
  userId: string,
  fetcher: Fetcher = fetch,
  rejectedToken?: string,
) {
  const result = await db.transaction(async (tx) => {
    const row = (
      await tx.query<Connection>(
        "SELECT * FROM oc_oauth_connections WHERE provider=$1 AND user_id=$2 FOR UPDATE",
        [PROVIDER, userId],
      )
    ).rows[0];
    if (
      !row ||
      row.status !== "connected" ||
      !row.access_token ||
      !row.refresh_token
    )
      return null;
    const context = `${PROVIDER}:${userId}`;
    try {
      const current = decrypt(row.access_token, `${context}:access`);
      if (
        Date.parse(row.expires_at) > Date.now() + 120000 &&
        (!rejectedToken || current !== rejectedToken)
      )
        return current;
      const tokens = await refreshTokens(
        decrypt(row.refresh_token, `${context}:refresh`),
        fetcher,
      );
      if (tokens.user_id !== row.provider_user_id)
        throw new AppError(502, "Conta divergente.", "OAUTH_ACCOUNT");
      await saveTokens(tx, userId, tokens);
      await oauthLog(tx, "refreshed");
      return tokens.access_token;
    } catch (error) {
      const code = error instanceof AppError ? error.code : "OAUTH_REFRESH";
      // Commit invalidation before throwing; throwing inside the transaction would restore invalid tokens.
      await tx.query(
        "UPDATE oc_oauth_connections SET status='invalid',access_token=NULL,refresh_token=NULL,last_error=$3,updated_at=now(),generation=generation+1 WHERE provider=$1 AND user_id=$2",
        [PROVIDER, userId, code],
      );
      await oauthLog(tx, "refresh_failed", code);
      return null;
    }
  });
  if (!result)
    throw new AppError(
      401,
      "Reconecte sua conta do Mercado Livre na área de integrações.",
      "MELI_RECONNECT",
    );
  return result;
}
export async function disconnectOAuth(db: DB, userId: string) {
  await db.transaction(async (tx) => {
    await tx.query("SELECT id FROM oc_admin_users WHERE id=$1 FOR UPDATE", [
      userId,
    ]);
    await tx.query(
      "UPDATE oc_oauth_connections SET access_token=NULL,refresh_token=NULL,status='disconnected',last_error=NULL,updated_at=now(),generation=generation+1 WHERE provider=$1 AND user_id=$2",
      [PROVIDER, userId],
    );
    await tx.query("DELETE FROM oc_oauth_states WHERE user_id=$1", [userId]);
    await tx.query("DELETE FROM oc_cache WHERE cache_key LIKE 'meli:%'");
    await oauthLog(tx, "disconnected");
  });
}
export async function integrationStatus(db: DB, userId: string) {
  const connection =
    (
      await db.query(
        "SELECT provider,provider_user_id,token_type,scope,expires_at,created_at,updated_at,status,last_error FROM oc_oauth_connections WHERE provider=$1 AND user_id=$2",
        [PROVIDER, userId],
      )
    ).rows[0] ?? null;
  const events = (
    await db.query(
      "SELECT event,error_code,created_at FROM oc_oauth_events WHERE provider=$1 ORDER BY created_at DESC LIMIT 20",
      [PROVIDER],
    )
  ).rows;
  let configurationError: string | null = null;
  try {
    const config = oauthConfig();
    if (new URL(config.redirectUri).origin !== new URL(appOrigin()).origin)
      configurationError =
        "O painel precisa usar o mesmo endereço HTTPS cadastrado no Mercado Livre.";
  } catch (e) {
    configurationError =
      e instanceof AppError ? e.message : "Confira a configuração do servidor.";
  }
  return {
    connection,
    events,
    configurationError,
    redirectUri:
      process.env.MELI_REDIRECT_URI ??
      "https://127.0.0.1:3000/api/auth/mercadolivre/callback",
    historyEnabled: process.env.MELI_HISTORY_ENABLED === "true",
  };
}
