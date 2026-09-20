import type { DB } from "../../server/database.ts";
import { AppError } from "../../server/security.ts";
import { MercadoLivreConnector } from "./mercadolivre.ts";
import type { StoreConnector } from "./types.ts";

export function connector(
  provider: string,
  db: DB,
  userId: string,
): StoreConnector {
  if (provider === "mercadolivre") return new MercadoLivreConnector(db, userId);
  throw new AppError(
    400,
    "Esta loja ainda não tem uma integração disponível.",
    "CONNECTOR_UNAVAILABLE",
  );
}
