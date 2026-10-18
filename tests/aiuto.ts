/**
 * Aiuti comuni per i test: cartelle temporanee usa e getta e radice del progetto.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Crea una cartella temporanea nuova, sotto la cartella temporanea di sistema. */
export function cartellaTemporanea(prefisso = "whycode-prova-"): string {
  return mkdtempSync(join(tmpdir(), prefisso));
}

/** Cancella una cartella temporanea e tutto il suo contenuto. */
export function pulisci(cartella: string): void {
  rmSync(cartella, { recursive: true, force: true });
}

/** La cartella radice del progetto WhyCode (quella con package.json). */
export function radiceProgetto(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}
