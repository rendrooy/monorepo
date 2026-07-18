import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const MASK_PREFIX = "*".repeat(12);

const readBase64Key = (
  name: "NIK_ENCRYPTION_KEY" | "NIK_LOOKUP_KEY",
  exactLength?: number,
) => {
  const encoded = process.env[name];
  if (!encoded) throw new Error(`${name} wajib dikonfigurasi`);
  const key = Buffer.from(encoded, "base64");
  if (
    (exactLength && key.length !== exactLength) ||
    (!exactLength && key.length < 32)
  ) {
    throw new Error(`${name} tidak valid`);
  }
  return key;
};

export const normalizeNik = (value?: string | null) => {
  const nik = value?.trim() || "";
  if (!/^\d{16}$/.test(nik)) throw new Error("NIK harus terdiri dari 16 digit");
  return nik;
};

export const isMaskedNik = (value?: string | null) =>
  /^\*{12}\d{4}$/.test(value || "");
export const maskNik = (last4?: string | null) =>
  last4 ? `${MASK_PREFIX}${last4}` : null;

export const createNikLookupHash = (value: string) =>
  createHmac("sha256", readBase64Key("NIK_LOOKUP_KEY"))
    .update(normalizeNik(value))
    .digest("hex");

export const encryptNik = (value: string) => {
  const nik = normalizeNik(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    readBase64Key("NIK_ENCRYPTION_KEY", 32),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(nik, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    lookupHash: createNikLookupHash(nik),
    last4: nik.slice(-4),
    keyVersion: Number(process.env.NIK_KEY_VERSION || 1),
  };
};

export const decryptNik = (encrypted: {
  ciphertext: string;
  iv: string;
  authTag: string;
}) => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    readBase64Key("NIK_ENCRYPTION_KEY", 32),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

export const toNikStorage = (value: string) => {
  const encrypted = encryptNik(value);
  return {
    nik_ciphertext: encrypted.ciphertext,
    nik_iv: encrypted.iv,
    nik_auth_tag: encrypted.authTag,
    nik_lookup_hash: encrypted.lookupHash,
    nik_last4: encrypted.last4,
    nik_key_version: encrypted.keyVersion,
  };
};
