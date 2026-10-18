/**
 * Schede dei linguaggi: lettura e scrittura in kb/linguaggi/<nome>/scheda.json.
 * Fonte: docs/SPEC-05-MEMORIA.md e Appendice A del SPEC-09.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SchedaLingua } from "../condivisi/tipi.js";
import { SchedaLinguaSchema } from "../condivisi/schemi.js";
import { ErroreWhyCode } from "../condivisi/errori.js";
import { aggiungiRigaJsonl, assicuraCartella, leggiJson, scriviJsonAtomico } from "../condivisi/json.js";
import { oraIso } from "../condivisi/tempo.js";

export function cartellaLingua(kbDir: string, lingua: string): string {
  return join(kbDir, "linguaggi", lingua);
}

export function percorsoScheda(kbDir: string, lingua: string): string {
  return join(cartellaLingua(kbDir, lingua), "scheda.json");
}

/** Ritorna null se la scheda non c'e': non e' un errore, e' solo "non lo conosco ancora". */
export function caricaScheda(kbDir: string, lingua: string): SchedaLingua | null {
  const percorso = percorsoScheda(kbDir, lingua);
  if (!existsSync(percorso)) {
    return null;
  }
  return leggiJson(percorso, SchedaLinguaSchema);
}

/** Salva la scheda con backup automatico e una riga nello storico. Rifiuta schede non valide. */
export function salvaScheda(kbDir: string, scheda: SchedaLingua): void {
  const esito = SchedaLinguaSchema.safeParse(scheda);
  if (!esito.success) {
    const primo = esito.error.issues[0];
    const campo = primo.path.join(".") || "(radice)";
    throw new ErroreWhyCode("E-SCHEMA", `Scheda non valida, campo "${campo}": ${primo.message}`, {
      causa: esito.error,
      rimediabile: true,
    });
  }
  const valida = esito.data;
  const cartella = cartellaLingua(kbDir, valida.nome);
  assicuraCartella(cartella);
  scriviJsonAtomico(percorsoScheda(kbDir, valida.nome), valida);
  aggiungiRigaJsonl(join(cartella, "scheda.storico.jsonl"), { ora: oraIso(), azione: "salvata", versione: valida.versione_studiata });
}

export function elencaSchede(kbDir: string): string[] {
  const cartella = join(kbDir, "linguaggi");
  if (!existsSync(cartella)) {
    return [];
  }
  return readdirSync(cartella, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(cartella, d.name, "scheda.json")))
    .map((d) => d.name)
    .sort();
}
