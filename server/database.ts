import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

export type DB = {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close?: () => Promise<void>;
};
export async function createDatabase(dataDir?: string): Promise<DB> {
  let db: DB;
  const externalUrl =
    !dataDir && process.env.DATABASE_MODE !== "local"
      ? process.env.DATABASE_URL
      : undefined;
  if (externalUrl) {
    const url = new URL(externalUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
      throw new Error("Invalid database configuration");
    const ca = url.hostname.endsWith(".pooler.supabase.com")
      ? await readFile(
          path.join(process.cwd(), "db/certs/supabase-ca.crt"),
          "utf8",
        )
      : undefined;
    const pool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true, ca },
      max: 3,
      connectionTimeoutMillis: 8000,
      statement_timeout: 15000,
    });
    db = {
      query: async <T>(sql: string, params: unknown[] = []) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      exec: (sql) => pool.query(sql),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const scoped: DB = {
            query: async <T>(s: string, p: unknown[] = []) => ({
              rows: (await client.query(s, p)).rows as T[],
            }),
            exec: (s) => client.query(s),
            transaction: async () => {
              throw new Error("Nested transaction not supported");
            },
          };
          const result = await fn(scoped);
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
    };
    db.close = () => pool.end();
  } else {
    if (process.env.VERCEL && !dataDir)
      throw new Error(
        "Configure a durable PostgreSQL database before deploying",
      );
    const directory =
      dataDir ??
      process.env.LOCAL_DATA_DIR ??
      path.join(process.cwd(), ".local-data", "postgres");
    if (directory !== "memory://") await mkdir(directory, { recursive: true });
    const pg = await PGlite.create(directory);
    const wrap = (client: Pick<PGlite, "query" | "exec">): DB => ({
      query: async <T>(sql: string, params: unknown[] = []) => ({
        rows: (await client.query<T>(sql, params)).rows,
      }),
      exec: (sql) => client.exec(sql),
      transaction: async (fn) => pg.transaction((tx) => fn(wrap(tx))),
    });
    db = wrap(pg);
    db.close = () => pg.close();
  }
  if (!externalUrl)
    await db.exec(
      "CREATE TABLE IF NOT EXISTS oc_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
  const { rows } = await db.query(
    "SELECT version FROM oc_migrations WHERE version=1",
  );
  if (!rows.length) {
    if (externalUrl) throw new Error("Database migration required");
    const sql = await readFile(
      path.join(process.cwd(), "db", "migrations", "001_core.sql"),
      "utf8",
    );
    await db.transaction((tx) => tx.exec(sql));
  }
  const v2 = await db.query(
    "SELECT version FROM oc_migrations WHERE version=2",
  );
  if (!v2.rows.length) {
    if (externalUrl) throw new Error("Database migration 2 required");
    const sql = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260911155101_oauth_connectors.sql",
      ),
      "utf8",
    );
    await db.transaction((tx) => tx.exec(sql));
  }
  const v3 = await db.query(
    "SELECT version FROM oc_migrations WHERE version=3",
  );
  if (!v3.rows.length) {
    if (externalUrl) throw new Error("Database migration 3 required");
    const sql = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260915215837_affiliate_offers.sql",
      ),
      "utf8",
    );
    await db.transaction((tx) => tx.exec(sql));
  }
  const v4 = await db.query(
    "SELECT version FROM oc_migrations WHERE version=4",
  );
  if (!v4.rows.length) {
    if (externalUrl) throw new Error("Database migration 4 required");
    const sql = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260916102440_normal_product_links.sql",
      ),
      "utf8",
    );
    await db.transaction((tx) => tx.exec(sql));
  }
  const v5 = await db.query(
    "SELECT version FROM oc_migrations WHERE version=5",
  );
  if (!v5.rows.length) {
    if (externalUrl) throw new Error("Database migration 5 required");
    const sql = await readFile(
      path.join(
        process.cwd(),
        "supabase/migrations/20260917155043_multi_store_curated_offers.sql",
      ),
      "utf8",
    );
    await db.transaction((tx) => tx.exec(sql));
  }
  return db;
}
const globalDb = globalThis as typeof globalThis & {
  ofertaDatabase?: Promise<DB>;
};
export function database() {
  return (globalDb.ofertaDatabase ??= createDatabase().catch((error) => {
    globalDb.ofertaDatabase = undefined;
    throw error;
  }));
}
