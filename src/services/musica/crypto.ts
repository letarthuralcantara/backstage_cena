import crypto from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(): Buffer {
  const configured = process.env.MUSICA_TOKEN_KEY;
  if (!configured) throw new Error("MUSICA_TOKEN_KEY não configurada.");
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== configured.replace(/=+$/, "")) {
    throw new Error("MUSICA_TOKEN_KEY deve ser uma chave base64 de 32 bytes.");
  }
  return key;
}

export function cifrarToken(token: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const cifrado = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decifrarToken(valor: string): string {
  const [version, ivTexto, tagTexto, cifradoTexto, ...resto] = valor.split(".");
  if (version !== VERSION || !ivTexto || !tagTexto || !cifradoTexto || resto.length) {
    throw new Error("Token de música cifrado inválido.");
  }
  const iv = Buffer.from(ivTexto, "base64url");
  const tag = Buffer.from(tagTexto, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Token de música cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(cifradoTexto, "base64url")), decipher.final()]).toString("utf8");
}
