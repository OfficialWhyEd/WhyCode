/**
 * Vocabolario dell'albero sintattico del kernel WhyCode.
 * Fonte: docs/SPEC-01-KERNEL.md, sezioni 2 e 3.
 * Ogni nodo porta la sua posizione (riga, colonna, 1-based) e i commenti agganciati.
 */

export interface Pos {
  riga: number;
  colonna: number;
}

export interface ErroreKernel {
  codice: string;
  messaggio: string;
  riga: number;
  colonna: number;
  rimedio: string;
}

export const POS_INIZIALE: Pos = { riga: 1, colonna: 1 };

/** Tipi del kernel. Gli opachi hanno la maiuscola e arrivano dai dialetti. */
export type Tipo =
  | { base: "numero" | "testo" | "booleano" | "niente" }
  | { base: "opaco"; nome: string }
  | { base: "lista"; elemento: Tipo }
  | { base: "mappa"; chiave: Tipo; valore: Tipo };

export type OperatoreBinario =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "uguale"
  | "diverso"
  | "<"
  | ">"
  | "<="
  | ">="
  | "e"
  | "o";

export interface EspNumero {
  genere: "numero";
  valore: string;
  pos: Pos;
}
export interface EspTesto {
  genere: "testo";
  valore: string;
  pos: Pos;
}
export interface EspBooleano {
  genere: "booleano";
  valore: boolean;
  pos: Pos;
}
export interface EspNiente {
  genere: "niente";
  pos: Pos;
}
export interface EspNome {
  genere: "nome";
  nome: string;
  pos: Pos;
}
export interface EspLista {
  genere: "lista";
  elementi: Espressione[];
  pos: Pos;
}
export interface EspMappa {
  genere: "mappa";
  voci: { chiave: string; valore: Espressione; pos: Pos }[];
  pos: Pos;
}
export interface EspChiamata {
  genere: "chiamata";
  nome: string;
  argomenti: Espressione[];
  pos: Pos;
}
export interface EspBinaria {
  genere: "binaria";
  operatore: OperatoreBinario;
  sinistra: Espressione;
  destra: Espressione;
  pos: Pos;
}
export interface EspUnaria {
  genere: "unaria";
  operatore: "non" | "-";
  operando: Espressione;
  pos: Pos;
}

export type Espressione =
  | EspNumero
  | EspTesto
  | EspBooleano
  | EspNiente
  | EspNome
  | EspLista
  | EspMappa
  | EspChiamata
  | EspBinaria
  | EspUnaria;

export interface Parametro {
  nome?: string;
  tipo?: Tipo;
  pos: Pos;
}

export interface Rigadato {
  genere: "dato";
  mutabile: boolean;
  nome: string;
  tipo?: Tipo;
  valore?: Espressione;
  commenti: string[];
  pos: Pos;
}

export interface RigaAssegnazione {
  genere: "assegnazione";
  nome: string;
  valore: Espressione;
  commenti: string[];
  pos: Pos;
}

export interface BloccoSe {
  genere: "se";
  condizione: Espressione;
  allora: Istruzione[];
  altrimenti?: Istruzione[];
  altrimentiSe?: BloccoSe;
  commenti: string[];
  pos: Pos;
}

export interface BloccoPerOgni {
  genere: "per-ogni";
  nome: string;
  iterabile: Espressione;
  corpo: Istruzione[];
  commenti: string[];
  pos: Pos;
}

export interface BloccoMentre {
  genere: "mentre";
  condizione: Espressione;
  corpo: Istruzione[];
  commenti: string[];
  pos: Pos;
}

export interface RigaRitorna {
  genere: "ritorna";
  valore?: Espressione;
  commenti: string[];
  pos: Pos;
}

export interface RigaChiudi {
  genere: "chiudi";
  commenti: string[];
  pos: Pos;
}

export interface RigaVerifica {
  genere: "verifica";
  espressione: Espressione;
  commenti: string[];
  pos: Pos;
}

export interface RigaEspressione {
  genere: "espressione";
  espressione: Espressione;
  commenti: string[];
  pos: Pos;
}

export type Istruzione =
  | Rigadato
  | RigaAssegnazione
  | BloccoSe
  | BloccoPerOgni
  | BloccoMentre
  | RigaRitorna
  | RigaChiudi
  | RigaVerifica
  | RigaEspressione;

export interface BloccoFunzione {
  genere: "funzione";
  nome: string;
  parametri: Parametro[];
  ritorno?: Tipo;
  corpo?: Istruzione[];
  commenti: string[];
  pos: Pos;
}

export interface BloccoEffetto {
  genere: "effetto";
  nome: string;
  parametri: Parametro[];
  ritorno?: Tipo;
  commenti: string[];
  pos: Pos;
}

export interface RigaAtteso {
  genere: "atteso";
  espressione: Espressione;
  commenti: string[];
  pos: Pos;
}

export interface BloccoTest {
  genere: "test";
  nome: string;
  corpo: (Rigadato | RigaVerifica | RigaAtteso)[];
  commenti: string[];
  pos: Pos;
}

export interface ElementoDescrizione {
  genere: "descrizione";
  testo: string;
  commenti: string[];
  pos: Pos;
}

export interface ElementoVincolo {
  genere: "vincolo";
  espressione: Espressione;
  commenti: string[];
  pos: Pos;
}

export type ElementoIntento =
  | ElementoDescrizione
  | Rigadato
  | ElementoVincolo
  | BloccoFunzione
  | BloccoEffetto
  | BloccoTest;

export interface BloccoIntento {
  genere: "intento";
  nome: string;
  elementi: ElementoIntento[];
  commenti: string[];
  pos: Pos;
}

export interface BloccoVincoli {
  genere: "vincoli";
  coppie: { chiave: string; valore: string; virgolette: boolean; commenti: string[]; pos: Pos }[];
  commenti: string[];
  pos: Pos;
}

export interface BloccoUscita {
  genere: "uscita";
  voci: { nome: string; valore?: string; virgolette: boolean; commenti: string[]; pos: Pos }[];
  commenti: string[];
  pos: Pos;
}

export type RigaDialetto =
  | { genere: "aggiunge-tipo"; nome: string; commenti: string[]; pos: Pos }
  | { genere: "aggiunge-blocco"; nome: string; commenti: string[]; pos: Pos }
  | { genere: "usa-kernel"; commenti: string[]; pos: Pos };

export interface BloccoDialetto {
  genere: "dialetto";
  nome: string;
  righe: RigaDialetto[];
  commenti: string[];
  pos: Pos;
}

export interface BloccoUsaDialetto {
  genere: "usa-dialetto";
  nome: string;
  commenti: string[];
  pos: Pos;
}

export interface BloccoTipo {
  genere: "tipo";
  nome: string;
  commenti: string[];
  pos: Pos;
}

export interface BloccoImporta {
  genere: "importa";
  nome: string;
  da: string;
  commenti: string[];
  pos: Pos;
}

export type Blocco =
  | BloccoIntento
  | BloccoVincoli
  | BloccoUscita
  | BloccoDialetto
  | BloccoUsaDialetto
  | BloccoTipo
  | BloccoFunzione
  | BloccoEffetto
  | BloccoTest
  | BloccoImporta
  | Rigadato;

export interface FileKernel {
  versione?: number;
  versionePos?: Pos;
  versioneCommenti?: string[];
  blocchi: Blocco[];
  commentiFinali: string[];
}

/** Uguaglianza strutturale fra espressioni, ignorando posizioni e commenti. */
export function exprUguale(a: Espressione, b: Espressione): boolean {
  if (a.genere !== b.genere) {
    return false;
  }
  switch (a.genere) {
    case "numero":
      return a.valore === (b as EspNumero).valore;
    case "testo":
      return a.valore === (b as EspTesto).valore;
    case "booleano":
      return a.valore === (b as EspBooleano).valore;
    case "niente":
      return true;
    case "nome":
      return a.nome === (b as EspNome).nome;
    case "lista": {
      const altro = b as EspLista;
      return a.elementi.length === altro.elementi.length && a.elementi.every((e, i) => exprUguale(e, altro.elementi[i]));
    }
    case "mappa": {
      const altro = b as EspMappa;
      return (
        a.voci.length === altro.voci.length &&
        a.voci.every((v, i) => v.chiave === altro.voci[i].chiave && exprUguale(v.valore, altro.voci[i].valore))
      );
    }
    case "chiamata": {
      const altro = b as EspChiamata;
      return (
        a.nome === altro.nome &&
        a.argomenti.length === altro.argomenti.length &&
        a.argomenti.every((e, i) => exprUguale(e, altro.argomenti[i]))
      );
    }
    case "binaria": {
      const altro = b as EspBinaria;
      return a.operatore === altro.operatore && exprUguale(a.sinistra, altro.sinistra) && exprUguale(a.destra, altro.destra);
    }
    case "unaria": {
      const altro = b as EspUnaria;
      return a.operatore === altro.operatore && exprUguale(a.operando, altro.operando);
    }
  }
}
