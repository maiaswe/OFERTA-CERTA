import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { DB } from "./database.ts";
const scryptAsync = promisify(scrypt);
export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function appOrigin() {
  return process.env.APP_ORIGIN ?? "http://127.0.0.1:4317";
}
export function checkOrigin(request: Request) {
  // Next.js can construct request.url with an internal localhost hostname.
  // Match the incoming Host to our fixed, configured public origin instead.
  const actualHost = request.headers.get("host") ?? new URL(request.url).host;
  const expected = new URL(appOrigin());
  if (actualHost !== expected.host)
    throw new AppError(403, "Endereço de acesso não autorizado.");
  const origin = request.headers.get("origin");
  if (origin && origin !== expected.origin)
    throw new AppError(403, "Origem não autorizada.");
  if (!["GET", "HEAD"].includes(request.method) && origin !== expected.origin)
    throw new AppError(403, "Recarregue o aplicativo antes de continuar.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError(403, "Origem não autorizada.");
}
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, hash] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || hash?.length !== 128) return false;
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
export async function rateLimit(
  db: DB,
  bucket: string,
  limit: number,
  seconds: number,
) {
  const { rows } = await db.query<{ hits: number }>(
    `INSERT INTO oc_rate_limits(bucket,hits,resets_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN oc_rate_limits.resets_at<=now() THEN 1 ELSE oc_rate_limits.hits+1 END,resets_at=CASE WHEN oc_rate_limits.resets_at<=now() THEN now()+$2*interval '1 second' ELSE oc_rate_limits.resets_at END RETURNING hits`,
    [bucket, seconds],
  );
  if (rows[0].hits > limit)
    throw new AppError(
      429,
      "Limite de tentativas atingido. Aguarde antes de tentar novamente.",
      "RATE_LIMIT",
    );
}
export function sessionToken(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)oc_session=([a-f0-9]{64})(?:;|$)/)?.[1] ?? ""
  );
}
export async function requireUser(db: DB, request: Request) {
  const token = sessionToken(request);
  if (!token)
    throw new AppError(
      401,
      "Entre na sua conta para continuar.",
      "UNAUTHENTICATED",
    );
  const { rows } = await db.query<{ id: string; username: string }>(
    "SELECT u.id,u.username FROM oc_sessions s JOIN oc_admin_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'",
    [tokenHash(token)],
  );
  if (!rows[0])
    throw new AppError(
      401,
      "Sua sessão expirou. Entre novamente.",
      "UNAUTHENTICATED",
    );
  return rows[0];
}
export async function createSession(db: DB, userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.query("DELETE FROM oc_sessions WHERE expires_at<=now()");
  await db.query(
    "INSERT INTO oc_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [tokenHash(token), userId],
  );
  return token;
}
export function sessionCookie(token: string) {
  return `oc_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 604800 : 0}${appOrigin().startsWith("https:") ? "; Secure" : ""}`;
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "Envie os dados no formato JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Dados ausentes.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 32768) {
      await reader.cancel();
      throw new AppError(413, "Dados maiores que o permitido.");
    }
    chunks.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError(400, "Dados inválidos.");
  }
}
