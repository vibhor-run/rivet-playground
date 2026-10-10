import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SignJWT } from "jose";

const directory = new URL("../../../../.local/", import.meta.url);
const keyFile = new URL("auth-signing-key", directory);

export async function initializeDemoKey(): Promise<void> {
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(keyFile, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
  }
}

export async function readSigningKey(): Promise<Uint8Array> {
  return readFile(keyFile);
}

export async function issueDemoToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("local-learning-backend")
    .setAudience("rivet-playground")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(await readSigningKey());
}
