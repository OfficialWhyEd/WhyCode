/**
 * Controllo degli import fra file .why: niente cicli (K-117).
 * Fonte: docs/SPEC-01-KERNEL.md, sezione 5 (unita' e moduli).
 * Visita iterativa: una catena lunga a piacere non fa esplodere la pila.
 */
import type { ErroreKernel } from "./ast.js";
import { parse } from "./parser.js";

/** Legge un file .why dal percorso richiesto; null se non esiste. */
export interface LettoreFile {
  (percorso: string): string | null;
}

interface Importato {
  da: string;
  riga: number;
  colonna: number;
}

/** Gli import dichiarati in un file; null se il file non c'e' o non si lascia parsare. */
function importaDi(percorso: string, leggi: LettoreFile): Importato[] | null {
  const testo = leggi(percorso);
  if (testo === null) {
    return null;
  }
  const esito = parse(testo);
  if (!esito.ok) {
    return null;
  }
  const fuori: Importato[] = [];
  for (const b of esito.ast.blocchi) {
    if (b.genere === "importa") {
      fuori.push({ da: b.da, riga: b.pos.riga, colonna: b.pos.colonna });
    }
  }
  return fuori;
}

/**
 * Segue gli import a partire dal file radice e segnala i cicli trovati.
 * Il percorso di ogni file e' la chiave usata dal lettore: chi chiama decide come risolverla.
 */
export function trovaCicliImport(radice: string, leggi: LettoreFile): ErroreKernel[] {
  const errori: ErroreKernel[] = [];
  const chiusi = new Set<string>();
  const radiceImport = importaDi(radice, leggi);
  if (radiceImport === null) {
    return errori;
  }

  const pila: string[] = [radice];
  const lavoro: { import: Importato[]; k: number }[] = [{ import: radiceImport, k: 0 }];

  while (lavoro.length > 0) {
    const cima = lavoro[lavoro.length - 1];
    if (cima.k >= cima.import.length) {
      chiusi.add(pila[pila.length - 1]);
      pila.pop();
      lavoro.pop();
      continue;
    }
    const voce = cima.import[cima.k];
    cima.k++;
    if (chiusi.has(voce.da)) {
      continue;
    }
    const inizio = pila.indexOf(voce.da);
    if (inizio !== -1) {
      const ciclo = [...pila.slice(inizio), voce.da];
      errori.push({
        codice: "K-117",
        messaggio: `Ciclo di import: ${ciclo.join(" -> ")}`,
        riga: voce.riga,
        colonna: voce.colonna,
        rimedio: "rompi il ciclo: sposta il nome condiviso in un file comune",
      });
      continue;
    }
    const lista = importaDi(voce.da, leggi);
    if (lista === null) {
      chiusi.add(voce.da);
      continue;
    }
    pila.push(voce.da);
    lavoro.push({ import: lista, k: 0 });
  }
  return errori;
}
