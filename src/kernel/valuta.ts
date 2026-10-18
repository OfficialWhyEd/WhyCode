/**
 * Valutazione del kernel WhyCode: controlla il file e ne tira fuori l'Intento.
 * Fonte: docs/SPEC-01-KERNEL.md, sezioni 4 (inferenza minima) e 7 (errori K-101..K-119).
 * Qui il kernel non genera niente: capisce, controlla e prepara la strada a livelli piu' alti.
 */
import type {
  BloccoFunzione,
  BloccoIntento,
  BloccoMentre,
  BloccoTest,
  ErroreKernel,
  Espressione,
  FileKernel,
  Istruzione,
  Pos,
  Tipo,
} from "./ast.js";
import { exprUguale } from "./ast.js";
import { stampaEspressione, stampaTipo } from "./stampa.js";

type Genere = "dato" | "variabile" | "funzione" | "effetto" | "importa" | "parametro";

/** Tipo visto dal controllo: solo i tipi che il kernel sa confrontare senza dialetti. */
type TipoSemplice = "numero" | "testo" | "booleano" | "niente" | "lista" | "mappa";

interface Voce {
  genere: Genere;
  tipo?: TipoSemplice;
}

const OPERATORI_ARITMETICI: ReadonlySet<string> = new Set(["+", "-", "*", "/", "%"]);

export interface DatoValutato {
  nome: string;
  tipo?: string;
  mutabile: boolean;
}

export interface FunzioneValutata {
  nome: string;
  parametri: number;
  ritorno?: string;
  dichiarata: boolean;
}

export interface EffettoValutato {
  nome: string;
  parametri: number;
  ritorno?: string;
}

export interface TestValutato {
  nome: string;
  controlli: number;
}

export interface IntentoValutato {
  nome: string;
  descrizione?: string;
  dati: DatoValutato[];
  funzioni: FunzioneValutata[];
  effetti: EffettoValutato[];
  test: TestValutato[];
  vincoli: string[];
}

export interface Valutazione {
  intenti: IntentoValutato[];
  vincoli: Record<string, string>;
  uscita: string[];
}

export interface EsitoValuta {
  ok: boolean;
  valutazione: Valutazione;
  errori: ErroreKernel[];
  avvisi: ErroreKernel[];
}

class Valutatore {
  private readonly errori: ErroreKernel[] = [];
  private readonly avvisi: ErroreKernel[] = [];
  private readonly globali = new Map<string, Voce>();
  private readonly intenti: IntentoValutato[] = [];
  private readonly vincoliGlobali: Record<string, string> = {};
  private readonly uscitaVoci: string[] = [];
  private usaDialetto = false;
  private opacoSegnalato = false;

  valuta(ast: FileKernel): EsitoValuta {
    this.usaDialetto = ast.blocchi.some((b) => b.genere === "usa-dialetto");

    for (const b of ast.blocchi) {
      if (b.genere === "dialetto" && !b.righe.some((r) => r.genere === "usa-kernel")) {
        this.errore(
          "K-119",
          `Il dialetto "${b.nome}" non dice "usa solo il kernel"`,
          'aggiungi dentro il dialetto la riga "usa solo il kernel"',
          b.pos,
        );
      }
    }

    for (const b of ast.blocchi) {
      switch (b.genere) {
        case "funzione":
          this.dichiaraGlobale({ genere: "funzione", tipo: tipoSemplice(b.ritorno) }, b.nome, b.pos);
          break;
        case "effetto":
          this.dichiaraGlobale({ genere: "effetto", tipo: tipoSemplice(b.ritorno) }, b.nome, b.pos);
          break;
        case "test":
          this.dichiaraGlobale({ genere: "funzione" }, b.nome, b.pos);
          break;
        case "importa":
          this.dichiaraGlobale({ genere: "importa" }, b.nome, b.pos);
          break;
        case "dato":
          this.dichiaraGlobale({ genere: b.mutabile ? "variabile" : "dato", tipo: tipoSemplice(b.tipo) }, b.nome, b.pos);
          break;
        default:
          break;
      }
    }

    for (const b of ast.blocchi) {
      switch (b.genere) {
        case "intento":
          this.valutaIntento(b);
          break;
        case "vincoli":
          for (const c of b.coppie) {
            this.vincoliGlobali[c.chiave] = c.valore;
          }
          break;
        case "uscita":
          for (const v of b.voci) {
            this.uscitaVoci.push(v.valore !== undefined ? `${v.nome}: ${v.valore}` : v.nome);
          }
          break;
        case "funzione":
          this.valutaFunzione(b, [this.globali], undefined);
          break;
        case "test":
          this.valutaTest(b, [this.globali]);
          break;
        case "dato": {
          this.controllaOpaco(b.tipo, b.pos);
          this.controllaTipoInferibile(b.tipo, b.valore, b.pos);
          if (b.valore !== undefined) {
            this.controllaEspressione(b.valore, [this.globali], false);
          }
          const voce = this.globali.get(b.nome);
          if (voce !== undefined && voce.tipo === undefined && b.valore !== undefined) {
            voce.tipo = this.tipoDi(b.valore, [this.globali]);
          }
          break;
        }
        default:
          break;
      }
    }

    return {
      ok: this.errori.length === 0,
      valutazione: { intenti: this.intenti, vincoli: this.vincoliGlobali, uscita: this.uscitaVoci },
      errori: this.errori,
      avvisi: this.avvisi,
    };
  }

  private errore(codice: string, messaggio: string, rimedio: string, pos: Pos): void {
    this.errori.push({ codice, messaggio, riga: pos.riga, colonna: pos.colonna, rimedio });
  }

  private avviso(codice: string, messaggio: string, rimedio: string, pos: Pos): void {
    this.avvisi.push({ codice, messaggio, riga: pos.riga, colonna: pos.colonna, rimedio });
  }

  private dichiaraGlobale(voce: Voce, nome: string, pos: Pos): void {
    if (this.globali.has(nome)) {
      this.errore("K-101", `Il nome "${nome}" e' gia' dichiarato`, "usa un nome diverso oppure togli la doppia dichiarazione", pos);
      return;
    }
    this.globali.set(nome, voce);
  }

  private controllaOpaco(t: Tipo | undefined, pos: Pos): void {
    if (t === undefined) return;
    const opachi: string[] = [];
    raccogliOpachi(t, opachi);
    if (opachi.length === 0) return;
    if (!this.usaDialetto && !this.opacoSegnalato) {
      this.opacoSegnalato = true;
      this.errore(
        "K-104",
        `Il tipo opaco "${opachi[0]}" arriva da un dialetto, ma nessun dialetto e' in uso`,
        'aggiungi in cima al file "usa dialetto nome" con un dialetto che definisce quel tipo',
        pos,
      );
    }
  }

  private controllaTipoInferibile(tipo: Tipo | undefined, valore: Espressione | undefined, pos: Pos): void {
    if (tipo !== undefined || valore === undefined) return;
    const vuota =
      (valore.genere === "lista" && valore.elementi.length === 0) ||
      (valore.genere === "mappa" && valore.voci.length === 0);
    if (!vuota) return;
    this.errore(
      "K-116",
      "Una lista o mappa vuota non basta per capire il tipo",
      'aggiungi il tipo, esempio: ": lista di numero"',
      pos,
    );
  }

  private valutaIntento(b: BloccoIntento): void {
    const locale = new Map<string, Voce>();
    const intento: IntentoValutato = { nome: b.nome, dati: [], funzioni: [], effetti: [], test: [], vincoli: [] };

    for (const el of b.elementi) {
      if (el.genere === "descrizione") {
        intento.descrizione = el.testo;
        continue;
      }
      if (el.genere === "dato") {
        this.controllaOpaco(el.tipo, el.pos);
        this.controllaTipoInferibile(el.tipo, el.valore, el.pos);
        if (locale.has(el.nome)) {
          this.errore("K-101", `Il nome "${el.nome}" e' gia' dichiarato in questo intento`, "usa un nome diverso", el.pos);
        } else {
          locale.set(el.nome, {
            genere: el.mutabile ? "variabile" : "dato",
            tipo: tipoSemplice(el.tipo) ?? this.tipoDi(el.valore, [this.globali, locale]),
          });
        }
        intento.dati.push({ nome: el.nome, tipo: el.tipo !== undefined ? stampaTipo(el.tipo) : undefined, mutabile: el.mutabile });
        continue;
      }
      if (el.genere === "funzione" || el.genere === "effetto" || el.genere === "test") {
        if (locale.has(el.nome)) {
          this.errore("K-101", `Il nome "${el.nome}" e' gia' dichiarato in questo intento`, "usa un nome diverso", el.pos);
        } else {
          const voceLocale: Voce = el.genere === "test" ? { genere: "funzione" } : { genere: el.genere, tipo: tipoSemplice(el.ritorno) };
          locale.set(el.nome, voceLocale);
        }
        if (el.genere === "funzione") {
          for (const p of el.parametri) this.controllaOpaco(p.tipo, p.pos);
          this.controllaOpaco(el.ritorno, el.pos);
          intento.funzioni.push({
            nome: el.nome,
            parametri: el.parametri.length,
            ritorno: el.ritorno !== undefined ? stampaTipo(el.ritorno) : undefined,
            dichiarata: el.corpo !== undefined,
          });
        } else if (el.genere === "effetto") {
          for (const p of el.parametri) this.controllaOpaco(p.tipo, p.pos);
          this.controllaOpaco(el.ritorno, el.pos);
          intento.effetti.push({
            nome: el.nome,
            parametri: el.parametri.length,
            ritorno: el.ritorno !== undefined ? stampaTipo(el.ritorno) : undefined,
          });
        } else {
          intento.test.push({ nome: el.nome, controlli: controlliDelTest(el) });
        }
        continue;
      }
    }

    for (const el of b.elementi) {
      if (el.genere === "dato") {
        if (el.valore !== undefined) {
          this.controllaEspressione(el.valore, [this.globali, locale], false);
        }
      } else if (el.genere === "funzione") {
        this.valutaFunzione(el, [this.globali, locale], undefined);
      } else if (el.genere === "test") {
        this.valutaTest(el, [this.globali, locale]);
      } else if (el.genere === "vincolo") {
        intento.vincoli.push(stampaEspressione(el.espressione));
        this.controllaEspressione(el.espressione, [this.globali, locale], true);
        const t = this.tipoDi(el.espressione, [this.globali, locale]);
        if (t !== undefined && t !== "booleano") {
          this.errore(
            "K-113",
            `Il vincolo non e' un'affermazione: il suo tipo e' ${t}`,
            "riscrivilo come un confronto, esempio: qualcosa uguale qualcosa",
            el.pos,
          );
        }
      }
    }

    this.intenti.push(intento);
  }

  private valutaFunzione(fn: BloccoFunzione, catena: Map<string, Voce>[], posizione?: Pos): void {
    const scope = new Map<string, Voce>();
    for (const p of fn.parametri) {
      this.controllaOpaco(p.tipo, p.pos);
      if (p.nome !== undefined) {
        if (scope.has(p.nome)) {
          this.errore("K-101", `Il parametro "${p.nome}" e' ripetuto`, "usa nomi diversi per i parametri", p.pos);
        }
        scope.set(p.nome, { genere: "parametro", tipo: tipoSemplice(p.tipo) });
      }
    }
    this.controllaOpaco(fn.ritorno, posizione ?? fn.pos);
    if (fn.ritorno !== undefined && fn.corpo !== undefined && !terminaCon(fn.corpo)) {
      this.errore(
        "K-107",
        `La funzione "${fn.nome}" promette un ${stampaTipo(fn.ritorno)}, ma un suo sentiero finisce senza ritorna`,
        `aggiungi "ritorna ..." in ogni ramo, oppure togli il tipo di ritorno`,
        posizione ?? fn.pos,
      );
    }
    const catenaNuova = [...catena, scope];
    this.valutaElenco(fn.corpo ?? [], catenaNuova);
  }

  private valutaTest(t: BloccoTest, catena: Map<string, Voce>[]): void {
    const scope = new Map<string, Voce>();
    const catenaNuova = [...catena, scope];
    let controlli = 0;
    for (const riga of t.corpo) {
      if (riga.genere === "dato") {
        if (scope.has(riga.nome)) {
          this.errore("K-101", `Il nome "${riga.nome}" e' gia' dichiarato in questo test`, "usa un nome diverso", riga.pos);
        } else {
          scope.set(riga.nome, {
            genere: riga.mutabile ? "variabile" : "dato",
            tipo: tipoSemplice(riga.tipo) ?? this.tipoDi(riga.valore, catenaNuova),
          });
        }
        this.controllaTipoInferibile(riga.tipo, riga.valore, riga.pos);
        if (riga.valore !== undefined) this.controllaEspressione(riga.valore, catenaNuova, false);
        continue;
      }
      controlli += 1;
      this.controllaEspressione(riga.espressione, catenaNuova, false);
      const binaria = riga.espressione;
      if (binaria.genere === "binaria" && (binaria.operatore === "uguale" || binaria.operatore === "diverso")) {
        if (exprUguale(binaria.sinistra, binaria.destra)) {
          this.avviso(
            "K-115",
            `Questo confronto confronta la stessa cosa con se stessa: il risultato e' sempre ${binaria.operatore === "uguale" ? "vero" : "falso"}`,
            "confronta due cose diverse, tipo il risultato della funzione con un valore scritto a mano",
            riga.pos,
          );
        }
      }
    }
    if (controlli === 0) {
      this.errore("K-114", `Il test "${t.nome}" non controlla niente`, "aggiungi almeno una riga verifica oppure atteso", t.pos);
    }
  }

  private valutaElenco(lista: Istruzione[], catena: Map<string, Voce>[]): void {
    let morta = false;
    for (const istr of lista) {
      if (morta) {
        this.avviso(
          "K-109",
          "Questo codice non si esegue mai: sta dopo un ritorna o un chiudi",
          "toglilo, oppure spostalo prima del ritorna",
          istr.pos,
        );
        break;
      }
      if (istr.genere === "ritorna" || istr.genere === "chiudi") {
        morta = true;
      }
      this.valutaIstruzione(istr, catena);
    }
  }

  private valutaIstruzione(istr: Istruzione, catena: Map<string, Voce>[]): void {
    switch (istr.genere) {
      case "dato": {
        const scope = catena[catena.length - 1];
        if (scope.has(istr.nome)) {
          this.errore("K-101", `Il nome "${istr.nome}" e' gia' dichiarato qui`, "usa un nome diverso", istr.pos);
        } else {
          scope.set(istr.nome, {
            genere: istr.mutabile ? "variabile" : "dato",
            tipo: tipoSemplice(istr.tipo) ?? this.tipoDi(istr.valore, catena),
          });
        }
        this.controllaOpaco(istr.tipo, istr.pos);
        this.controllaTipoInferibile(istr.tipo, istr.valore, istr.pos);
        if (istr.valore !== undefined) this.controllaEspressione(istr.valore, catena, false);
        return;
      }
      case "assegnazione": {
        const voce = cercaInCatena(catena, istr.nome);
        if (voce === undefined) {
          this.errore(
            "K-112",
            `Stai assegnando a "${istr.nome}" ma non e' dichiarato da nessuna parte`,
            "prima dichiaralo con dato o variabile",
            istr.pos,
          );
        } else if (voce.genere !== "variabile") {
          this.errore(
            "K-111",
            `Non si puo' riassegnare "${istr.nome}": e' un ${voce.genere}, non una variabile`,
            `dichiara "${istr.nome}" con variabile al posto di dato, se deve cambiare`,
            istr.pos,
          );
        }
        this.controllaEspressione(istr.valore, catena, false);
        return;
      }
      case "se":
        this.controllaEspressione(istr.condizione, catena, false);
        this.valutaElenco(istr.allora, catena);
        if (istr.altrimenti !== undefined) {
          this.valutaElenco(istr.altrimenti, catena);
        }
        if (istr.altrimentiSe !== undefined) {
          this.valutaIstruzione(istr.altrimentiSe, catena);
        }
        return;
      case "per-ogni": {
        this.controllaEspressione(istr.iterabile, catena, false);
        const scope = new Map<string, Voce>();
        scope.set(istr.nome, { genere: "parametro" });
        this.valutaElenco(istr.corpo, [...catena, scope]);
        return;
      }
      case "mentre":
        this.controllaEspressione(istr.condizione, catena, false);
        this.controllaCicloMentre(istr);
        this.valutaElenco(istr.corpo, catena);
        return;
      case "ritorna":
        if (istr.valore !== undefined) this.controllaEspressione(istr.valore, catena, false);
        return;
      case "chiudi":
        return;
      case "verifica":
        this.controllaEspressione(istr.espressione, catena, false);
        return;
      case "espressione":
        this.controllaEspressione(istr.espressione, catena, false);
        return;
    }
  }

  private controllaCicloMentre(m: BloccoMentre): void {
    const nomiCondizione = new Set<string>();
    raccogliNomi(m.condizione, nomiCondizione);
    const assegnati = new Set<string>();
    raccogliAssegnati(m.corpo, assegnati);
    const visibile = contieneChiamata(m.condizione) || contieneChiudi(m.corpo);
    if (nomiCondizione.size > 0) {
      const cambia = [...nomiCondizione].some((n) => assegnati.has(n));
      if (!cambia && !visibile) {
        this.avviso(
          "K-108",
          "Il ciclo mentre non fa vedere come la condizione cambia",
          "assegna un nuovo valore a un nome della condizione, oppure usa per ogni",
          m.pos,
        );
      }
      return;
    }
    if (!visibile) {
      this.avviso(
        "K-108",
        "Il ciclo mentre non mostra nessuna via d'uscita",
        "metti un chiudi dentro il ciclo, oppure usa per ogni",
        m.pos,
      );
    }
  }

  private controllaEspressione(e: Espressione, catena: Map<string, Voce>[], inVincolo: boolean): void {
    switch (e.genere) {
      case "numero":
      case "testo":
      case "booleano":
      case "niente":
        return;
      case "nome": {
        if (cercaInCatena(catena, e.nome) === undefined) {
          this.errore("K-112", `Il nome "${e.nome}" non e' dichiarato`, "dichiaralo con dato o variabile, oppure correggi il refuso", e.pos);
        }
        return;
      }
      case "lista": {
        const visti: TipoSemplice[] = [];
        for (const x of e.elementi) {
          const t = this.tipoDi(x, catena);
          if (t !== undefined && !visti.includes(t)) visti.push(t);
        }
        if (visti.length > 1) {
          this.avviso(
            "K-102",
            `La lista mescola ${visti[0]} e ${visti[1]}`,
            "usa elementi dello stesso tipo, oppure dichiara un tipo adatto",
            e.pos,
          );
        }
        for (const x of e.elementi) this.controllaEspressione(x, catena, inVincolo);
        return;
      }
      case "mappa":
        for (const v of e.voci) this.controllaEspressione(v.valore, catena, inVincolo);
        return;
      case "chiamata": {
        const voce = cercaInCatena(catena, e.nome);
        if (voce === undefined) {
          this.errore(
            "K-106",
            `La chiamata a "${e.nome}" non trova nessuno`,
            `dichiara l'effetto o la funzione "${e.nome}", oppure importala`,
            e.pos,
          );
        } else if (voce.genere === "dato" || voce.genere === "variabile" || voce.genere === "parametro") {
          this.errore(
            "K-105",
            `"${e.nome}" e' un ${voce.genere}: non si puo' chiamare`,
            "chiama solo funzioni ed effetti, oppure controlla il nome",
            e.pos,
          );
        } else if (voce.genere === "effetto" && inVincolo) {
          this.errore(
            "K-110",
            `Il vincolo chiama l'effetto "${e.nome}"`,
            "un vincolo descrive solo regole pure: sposta l'effetto nel codice",
            e.pos,
          );
        }
        for (const a of e.argomenti) this.controllaEspressione(a, catena, inVincolo);
        return;
      }
      case "binaria": {
        if (OPERATORI_ARITMETICI.has(e.operatore)) {
          const ts = this.tipoDi(e.sinistra, catena);
          const td = this.tipoDi(e.destra, catena);
          if (ts !== undefined && td !== undefined && ts !== td) {
            this.errore(
              "K-105",
              `Non posso usare ${e.operatore} fra ${ts} e ${td}`,
              "niente conversioni automatiche: converti in modo esplicito, oppure usa lo stesso tipo",
              e.pos,
            );
          }
        }
        this.controllaEspressione(e.sinistra, catena, inVincolo);
        this.controllaEspressione(e.destra, catena, inVincolo);
        return;
      }
      case "unaria": {
        const t = this.tipoDi(e.operando, catena);
        if (e.operatore === "-" && t !== undefined && t !== "numero") {
          this.errore("K-105", `Non posso usare - su ${t}`, "il meno vale solo per i numeri", e.pos);
        }
        if (e.operatore === "non" && t !== undefined && t !== "booleano") {
          this.errore("K-105", `Non posso usare non su ${t}`, "non vale solo per vero e falso", e.pos);
        }
        this.controllaEspressione(e.operando, catena, inVincolo);
        return;
      }
    }
  }

  private tipoDi(e: Espressione | undefined, catena: Map<string, Voce>[]): TipoSemplice | undefined {
    if (e === undefined) return undefined;
    switch (e.genere) {
      case "numero":
        return "numero";
      case "testo":
        return "testo";
      case "booleano":
        return "booleano";
      case "niente":
        return "niente";
      case "lista":
        return "lista";
      case "mappa":
        return "mappa";
      case "nome":
        return cercaInCatena(catena, e.nome)?.tipo;
      case "chiamata":
        return cercaInCatena(catena, e.nome)?.tipo;
      case "unaria":
        return e.operatore === "non" ? "booleano" : "numero";
      case "binaria":
        if (e.operatore === "uguale" || e.operatore === "diverso" || e.operatore === "e" || e.operatore === "o") {
          return "booleano";
        }
        if (e.operatore === "<" || e.operatore === ">" || e.operatore === "<=" || e.operatore === ">=") {
          return "booleano";
        }
        return this.tipoDi(e.sinistra, catena) ?? this.tipoDi(e.destra, catena);
    }
  }
}

function tipoSemplice(t: Tipo | undefined): TipoSemplice | undefined {
  if (t === undefined) return undefined;
  switch (t.base) {
    case "numero":
    case "testo":
    case "booleano":
    case "niente":
      return t.base;
    case "lista":
      return "lista";
    case "mappa":
      return "mappa";
    default:
      return undefined;
  }
}

function raccogliOpachi(t: Tipo, fuori: string[]): void {
  if (t.base === "opaco") {
    fuori.push(t.nome);
    return;
  }
  if (t.base === "lista") {
    raccogliOpachi(t.elemento, fuori);
    return;
  }
  if (t.base === "mappa") {
    raccogliOpachi(t.chiave, fuori);
    raccogliOpachi(t.valore, fuori);
  }
}

function cercaInCatena(catena: Map<string, Voce>[], nome: string): Voce | undefined {
  for (let i = catena.length - 1; i >= 0; i--) {
    const v = catena[i].get(nome);
    if (v !== undefined) return v;
  }
  return undefined;
}

function controlliDelTest(t: BloccoTest): number {
  return t.corpo.filter((r) => r.genere === "verifica" || r.genere === "atteso").length;
}

function raccogliNomi(e: Espressione, fuori: Set<string>): void {
  switch (e.genere) {
    case "nome":
      fuori.add(e.nome);
      return;
    case "chiamata":
      for (const a of e.argomenti) raccogliNomi(a, fuori);
      return;
    case "binaria":
      raccogliNomi(e.sinistra, fuori);
      raccogliNomi(e.destra, fuori);
      return;
    case "unaria":
      raccogliNomi(e.operando, fuori);
      return;
    case "lista":
      for (const x of e.elementi) raccogliNomi(x, fuori);
      return;
    case "mappa":
      for (const v of e.voci) raccogliNomi(v.valore, fuori);
      return;
    default:
      return;
  }
}

function contieneChiamata(e: Espressione): boolean {
  switch (e.genere) {
    case "chiamata":
      return true;
    case "binaria":
      return contieneChiamata(e.sinistra) || contieneChiamata(e.destra);
    case "unaria":
      return contieneChiamata(e.operando);
    case "lista":
      return e.elementi.some((x) => contieneChiamata(x));
    case "mappa":
      return e.voci.some((v) => contieneChiamata(v.valore));
    default:
      return false;
  }
}

function raccogliAssegnati(lista: Istruzione[], fuori: Set<string>): void {
  for (const istr of lista) {
    switch (istr.genere) {
      case "assegnazione":
        fuori.add(istr.nome);
        break;
      case "se":
        raccogliAssegnati(istr.allora, fuori);
        if (istr.altrimenti !== undefined) raccogliAssegnati(istr.altrimenti, fuori);
        if (istr.altrimentiSe !== undefined) raccogliAssegnati([istr.altrimentiSe], fuori);
        break;
      case "per-ogni":
      case "mentre":
        raccogliAssegnati(istr.corpo, fuori);
        break;
      default:
        break;
    }
  }
}

function contieneChiudi(lista: Istruzione[]): boolean {
  for (const istr of lista) {
    switch (istr.genere) {
      case "chiudi":
        return true;
      case "se":
        if (contieneChiudi(istr.allora) || (istr.altrimenti !== undefined && contieneChiudi(istr.altrimenti))) return true;
        if (istr.altrimentiSe !== undefined && contieneChiudi([istr.altrimentiSe])) return true;
        break;
      case "per-ogni":
      case "mentre":
        if (contieneChiudi(istr.corpo)) return true;
        break;
      default:
        break;
    }
  }
  return false;
}

function terminaCon(lista: Istruzione[]): boolean {
  for (const istr of lista) {
    if (istr.genere === "ritorna" || istr.genere === "chiudi") return true;
    if (istr.genere === "se") {
      const alloraOk = terminaCon(istr.allora);
      const altOk =
        istr.altrimentiSe !== undefined
          ? terminaCon([istr.altrimentiSe])
          : istr.altrimenti !== undefined
            ? terminaCon(istr.altrimenti)
            : false;
      if (alloraOk && altOk) return true;
    }
  }
  return false;
}

export function valuta(ast: FileKernel): EsitoValuta {
  return new Valutatore().valuta(ast);
}
