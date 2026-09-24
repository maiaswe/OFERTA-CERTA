import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "../../server/security.ts";

function key() {
  const value = process.env.OAUTH_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) {
    throw new AppError(
      503,
      "Configure a chave de proteção da integração no servidor.",
      "OAUTH_CONFIG",
    );
  }
  return key;
}
export function checkEncryptionKey() {
  key();
}
export function encrypt(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function decrypt(value: string, context: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !data)
    throw new Error("Invalid encrypted credential");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(data, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
