import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database, type DB } from "./database.ts";
import {
  AppError,
  checkOrigin,
  appOrigin,
  readBody,
  rateLimit,
  requireUser,
  passwordHash,
  verifyPassword,
  createSession,
  sessionCookie,
  sessionToken,
  tokenHash,
} from "./security.ts";
import {
  getData,
  addProduct,
  recordObservation,
  setAlert,
  setFavorite,
  exportData,
} from "./repository.ts";
import { productInput, observationInput } from "../domain/live.ts";
import { loginInput } from "../lib/auth/forms.ts";

const reply = (data: unknown, status = 200, cookie?: string) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
export async function handleApi(
  request: Request,
  providedDb?: DB,
): Promise<Response> {
  try {
    checkOrigin(request);
    const db = providedDb ?? (await database());
    const action = new URL(request.url).searchParams.get("action") ?? "status";
    if (request.method === "GET" && action === "status") {
      const setup =
        (await db.query("SELECT id FROM oc_admin_users LIMIT 1")).rows
          .length === 0;
      let user = null;
      try {
        user = await requireUser(db, request);
      } catch (e) {
        if (!(e instanceof AppError) || e.status !== 401) throw e;
      }
      return reply({
        setupRequired: setup,
        user,
        storage:
          process.env.DATABASE_URL && process.env.DATABASE_MODE !== "local"
            ? "cloud"
            : "local",
        automaticSearch: false,
        setupRequiresToken: !["127.0.0.1", "localhost", "[::1]"].includes(
          new URL(appOrigin()).hostname,
        ),
      });
    }
    if (request.method === "POST" && ["setup", "login"].includes(action)) {
      await rateLimit(db, "login-global", 15, 900);
      const input = loginInput.parse(await readBody(request));
      const username = input.username.toLowerCase();
      if (action === "setup") {
        if (
          !["127.0.0.1", "localhost", "[::1]"].includes(
            new URL(appOrigin()).hostname,
          )
        ) {
          const expected = process.env.ADMIN_BOOTSTRAP_TOKEN ?? "";
          const actual = input.bootstrapToken ?? "";
          if (
            expected.length < 32 ||
            actual.length !== expected.length ||
            !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
          )
            throw new AppError(
              403,
              "A configuração inicial precisa ser concluída pelo responsável pelo aplicativo.",
            );
        }
        const hash = await passwordHash(input.password);
        const id = randomUUID();
        const session = await db.transaction(async (tx) => {
          const existing = await tx.query(
            "SELECT id FROM oc_admin_users LIMIT 1",
          );
          if (existing.rows.length)
            throw new AppError(
              409,
              "A conta principal já foi criada. Entre com seu usuário e senha.",
            );
          await tx.query(
            "INSERT INTO oc_admin_users(id,username,password_hash) VALUES($1,$2,$3)",
            [id, username, hash],
          );
          return createSession(tx, id);
        });
        return reply({ user: { id, username } }, 201, sessionCookie(session));
      }
      const account = (
        await db.query<{ id: string; username: string; password_hash: string }>(
          "SELECT id,username,password_hash FROM oc_admin_users WHERE username=$1 AND status='active'",
          [username],
        )
      ).rows[0];
      // Perform the same expensive work for unknown usernames.
      const valid = await verifyPassword(
        input.password,
        account?.password_hash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`,
      );
      if (!account || !valid)
        throw new AppError(401, "Usuário ou senha incorretos.");
      return reply(
        { user: { id: account.id, username: account.username } },
        200,
        sessionCookie(await createSession(db, account.id)),
      );
    }
    const user = await requireUser(db, request);
    if (request.method === "GET") {
      if (action === "data") return reply(await getData(db, user.id));
      if (action === "export")
        return new Response(JSON.stringify(await exportData(db), null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="oferta-certa-dados.json"',
            "Cache-Control": "no-store",
          },
        });
    }
    if (request.method !== "POST")
      throw new AppError(405, "Operação não permitida.");
    await rateLimit(db, `write:${user.id}`, 120, 60);
    if (action === "logout") {
      await db.query("DELETE FROM oc_sessions WHERE token_hash=$1", [
        tokenHash(sessionToken(request)),
      ]);
      return reply({ ok: true }, 200, sessionCookie(""));
    }
    const body = await readBody(request);
    if (action === "product")
      return reply({ id: await addProduct(db, productInput.parse(body)) }, 201);
    if (action === "observation")
      return reply(
        await recordObservation(db, observationInput.parse(body)),
        201,
      );
    if (action === "favorite") {
      const input = z
        .object({ productId: z.string().uuid(), saved: z.boolean() })
        .strict()
        .parse(body);
      await setFavorite(db, user.id, input.productId, input.saved);
      return reply({ ok: true });
    }
    if (action === "alert") {
      const input = z
        .object({
          productId: z.string().uuid(),
          target: z.number().int().positive().max(100000000),
        })
        .strict()
        .parse(body);
      await setAlert(db, user.id, input.productId, input.target);
      return reply({ ok: true });
    }
    if (action === "read-notifications") {
      await db.query(
        "UPDATE oc_notifications SET read_at=now() WHERE alert_id IN (SELECT id FROM oc_alerts WHERE user_id=$1)",
        [user.id],
      );
      return reply({ ok: true });
    }
    throw new AppError(404, "Operação não encontrada.");
  } catch (error) {
    if (error instanceof AppError)
      return reply({ error: error.message, code: error.code }, error.status);
    if (error instanceof z.ZodError)
      return reply(
        {
          error: error.issues[0]?.message ?? "Confira os dados informados.",
          code: "INVALID_DATA",
        },
        400,
      );
    const code = (error as { code?: string })?.code;
    if (code === "23505")
      return reply(
        {
          error: "Este registro já existe. Atualize a página para consultar.",
          code: "CONFLICT",
        },
        409,
      );
    if (code === "23503")
      return reply(
        {
          error: "O produto selecionado não existe. Atualize a página.",
          code: "INVALID_PRODUCT",
        },
        400,
      );
    console.error("Oferta Certa API failed", { code: code ?? "INTERNAL" });
    return reply(
      {
        error:
          "Não foi possível concluir agora. Seus dados enviados não foram confirmados. Tente novamente.",
        code: "INTERNAL",
      },
      500,
    );
  }
}
