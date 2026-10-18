import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, appendFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import type { ZodType } from "zod";
import { ErroreWhyCode } from "./errori.js";
import { oraIso } from "./tempo.js";

/** Crea la cartella (e le intermedie) se non esiste. */
export function assicuraCartella(percorsoDir: string): void {
  try {
    mkdirSync(percorsoDir, { recursive: true });
  } catch (causa) {
    throw new ErroreWhyCode("E-CARTELLA", `Non riesco a creare la cartella: ${percorsoDir}`, { causa });
  }
}

/** Legge un JSON e lo valida. Errore chiaro se manca, se non e' JSON o se non passa lo schema. */
export function leggiJson<T>(percorso: string, schema: ZodType<T>): T {
  if (!existsSync(percorso)) {
    throw new ErroreWhyCode("E-JSON-MANCANTE", `File non trovato: ${percorso}`, { rimediabile: true });
  }
  let dati: unknown;
  try {
    dati = JSON.parse(readFileSync(percorso, "utf8"));
  } catch (causa) {
    throw new ErroreWhyCode("E-JSON-INVALIDO", `JSON non valido in ${percorso}`, { causa });
  }
  const esito = schema.safeParse(dati);
  if (!esito.success) {
    const primo = esito.error.issues[0];
    const campo = primo.path.join(".") || "(radice)";
    throw new ErroreWhyCode(
      "E-SCHEMA",
      `Schema non rispettato in ${percorso}, campo "${campo}": ${primo.message}`,
      { causa: esito.error, rimediabile: true },
    );
  }
  return esito.data;
}

/**
 * Scrittura atomica: file temporaneo nella stessa cartella, poi rinomina.
 * Se il file esiste, prima si salva un backup .bak-<data>, creato una volta sola per giorno.
 */
export function scriviJsonAtomico(percorso: string, dati: unknown): void {
  assicuraCartella(dirname(percorso));
  if (existsSync(percorso)) {
    const data = oraIso().slice(0, 10);
    const backup = `${percorso}.bak-${data}`;
    if (!existsSync(backup)) {
      copyFileSync(percorso, backup);
    }
  }
  const temporaneo = `${percorso}.tmp-${process.pid}`;
  try {
    writeFileSync(temporaneo, JSON.stringify(dati, null, 2), "utf8");
    renameSync(temporaneo, percorso);
  } catch (causa) {
    if (existsSync(temporaneo)) {
      rmSync(temporaneo, { force: true });
    }
    throw new ErroreWhyCode("E-SCRITTURA", `Scrittura fallita: ${percorso}`, { causa });
  }
}

/** Aggiunge una riga JSONL (append puro, mai riscrittura). */
export function aggiungiRigaJsonl(percorso: string, dati: unknown): void {
  assicuraCartella(dirname(percorso));
  appendFileSync(percorso, JSON.stringify(dati) + "\n", "utf8");
}

/** Legge tutte le righe JSONL non vuote e le valida una per una. */
export function leggiRigheJsonl<T>(percorso: string, schema: ZodType<T>): T[] {
  if (!existsSync(percorso)) {
    return [];
  }
  const testo = readFileSync(percorso, "utf8");
  const righe = testo.split("\n").filter((r) => r.trim().length > 0);
  return righe.map((riga, indice) => {
    let dati: unknown;
    try {
      dati = JSON.parse(riga);
    } catch (causa) {
      throw new ErroreWhyCode("E-JSONL-INVALIDO", `Riga ${indice + 1} non JSON in ${percorso}`, { causa });
    }
    const esito = schema.safeParse(dati);
    if (!esito.success) {
      const primo = esito.error.issues[0];
      throw new ErroreWhyCode(
        "E-JSONL-SCHEMA",
        `Riga ${indice + 1} di ${percorso} non valida, campo "${primo.path.join(".") || "(radice)"}": ${primo.message}`,
        { causa: esito.error },
      );
    }
    return esito.data;
  });
}
