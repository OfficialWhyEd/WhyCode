/**
 * Parser a discesa ricorsiva del kernel WhyCode.
 * Fonte: docs/SPEC-01-KERNEL.md, sezione 3 (grammatica) e sezione 7 (errori K-).
 * Regola d'oro: non si ferma al primo errore, recupera e ne trova il piu' possibile.
 * Le parole contestuali (il, di, a, da, ogni, in, solo) valgono solo dove la grammatica le chiede.
 */
import type {
  Blocco,
  BloccoDialetto,
  BloccoEffetto,
  BloccoFunzione,
  BloccoImporta,
  BloccoIntento,
  BloccoSe,
  BloccoTest,
  BloccoTipo,
  BloccoUscita,
  BloccoUsaDialetto,
  BloccoMentre,
  BloccoPerOgni,
  BloccoVincoli,
  ElementoIntento,
  ErroreKernel,
  Espressione,
  FileKernel,
  Istruzione,
  OperatoreBinario,
  Parametro,
  Pos,
  RigaAssegnazione,
  Rigadato,
  RigaAtteso,
  RigaChiudi,
  RigaDialetto,
  RigaEspressione,
  RigaRitorna,
  RigaVerifica,
  Tipo,
} from "./ast.js";
import type { Token } from "./tokenizer.js";
import { PAROLE_RISERVATE, tokenize } from "./tokenizer.js";
export interface EsitoParse {
  ok: boolean;
  ast: FileKernel;
  errori: ErroreKernel[];
}

interface VersioneBlocco {
  genere: "versione-blocco";
  valore: number;
  pos: Pos;
}

class ErroreInterno extends Error {
  readonly errore: ErroreKernel;
  constructor(errore: ErroreKernel) {
    super(errore.messaggio);
    this.errore = errore;
  }
}

const AVVII_TOP: ReadonlySet<string> = new Set([
  "versione",
  "intento",
  "vincoli",
  "uscita",
  "dialetto",
  "usa",
  "tipo",
  "funzione",
  "effetto",
  "test",
  "importa",
  "dato",
  "variabile",
]);

const AVVII_ISTRUZIONE: ReadonlySet<string> = new Set([
  "dato",
  "variabile",
  "se",
  "per",
  "mentre",
  "ritorna",
  "chiudi",
  "verifica",
  "atteso",
]);

const PAROLE_TIPO: ReadonlySet<string> = new Set(["numero", "testo", "booleano", "niente", "lista", "mappa"]);

/** Parole riservate ammesse come chiavi dei vincoli e come voci di uscita (G-063). */
const CHIAVI_COPPIA: ReadonlySet<string> = new Set(["uscita", "test", "stile"]);

/** Oltre questo numero di livelli annidati si ferma con K-120, invece di far esplodere la pila. */
const LIMITE_PROFONDITA = 300;

/** Vero se il nome comincia con una maiuscola, anche accentata (É, À, Ö...). */
function iniziaConMaiuscola(nome: string): boolean {
  return /^\p{Lu}/u.test(nome);
}

const OPERATORI_CONFRONTO: ReadonlySet<string> = new Set(["uguale", "diverso", "<", ">", "<=", ">="]);

function pos(t: Token): Pos {
  return { riga: t.riga, colonna: t.colonna };
}

function descriviToken(t: Token): string {
  if (t.tipo === "fine") return "la fine del file";
  if (t.tipo === "parola") return `la parola "${t.valore}"`;
  if (t.tipo === "numero") return `il numero ${t.valore}`;
  if (t.tipo === "testo") return "una stringa";
  if (t.tipo === "commento") return "un commento";
  return `"${t.valore}"`;
}

function normalizzaNumero(raw: string): string {
  if (!raw.includes(".")) return raw;
  let s = raw.replace(/0+$/, "");
  if (s.endsWith(".")) s = s.slice(0, -1);
  return s;
}

class Parser {
  private readonly token: Token[];
  private i = 0;
  private readonly errori: ErroreKernel[] = [];
  private pendenti: string[] = [];
  private profondita = 0;

  constructor(token: Token[]) {
    this.token = token;
  }

  /** Esegue un pezzo di parsing tenendo il conto dell'annidamento: oltre il limite, K-120 gentile. */
  private dentro<T>(t: Token, corpo: () => T): T {
    this.profondita++;
    try {
      if (this.profondita > LIMITE_PROFONDITA) {
        throw this.creaErrore(
          "K-120",
          "Codice annidato troppo in profondita'",
          "spezza il codice in piu' passi, con nomi intermedi",
          t,
        );
      }
      return corpo();
    } finally {
      this.profondita--;
    }
  }

  parse(): EsitoParse {
    const blocchi: Blocco[] = [];
    let versione: number | undefined;
    let versionePos: Pos | undefined;
    let versioneCommenti: string[] | undefined;
    let commentiFinali: string[] = [];

    while (true) {
      const commenti = this.prendiCommenti();
      if (this.corrente().tipo === "fine") {
        commentiFinali = commenti;
        break;
      }
      const prima = this.i;
      try {
        const b = this.parseBlocco();
        if (b.genere === "versione-blocco") {
          if (versione !== undefined || blocchi.length > 0) {
            this.registra({
              codice: "K-001",
              messaggio: "La versione va dichiarata una sola volta, come primissima riga",
              riga: b.pos.riga,
              colonna: b.pos.colonna,
              rimedio: "sposta versione in cima al file oppure toglila",
            });
          } else {
            versione = b.valore;
            versionePos = b.pos;
            versioneCommenti = commenti;
          }
        } else {
          b.commenti = commenti;
          blocchi.push(b);
        }
      } catch (e) {
        this.recuperaTop(e, prima);
      }
    }

    return {
      ok: this.errori.length === 0,
      ast: { versione, versionePos, versioneCommenti, blocchi, commentiFinali },
      errori: this.errori,
    };
  }

  private registra(e: ErroreKernel): void {
    const doppio = this.errori.some((x) => x.codice === e.codice && x.riga === e.riga && x.colonna === e.colonna);
    if (!doppio) this.errori.push(e);
  }

  private recuperaTop(e: unknown, prima: number): void {
    if (!(e instanceof ErroreInterno)) throw e;
    this.registra(e.errore);
    this.sincronizzaTop();
    if (this.i === prima && this.corrente().tipo !== "fine") this.i++;
  }

  private recuperaDentro(e: unknown, prima: number): void {
    if (!(e instanceof ErroreInterno)) throw e;
    this.registra(e.errore);
    this.sincronizzaIstruzione();
    if (this.i === prima && this.corrente().tipo !== "fine") this.i++;
  }

  private corrente(): Token {
    return this.token[Math.min(this.i, this.token.length - 1)];
  }

  private guarda(k: number): Token {
    return this.token[Math.min(this.i + k, this.token.length - 1)];
  }

  private avanza(): Token {
    const t = this.corrente();
    if (t.tipo !== "fine") this.i++;
    return t;
  }

  private prendiCommenti(): string[] {
    while (this.corrente().tipo === "commento") {
      this.pendenti.push(this.avanza().valore);
    }
    const fuori = this.pendenti;
    this.pendenti = [];
    return fuori;
  }

  private creaErrore(codice: string, messaggio: string, rimedio: string, t: Token): ErroreInterno {
    const p = pos(t);
    return new ErroreInterno({ codice, messaggio, riga: p.riga, colonna: p.colonna, rimedio });
  }

  private atteso(descrizione: string, t: Token = this.corrente()): never {
    throw this.creaErrore("K-001", `Atteso ${descrizione}, trovato ${descriviToken(t)}`, `scrivi ${descrizione}`, t);
  }

  private attesaParola(valore: string): Token {
    const t = this.corrente();
    if (t.tipo === "parola" && t.valore === valore) return this.avanza();
    throw this.atteso(`la parola "${valore}"`, t);
  }

  private attesaSimbolo(valore: string): Token {
    const t = this.corrente();
    if (t.tipo === "simbolo" && t.valore === valore) return this.avanza();
    if (t.tipo === "fine" && valore === "}") {
      throw this.creaErrore("K-002", "Graffa non chiusa: il file finisce prima della chiusura", "aggiungi la graffa } mancante", t);
    }
    if (t.tipo === "fine" && valore === ")") {
      throw this.creaErrore("K-003", "Parentesi non chiusa: il file finisce prima della chiusura", "aggiungi la parentesi ) mancante", t);
    }
    throw this.atteso(`"${valore}"`, t);
  }

  private attesaId(motivo: string): Token {
    const t = this.corrente();
    if (t.tipo !== "parola") throw this.atteso(`un nome per ${motivo}`, t);
    if (PAROLE_RISERVATE.has(t.valore)) {
      throw this.creaErrore(
        "K-005",
        `La parola riservata "${t.valore}" non puo' fare da ${motivo}`,
        "scegli un altro nome, non una parola del linguaggio",
        t,
      );
    }
    if (iniziaConMaiuscola(t.valore)) {
      throw this.creaErrore(
        "K-118",
        `Il nome "${t.valore}" comincia con la maiuscola`,
        "le maiuscole si usano solo per i tipi opachi dei dialetti: usa lettere minuscole",
        t,
      );
    }
    return this.avanza();
  }

  private attesaIdOpaco(motivo: string): Token {
    const t = this.corrente();
    if (t.tipo !== "parola") throw this.atteso(`un tipo opaco con la maiuscola per ${motivo}`, t);
    if (!iniziaConMaiuscola(t.valore)) {
      throw this.creaErrore(
        "K-118",
        `Il tipo opaco "${t.valore}" comincia con la minuscola`,
        "i tipi dei dialetti cominciano con la maiuscola, tipo Diamante",
        t,
      );
    }
    return this.avanza();
  }

  /** Nome di una chiave dei vincoli o di una voce di uscita: minuscolo; uscita, test e stile sono ammessi (G-063). */
  private attesaNomeCoppia(motivo: string): Token {
    const t = this.corrente();
    if (t.tipo !== "parola") throw this.atteso(`un nome per ${motivo}`, t);
    if (PAROLE_RISERVATE.has(t.valore) && !CHIAVI_COPPIA.has(t.valore)) {
      throw this.creaErrore(
        "K-005",
        `La parola riservata "${t.valore}" non puo' fare da ${motivo}`,
        "scegli un altro nome, non una parola del linguaggio",
        t,
      );
    }
    if (iniziaConMaiuscola(t.valore)) {
      throw this.creaErrore(
        "K-118",
        `Il nome "${t.valore}" comincia con la maiuscola`,
        "qui i nomi sono tutti minuscoli",
        t,
      );
    }
    return this.avanza();
  }

  private attesaTesto(): Token {
    const t = this.corrente();
    if (t.tipo === "testo") return this.avanza();
    throw this.atteso("una stringa fra virgolette", t);
  }

  /** Valore di una coppia: stringa, numero, vero/falso, o un nome semplice senza virgolette. */
  private attesaValoreCoppia(): { valore: string; virgolette: boolean } {
    const t = this.corrente();
    if (t.tipo === "testo") {
      this.avanza();
      return { valore: t.valore, virgolette: true };
    }
    if (t.tipo === "numero") {
      this.avanza();
      return { valore: t.valore, virgolette: false };
    }
    if (t.tipo === "parola" && (t.valore === "vero" || t.valore === "falso")) {
      this.avanza();
      return { valore: t.valore, virgolette: false };
    }
    if (t.tipo === "parola" && !PAROLE_RISERVATE.has(t.valore)) {
      this.avanza();
      return { valore: t.valore, virgolette: false };
    }
    throw this.atteso("un valore (una stringa, un numero, vero/falso, o un nome semplice)", t);
  }

  private parseBlocco(): Blocco | VersioneBlocco {
    const t = this.corrente();
    if (t.tipo !== "parola") {
      throw this.atteso(
        "un blocco (versione, intento, funzione, effetto, test, vincoli, uscita, dialetto, tipo, importa)",
        t,
      );
    }
    switch (t.valore) {
      case "versione": {
        const p = pos(t);
        this.avanza();
        const n = this.corrente();
        if (n.tipo !== "numero") throw this.atteso("un numero intero dopo versione", n);
        this.avanza();
        const v = Number(n.valore);
        if (!Number.isInteger(v) || v < 1) {
          throw this.creaErrore("K-001", `Versione non valida: ${n.valore}`, "usa un numero intero tipo 1", n);
        }
        return { genere: "versione-blocco", valore: v, pos: p };
      }
      case "intento":
        return this.parseIntento();
      case "vincoli":
        return this.parseVincoli();
      case "uscita":
        return this.parseUscita();
      case "dialetto":
        return this.parseDialetto();
      case "usa":
        return this.parseUsaDialetto();
      case "tipo":
        return this.parseTipoBlocco();
      case "funzione":
        return this.parseFunzione();
      case "effetto":
        return this.parseEffetto();
      case "test":
        return this.parseTest();
      case "importa":
        return this.parseImporta();
      case "dato":
      case "variabile":
        return this.parseDato();
      default:
        throw this.atteso(
          "un blocco (versione, intento, funzione, effetto, test, vincoli, uscita, dialetto, tipo, importa)",
          t,
        );
    }
  }

  /** Ciclo dentro le graffe con recupero: si ferma su "}" o a fine file. */
  private dentroGraffe<T>(parseElemento: (commenti: string[]) => T): T[] {
    const fuori: T[] = [];
    while (true) {
      const commenti = this.prendiCommenti();
      const t = this.corrente();
      if (t.tipo === "fine" || (t.tipo === "simbolo" && t.valore === "}")) {
        this.pendenti = commenti;
        return fuori;
      }
      const prima = this.i;
      try {
        fuori.push(parseElemento(commenti));
      } catch (e) {
        this.recuperaDentro(e, prima);
      }
    }
  }

  private parseIntento(): BloccoIntento {
    const primo = this.attesaParola("intento");
    const nome = this.attesaId("nome dell'intento");
    this.attesaSimbolo("{");
    const elementi = this.dentroGraffe((commenti) => this.parseElementoIntento(commenti));
    this.attesaSimbolo("}");
    return { genere: "intento", nome: nome.valore, elementi, commenti: [], pos: pos(primo) };
  }

  private parseElementoIntento(commenti: string[]): ElementoIntento {
    const t = this.corrente();
    if (t.tipo === "parola") {
      if (t.valore === "descrizione") {
        this.avanza();
        const testo = this.attesaTesto();
        return { genere: "descrizione", testo: testo.valore, commenti, pos: pos(t) };
      }
      if (t.valore === "dato" || t.valore === "variabile") {
        const r = this.parseDato();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "funzione") {
        const r = this.parseFunzione();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "effetto") {
        const r = this.parseEffetto();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "vincolo") {
        this.avanza();
        const espressione = this.parseEspressione();
        return { genere: "vincolo", espressione, commenti, pos: pos(t) };
      }
      if (t.valore === "test") {
        const r = this.parseTest();
        r.commenti = commenti;
        return r;
      }
    }
    throw this.atteso("un elemento dell'intento (descrizione, dato, variabile, funzione, effetto, vincolo, test)", t);
  }

  private parseDato(): Rigadato {
    const primo = this.corrente();
    const mutabile = primo.valore === "variabile";
    this.avanza();
    const nome = this.attesaId(mutabile ? "nome della variabile" : "nome del dato");
    let tipo: Tipo | undefined;
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === ":") {
      this.avanza();
      tipo = this.parseTipo();
    }
    let valore: Espressione | undefined;
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === "=") {
      this.avanza();
      valore = this.parseEspressione();
    }
    return { genere: "dato", mutabile, nome: nome.valore, tipo, valore, commenti: [], pos: pos(primo) };
  }

  private parseTipo(): Tipo {
    const t = this.corrente();
    return this.dentro(t, () => this.parseTipoInterno(t));
  }

  private parseTipoInterno(t: Token): Tipo {
    if (t.tipo === "parola") {
      if (t.valore === "numero" || t.valore === "testo" || t.valore === "booleano" || t.valore === "niente") {
        this.avanza();
        return { base: t.valore };
      }
      if (t.valore === "lista") {
        this.avanza();
        this.attesaParola("di");
        return { base: "lista", elemento: this.parseTipo() };
      }
      if (t.valore === "mappa") {
        this.avanza();
        this.attesaParola("di");
        const chiave = this.parseTipo();
        this.attesaParola("a");
        const valore = this.parseTipo();
        return { base: "mappa", chiave, valore };
      }
      if (iniziaConMaiuscola(t.valore)) {
        this.avanza();
        return { base: "opaco", nome: t.valore };
      }
    }
    throw this.atteso(
      "un tipo (numero, testo, booleano, niente, lista di ..., mappa di ... a ..., oppure un tipo opaco con la maiuscola)",
      t,
    );
  }

  private parseParametri(): Parametro[] {
    this.attesaSimbolo("(");
    const parametri: Parametro[] = [];
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === ")") {
      this.avanza();
      return parametri;
    }
    while (true) {
      const t = this.corrente();
      if (t.tipo === "parola" && (PAROLE_TIPO.has(t.valore) || iniziaConMaiuscola(t.valore))) {
        parametri.push({ tipo: this.parseTipo(), pos: pos(t) });
      } else {
        const nome = this.attesaId("nome del parametro");
        let tipo: Tipo | undefined;
        if (this.corrente().tipo === "simbolo" && this.corrente().valore === ":") {
          this.avanza();
          tipo = this.parseTipo();
        }
        parametri.push({ nome: nome.valore, tipo, pos: pos(nome) });
      }
      const c = this.corrente();
      if (c.tipo === "simbolo" && c.valore === ",") {
        this.avanza();
        continue;
      }
      if (c.tipo === "simbolo" && c.valore === ")") {
        this.avanza();
        return parametri;
      }
      throw this.atteso('"," per continuare i parametri o ")" per chiudere', c);
    }
  }

  private parseFunzione(): BloccoFunzione {
    const primo = this.attesaParola("funzione");
    const nome = this.attesaId("nome della funzione");
    const parametri = this.parseParametri();
    let ritorno: Tipo | undefined;
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === "->") {
      this.avanza();
      ritorno = this.parseTipo();
    }
    let corpo: Istruzione[] | undefined;
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === "{") {
      this.avanza();
      corpo = this.dentroGraffe((commenti) => this.parseIstruzione(commenti));
      this.attesaSimbolo("}");
    }
    return { genere: "funzione", nome: nome.valore, parametri, ritorno, corpo, commenti: [], pos: pos(primo) };
  }

  private parseEffetto(): BloccoEffetto {
    const primo = this.attesaParola("effetto");
    const nome = this.attesaId("nome dell'effetto");
    const parametri = this.parseParametri();
    let ritorno: Tipo | undefined;
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === "->") {
      this.avanza();
      ritorno = this.parseTipo();
    }
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === "{") {
      throw this.creaErrore(
        "K-001",
        "Un effetto non ha un corpo",
        "l'effetto descrive solo il mondo di fuori: togli il blocco { }",
        this.corrente(),
      );
    }
    return { genere: "effetto", nome: nome.valore, parametri, ritorno, commenti: [], pos: pos(primo) };
  }

  private parseTest(): BloccoTest {
    const primo = this.attesaParola("test");
    const nome = this.attesaId("nome del test");
    this.attesaSimbolo("{");
    const corpo = this.dentroGraffe((commenti) => this.parseRigaTest(commenti));
    this.attesaSimbolo("}");
    return { genere: "test", nome: nome.valore, corpo, commenti: [], pos: pos(primo) };
  }

  private parseRigaTest(commenti: string[]): Rigadato | RigaVerifica | RigaAtteso {
    const t = this.corrente();
    if (t.tipo === "parola") {
      if (t.valore === "dato" || t.valore === "variabile") {
        const r = this.parseDato();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "verifica") {
        this.avanza();
        const espressione = this.parseEspressione();
        return { genere: "verifica", espressione, commenti, pos: pos(t) };
      }
      if (t.valore === "atteso") {
        this.avanza();
        const espressione = this.parseEspressione();
        return { genere: "atteso", espressione, commenti, pos: pos(t) };
      }
    }
    throw this.atteso("dato, variabile, verifica o atteso dentro il test", t);
  }

  private parseVincoli(): BloccoVincoli {
    const primo = this.attesaParola("vincoli");
    this.attesaSimbolo("{");
    const coppie = this.dentroGraffe((commenti) => {
      const chiave = this.attesaNomeCoppia("nome del vincolo");
      this.attesaSimbolo(":");
      const { valore, virgolette } = this.attesaValoreCoppia();
      return { chiave: chiave.valore, valore, virgolette, commenti, pos: pos(chiave) };
    });
    this.attesaSimbolo("}");
    return { genere: "vincoli", coppie, commenti: [], pos: pos(primo) };
  }

  private parseUscita(): BloccoUscita {
    const primo = this.attesaParola("uscita");
    this.attesaSimbolo("{");
    const voci = this.dentroGraffe((commenti) => {
      const nome = this.attesaNomeCoppia("nome della voce di uscita");
      if (this.corrente().tipo === "simbolo" && this.corrente().valore === ":") {
        this.avanza();
        const { valore, virgolette } = this.attesaValoreCoppia();
        return { nome: nome.valore, valore, virgolette, commenti, pos: pos(nome) };
      }
      return { nome: nome.valore, virgolette: false, commenti, pos: pos(nome) };
    });
    this.attesaSimbolo("}");
    return { genere: "uscita", voci, commenti: [], pos: pos(primo) };
  }

  private parseDialetto(): BloccoDialetto {
    const primo = this.attesaParola("dialetto");
    const nome = this.attesaId("nome del dialetto");
    this.attesaSimbolo("{");
    const righe = this.dentroGraffe((commenti) => this.parseRigaDialetto(commenti));
    this.attesaSimbolo("}");
    return { genere: "dialetto", nome: nome.valore, righe, commenti: [], pos: pos(primo) };
  }

  private parseRigaDialetto(commenti: string[]): RigaDialetto {
    const t = this.corrente();
    if (t.tipo === "parola" && t.valore === "aggiunge") {
      this.avanza();
      const c = this.corrente();
      if (c.tipo === "parola" && c.valore === "tipo") {
        this.avanza();
        const n = this.attesaIdOpaco("nome del tipo aggiunto");
        return { genere: "aggiunge-tipo", nome: n.valore, commenti, pos: pos(t) };
      }
      if (c.tipo === "parola" && c.valore === "blocco") {
        this.avanza();
        const n = this.attesaId("nome del blocco aggiunto");
        return { genere: "aggiunge-blocco", nome: n.valore, commenti, pos: pos(t) };
      }
      throw this.atteso('"tipo" o "blocco" dopo aggiunge', c);
    }
    if (t.tipo === "parola" && t.valore === "usa") {
      this.avanza();
      this.attesaParola("solo");
      this.attesaParola("il");
      this.attesaParola("kernel");
      return { genere: "usa-kernel", commenti, pos: pos(t) };
    }
    throw this.atteso("aggiunge o usa dentro il dialetto", t);
  }

  private parseUsaDialetto(): BloccoUsaDialetto {
    const primo = this.attesaParola("usa");
    this.attesaParola("dialetto");
    const nome = this.attesaId("nome del dialetto");
    return { genere: "usa-dialetto", nome: nome.valore, commenti: [], pos: pos(primo) };
  }

  private parseTipoBlocco(): BloccoTipo {
    const primo = this.attesaParola("tipo");
    const nome = this.attesaIdOpaco("nome del tipo opaco");
    return { genere: "tipo", nome: nome.valore, commenti: [], pos: pos(primo) };
  }

  private parseImporta(): BloccoImporta {
    const primo = this.attesaParola("importa");
    const nome = this.attesaId("nome importato");
    this.attesaParola("da");
    const da = this.attesaTesto();
    return { genere: "importa", nome: nome.valore, da: da.valore, commenti: [], pos: pos(primo) };
  }

  private parseIstruzione(commenti: string[]): Istruzione {
    const t = this.corrente();
    return this.dentro(t, () => this.parseIstruzioneInterna(commenti, t));
  }

  private parseIstruzioneInterna(commenti: string[], t: Token): Istruzione {
    if (t.tipo === "parola") {
      if (t.valore === "dato" || t.valore === "variabile") {
        const r = this.parseDato();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "se") {
        const r = this.parseSe();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "per") {
        const r = this.parsePerOgni();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "mentre") {
        const r = this.parseMentre();
        r.commenti = commenti;
        return r;
      }
      if (t.valore === "ritorna") {
        this.avanza();
        let valore: Espressione | undefined;
        if (this.iniziaEspressione(this.corrente())) {
          valore = this.parseEspressione();
        }
        const r: RigaRitorna = { genere: "ritorna", valore, commenti, pos: pos(t) };
        return r;
      }
      if (t.valore === "chiudi") {
        this.avanza();
        const r: RigaChiudi = { genere: "chiudi", commenti, pos: pos(t) };
        return r;
      }
      if (t.valore === "verifica") {
        this.avanza();
        const r: RigaVerifica = { genere: "verifica", espressione: this.parseEspressione(), commenti, pos: pos(t) };
        return r;
      }
      const dopo = this.guarda(1);
      if (!PAROLE_RISERVATE.has(t.valore) && dopo.tipo === "simbolo" && dopo.valore === "=") {
        const nome = this.attesaId("nome da assegnare");
        this.avanza();
        const valore = this.parseEspressione();
        const r: RigaAssegnazione = { genere: "assegnazione", nome: nome.valore, valore, commenti, pos: pos(nome) };
        return r;
      }
    }
    const r: RigaEspressione = { genere: "espressione", espressione: this.parseEspressione(), commenti, pos: pos(t) };
    return r;
  }

  private iniziaEspressione(t: Token): boolean {
    if (t.tipo === "numero" || t.tipo === "testo") return true;
    if (t.tipo === "parola") {
      return (
        !PAROLE_RISERVATE.has(t.valore) ||
        t.valore === "vero" ||
        t.valore === "falso" ||
        t.valore === "niente" ||
        t.valore === "non"
      );
    }
    if (t.tipo === "simbolo") {
      return t.valore === "-" || t.valore === "[" || t.valore === "{" || t.valore === "(";
    }
    return false;
  }

  private parseSe(): BloccoSe {
    const primo = this.attesaParola("se");
    return this.dentro(primo, () => this.parseSeInterno(primo));
  }

  private parseSeInterno(primo: Token): BloccoSe {
    const condizione = this.parseEspressione();
    this.attesaSimbolo("{");
    const allora = this.dentroGraffe((commenti) => this.parseIstruzione(commenti));
    this.attesaSimbolo("}");
    const nodo: BloccoSe = { genere: "se", condizione, allora, commenti: [], pos: pos(primo) };
    const c = this.corrente();
    if (c.tipo === "parola" && c.valore === "altrimenti") {
      this.avanza();
      const d = this.corrente();
      if (d.tipo === "parola" && d.valore === "se") {
        nodo.altrimentiSe = this.parseSe();
      } else {
        this.attesaSimbolo("{");
        nodo.altrimenti = this.dentroGraffe((commenti) => this.parseIstruzione(commenti));
        this.attesaSimbolo("}");
      }
    }
    return nodo;
  }

  private parsePerOgni(): BloccoPerOgni {
    const primo = this.attesaParola("per");
    this.attesaParola("ogni");
    const nome = this.attesaId("nome dell'elemento");
    this.attesaParola("in");
    const iterabile = this.parseEspressione();
    this.attesaSimbolo("{");
    const corpo = this.dentroGraffe((commenti) => this.parseIstruzione(commenti));
    this.attesaSimbolo("}");
    return { genere: "per-ogni", nome: nome.valore, iterabile, corpo, commenti: [], pos: pos(primo) };
  }

  private parseMentre(): BloccoMentre {
    const primo = this.attesaParola("mentre");
    const condizione = this.parseEspressione();
    this.attesaSimbolo("{");
    const corpo = this.dentroGraffe((commenti) => this.parseIstruzione(commenti));
    this.attesaSimbolo("}");
    return { genere: "mentre", condizione, corpo, commenti: [], pos: pos(primo) };
  }

  private parseEspressione(): Espressione {
    return this.dentro(this.corrente(), () => this.parseO());
  }

  private parseO(): Espressione {
    let e = this.parseE();
    while (this.corrente().tipo === "parola" && this.corrente().valore === "o") {
      const op = this.avanza();
      const d = this.parseE();
      e = { genere: "binaria", operatore: "o", sinistra: e, destra: d, pos: pos(op) };
    }
    return e;
  }

  private parseE(): Espressione {
    let e = this.parseConfronto();
    while (this.corrente().tipo === "parola" && this.corrente().valore === "e") {
      const op = this.avanza();
      const d = this.parseConfronto();
      e = { genere: "binaria", operatore: "e", sinistra: e, destra: d, pos: pos(op) };
    }
    return e;
  }

  private parseConfronto(): Espressione {
    const e = this.parseSomma();
    const t = this.corrente();
    let operatore: OperatoreBinario | undefined;
    if (t.tipo === "parola" && (t.valore === "uguale" || t.valore === "diverso")) {
      operatore = t.valore;
    } else if (t.tipo === "simbolo" && OPERATORI_CONFRONTO.has(t.valore)) {
      operatore = t.valore as OperatoreBinario;
    }
    if (operatore === undefined) return e;
    this.avanza();
    const d = this.parseSomma();
    return { genere: "binaria", operatore, sinistra: e, destra: d, pos: pos(t) };
  }

  private parseSomma(): Espressione {
    let e = this.parseProdotto();
    while (true) {
      const t = this.corrente();
      if (t.tipo === "simbolo" && (t.valore === "+" || t.valore === "-")) {
        this.avanza();
        const d = this.parseProdotto();
        e = { genere: "binaria", operatore: t.valore === "+" ? "+" : "-", sinistra: e, destra: d, pos: pos(t) };
      } else {
        return e;
      }
    }
  }

  private parseProdotto(): Espressione {
    let e = this.parseUnario();
    while (true) {
      const t = this.corrente();
      if (t.tipo === "simbolo" && (t.valore === "*" || t.valore === "/" || t.valore === "%")) {
        this.avanza();
        const d = this.parseUnario();
        e = { genere: "binaria", operatore: t.valore === "*" ? "*" : t.valore === "/" ? "/" : "%", sinistra: e, destra: d, pos: pos(t) };
      } else {
        return e;
      }
    }
  }

  private parseUnario(): Espressione {
    const t = this.corrente();
    return this.dentro(t, () => {
      if (t.tipo === "parola" && t.valore === "non") {
        this.avanza();
        return { genere: "unaria", operatore: "non", operando: this.parseUnario(), pos: pos(t) } as Espressione;
      }
      if (t.tipo === "simbolo" && t.valore === "-") {
        this.avanza();
        return { genere: "unaria", operatore: "-", operando: this.parseUnario(), pos: pos(t) } as Espressione;
      }
      return this.parsePostfissa();
    });
  }

  private parsePostfissa(): Espressione {
    let e = this.parseAtomo();
    while (this.corrente().tipo === "simbolo" && this.corrente().valore === "(") {
      if (e.genere !== "nome") {
        throw this.atteso("si possono chiamare solo funzioni per nome", this.corrente());
      }
      const argomenti = this.parseArgomenti();
      e = { genere: "chiamata", nome: e.nome, argomenti, pos: e.pos };
    }
    return e;
  }

  private parseArgomenti(): Espressione[] {
    this.attesaSimbolo("(");
    const argomenti: Espressione[] = [];
    if (this.corrente().tipo === "simbolo" && this.corrente().valore === ")") {
      this.avanza();
      return argomenti;
    }
    while (true) {
      argomenti.push(this.parseEspressione());
      const c = this.corrente();
      if (c.tipo === "simbolo" && c.valore === ",") {
        this.avanza();
        continue;
      }
      if (c.tipo === "simbolo" && c.valore === ")") {
        this.avanza();
        return argomenti;
      }
      throw this.atteso('"," fra gli argomenti o ")" per chiudere', c);
    }
  }

  private parseAtomo(): Espressione {
    const t = this.corrente();
    if (t.tipo === "numero") {
      this.avanza();
      return { genere: "numero", valore: normalizzaNumero(t.valore), pos: pos(t) };
    }
    if (t.tipo === "testo") {
      this.avanza();
      return { genere: "testo", valore: t.valore, pos: pos(t) };
    }
    if (t.tipo === "parola") {
      if (t.valore === "vero" || t.valore === "falso") {
        this.avanza();
        return { genere: "booleano", valore: t.valore === "vero", pos: pos(t) };
      }
      if (t.valore === "niente") {
        this.avanza();
        return { genere: "niente", pos: pos(t) };
      }
      if (PAROLE_RISERVATE.has(t.valore)) {
        throw this.creaErrore(
          "K-005",
          `La parola riservata "${t.valore}" non puo' stare qui`,
          "qui serve un valore: un numero, una stringa, un nome o una chiamata",
          t,
        );
      }
      this.avanza();
      return { genere: "nome", nome: t.valore, pos: pos(t) };
    }
    if (t.tipo === "simbolo" && t.valore === "[") {
      this.avanza();
      const elementi: Espressione[] = [];
      if (this.corrente().tipo === "simbolo" && this.corrente().valore === "]") {
        this.avanza();
        return { genere: "lista", elementi, pos: pos(t) };
      }
      while (true) {
        elementi.push(this.parseEspressione());
        const c = this.corrente();
        if (c.tipo === "simbolo" && c.valore === ",") {
          this.avanza();
          continue;
        }
        if (c.tipo === "simbolo" && c.valore === "]") {
          this.avanza();
          return { genere: "lista", elementi, pos: pos(t) };
        }
        throw this.atteso('"," fra gli elementi o "]" per chiudere', c);
      }
    }
    if (t.tipo === "simbolo" && t.valore === "{") {
      this.avanza();
      const voci: { chiave: string; valore: Espressione; pos: Pos }[] = [];
      if (this.corrente().tipo === "simbolo" && this.corrente().valore === "}") {
        this.avanza();
        return { genere: "mappa", voci, pos: pos(t) };
      }
      while (true) {
        const chiave = this.attesaTesto();
        this.attesaSimbolo(":");
        const valore = this.parseEspressione();
        voci.push({ chiave: chiave.valore, valore, pos: pos(chiave) });
        const c = this.corrente();
        if (c.tipo === "simbolo" && c.valore === ",") {
          this.avanza();
          continue;
        }
        if (c.tipo === "simbolo" && c.valore === "}") {
          this.avanza();
          return { genere: "mappa", voci, pos: pos(t) };
        }
        throw this.atteso('"," fra le voci o "}" per chiudere', c);
      }
    }
    if (t.tipo === "simbolo" && t.valore === "(") {
      this.avanza();
      const e = this.parseEspressione();
      this.attesaSimbolo(")");
      return e;
    }
    throw this.atteso("una espressione (numero, stringa, nome, lista, mappa, chiamata, parentesi)", t);
  }

  private sincronizzaTop(): void {
    while (this.corrente().tipo !== "fine") {
      const t = this.corrente();
      if (t.tipo === "parola" && AVVII_TOP.has(t.valore)) return;
      this.avanza();
    }
  }

  private sincronizzaIstruzione(): void {
    while (this.corrente().tipo !== "fine") {
      const t = this.corrente();
      if (t.tipo === "simbolo" && t.valore === "}") return;
      if (t.tipo === "parola" && AVVII_ISTRUZIONE.has(t.valore)) return;
      this.avanza();
    }
  }
}

export function parse(fonte: string): EsitoParse {
  const tok = tokenize(fonte);
  if (!tok.ok) {
    return { ok: false, ast: { blocchi: [], commentiFinali: [] }, errori: tok.errori };
  }
  const parser = new Parser(tok.token);
  return parser.parse();
}
