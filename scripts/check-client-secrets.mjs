import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const envText = await readFile(".env.local", "utf8").catch(() => "");
const sensitive = [];
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(
    /^(DATABASE_URL|MELI_CLIENT_SECRET|OAUTH_ENCRYPTION_KEY|ADMIN_BOOTSTRAP_TOKEN|SUPABASE_SERVICE_ROLE_KEY)=(.+)$/,
  );
  if (!match) continue;
  const value = match[2].replace(/^["']|["']$/g, "");
  if (/PREENCHA|PLACEHOLDER/i.test(value)) continue;
  sensitive.push(value);
  if (match[1] === "DATABASE_URL") {
    const password = decodeURIComponent(new URL(value).password);
    if (password) sensitive.push(password);
  }
}
async function scan(directory) {
  let count = 0;
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) count += await scan(file);
    else if (/\.(?:js|css|json|map)$/.test(file)) {
      const content = await readFile(file, "utf8");
      if (
        sensitive.some((value) => value.length >= 8 && content.includes(value))
      )
        throw new Error(
          `Private configuration found in client asset: ${item.name}`,
        );
      count++;
    }
  }
  return count;
}
const checked = await scan(".next/static");
console.log(
  `Verificados ${checked} arquivos do navegador: nenhuma credencial privada encontrada.`,
);
