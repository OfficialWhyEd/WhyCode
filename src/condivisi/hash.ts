import { createHash } from "node:crypto";

/**
 * Sha256 di una stringa, forma esadecimale minuscola.
 * Stessa stringa, stesso hash, in ogni run e su ogni macchina.
 */
export function sha256(testo: string): string {
  return createHash("sha256").update(testo, "utf8").digest("hex");
}
