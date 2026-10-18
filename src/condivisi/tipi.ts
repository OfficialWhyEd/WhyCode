/**
 * Tipi dei formati su disco di WhyCode.
 * Ogni tipo ha il suo schema zod in schemi.ts, che e' la verita' eseguibile.
 */

export interface VoceBenchmark {
  numero: number;
  cosa: string;
  esito: "ok" | "fallito" | "saltato";
  durata_ms: number;
}

export interface GrammaticaLingua {
  tipo: "tree-sitter" | "inferita" | "regole";
  pacchetto?: string;
  wasm?: string;
  bnf?: string;
}

export interface StileDefault {
  indent: number;
  nomi: string;
  virgolette: string;
}

/** Scheda Linguaggio: kb/linguaggi/<nome>/scheda.json */
export interface SchedaLingua {
  nome: string;
  versione_studiata: string;
  famiglia?: string;
  grammatica: GrammaticaLingua;
  uast_version: number;
  idiomi: string[];
  trappole: string[];
  stile_default: StileDefault;
  benchmark: VoceBenchmark[];
  confidenza?: number;
  stato: "in-prova" | "stabile";
  studiata_il: string;
  aggiornata: string;
  note?: string;
}

export interface IntentoCompreso {
  id: string;
  descrizione: string;
  esempi: string[];
}

export interface UsoCompreso {
  nome: string;
  input: string[];
  output: string;
}

/** Modello di Comprensione: kb/linguaggi/<nome>/comprensione/v<N>.json */
export interface ModelloComprensione {
  linguaggio: string;
  versione: number;
  fonte_hash: string;
  intenti: IntentoCompreso[];
  usi: UsoCompreso[];
  flusso: string[];
  effetti: string[];
  incertezze: string[];
  uast: { nodi: number; radice: string };
}

/** Riga del registro dei collassi: registro/collassi/collassi.jsonl */
export interface RigaCollasso {
  id: string;
  ora: string;
  tipo: "collasso";
  intento_hash: string;
  lingua_uscita: string;
  vincoli: Record<string, string>;
  varianti: string[];
  scelta: string;
  motivo: string;
  versione_regole: string;
  esito_verifica: string;
  durata_ms: number;
}

/** Riga del registro delle prove: registro/prove/prove.jsonl */
export interface RigaProva {
  id: string;
  ora: string;
  tipo: "prova";
  cosa: string;
  comando: string;
  esito: "ok" | "fallito" | "saltato";
  durata_ms: number;
}
