import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

let text = await readFile(".env.local", "utf8").catch(() => "");
const values = {
  MELI_CLIENT_ID: "7046681029899344",
  MELI_CLIENT_SECRET: "PREENCHA_MANUALMENTE",
  MELI_REDIRECT_URI: "https://127.0.0.1:3000/api/auth/mercadolivre/callback",
  MELI_USE_PKCE: "false",
  MELI_HISTORY_ENABLED: "false",
  OAUTH_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};
for (const [name, value] of Object.entries(values)) {
  if (!new RegExp(`^${name}=.+$`, "m").test(text)) {
    text = text.replace(new RegExp(`^${name}=.*(?:\r?\n|$)`, "m"), "");
    text += `\n${name}=${value}\n`;
  }
}
await writeFile(".env.local", text, { mode: 0o600 });
console.log(
  "Configuração local preparada. Preencha MELI_CLIENT_SECRET no arquivo privado .env.local. Nenhuma credencial foi exibida.",
);
