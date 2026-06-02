import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.APP_SECRET ?? "hatchery-dev-secret";
  return createHash("sha256").update(secret).digest();
}

/** 平文を AES-256-GCM で暗号化して "iv:authTag:ciphertext"（base64）形式の文字列を返す。 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ":",
  );
}

/** encrypt で生成した文字列を復号して元の平文を返す。不正な形式や改竄があれば例外を投げる。 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivB64, authTagB64, encryptedB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64!, "base64");
  const authTag = Buffer.from(authTagB64!, "base64");
  const encrypted = Buffer.from(encryptedB64!, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/** API キーをマスク表示する（先頭 11 文字 + ****）。空文字列の場合は null を返す。 */
export function maskApiKey(value: string): string | null {
  if (!value) return null;
  return value.length > 11 ? value.slice(0, 11) + "****" : value.slice(0, 3) + "****";
}
