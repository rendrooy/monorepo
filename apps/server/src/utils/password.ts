import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

    return `${HASH_PREFIX}:${salt}:${hash}`;
};

export const isPasswordHashed = (password?: string | null) =>
    Boolean(password?.startsWith(`${HASH_PREFIX}:`));

export const verifyPassword = (password?: string | null, storedPassword?: string | null) => {
    if (!password || !storedPassword) {
        return false;
    }

    if (!isPasswordHashed(storedPassword)) {
        return password === storedPassword;
    }

    const [, salt, hash] = storedPassword.split(":");
    if (!salt || !hash) {
        return false;
    }

    const expectedHash = Buffer.from(hash, "hex");
    const actualHash = scryptSync(password, salt, KEY_LENGTH);

    if (expectedHash.length !== actualHash.length) {
        return false;
    }

    return timingSafeEqual(expectedHash, actualHash);
};
