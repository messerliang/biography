const crypto = require("crypto");

function getEncryptionKey() {
  const raw = process.env.PII_ENCRYPTION_KEY || process.env.DEEPSEEK_API_KEY || "";
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptText(plainText) {
  const key = getEncryptionKey();
  if (!key || !plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

module.exports = { encryptText, sha256 };
