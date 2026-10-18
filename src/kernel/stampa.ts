/**
 * Stampa stabile del kernel WhyCode.
 * Fonte: docs/SPEC-01-KERNEL.md, sezione 6.
 * Regole: indentazione di 2 spazi, una istruzione per riga, LF, commenti conservati,
 * parentesi solo dove servono. stampa(parse(testo)) e' un punto fisso.
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
  Espressione,
  FileKernel,
  Istruzione,
  Parametro,
  RigaAtteso,
  RigaDialetto,
  RigaVerifica,
  Tipo,
} from "./ast.js";

function virgolette(valore: string): string {
  const dentro = valore
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${dentro}"`;
}

function righeCommenti(commenti: string[], indent: string): string[] {
  return commenti.map((c) => (c.length > 0 ? `${indent}# ${c}` : `${indent}#`));
}

function precedenza(e: Espressione): number {
  if (e.genere === "binaria") {
    switch (e.operatore) {
      case "o":
        return 1;
      case "e":
        return 2;
      case "uguale":
      case "diverso":
      case "<":
      case ">":
      case "<=":
      case ">=":
        return 3;
      case "+":
      case "-":
        return 4;
      case "*":
      case "/":
      case "%":
        return 5;
    }
  }
  if (e.genere === "unaria") {
    return 6;
  }
  return 7;
}

export function stampaEspressione(e: Espressione): string {
  switch (e.genere) {
    case "numero":
      return e.valore;
    case "testo":
      return virgolette(e.valore);
    case "booleano":
      return e.valore ? "vero" : "falso";
    case "niente":
      return "niente";
    case "nome":
      return e.nome;
    case "lista":
      return `[${e.elementi.map(stampaEspressione).join(", ")}]`;
    case "mappa":
      return `{${e.voci.map((v) => `${virgolette(v.chiave)}: ${stampaEspressione(v.valore)}`).join(", ")}}`;
    case "chiamata":
      return `${e.nome}(${e.argomenti.map(stampaEspressione).join(", ")})`;
    case "unaria": {
      const figlia = e.operando;
      const dentro = precedenza(figlia) < 6 ? `(${stampaEspressione(figlia)})` : stampaEspressione(figlia);
      return e.operatore === "non" ? `non ${dentro}` : `-${dentro}`;
    }
    case "binaria": {
      const p = precedenza(e);
      const sinistra = precedenza(e.sinistra) < p ? `(${stampaEspressione(e.sinistra)})` : stampaEspressione(e.sinistra);
      const serveParentesiDestra =
        precedenza(e.destra) < p || ((e.operatore === "-" || e.operatore === "/") && precedenza(e.destra) === p);
      const destra = serveParentesiDestra ? `(${stampaEspressione(e.destra)})` : stampaEspressione(e.destra);
      return `${sinistra} ${e.operatore} ${destra}`;
    }
  }
}

export function stampaTipo(t: Tipo): string {
  switch (t.base) {
    case "numero":
    case "testo":
    case "booleano":
    case "niente":
      return t.base;
    case "opaco":
      return t.nome;
    case "lista":
      return `lista di ${stampaTipo(t.elemento)}`;
    case "mappa":
      return `mappa di ${stampaTipo(t.chiave)} a ${stampaTipo(t.valore)}`;
  }
}

function stampaParametri(parametri: Parametro[]): string {
  const pezzi = parametri.map((p) => {
    if (p.nome !== undefined && p.tipo !== undefined) return `${p.nome}: ${stampaTipo(p.tipo)}`;
    if (p.nome !== undefined) return p.nome;
    if (p.tipo !== undefined) return stampaTipo(p.tipo);
    return "";
  });
  return `(${pezzi.join(", ")})`;
}

function stampaDato(nome: string, tipo: Tipo | undefined, valore: Espressione | undefined, mutabile: boolean, indent: string): string {
  let riga = `${indent}${mutabile ? "variabile" : "dato"} ${nome}`;
  if (tipo !== undefined) riga += `: ${stampaTipo(tipo)}`;
  if (valore !== undefined) riga += ` = ${stampaEspressione(valore)}`;
  return riga;
}

function stampaIstruzione(istr: Istruzione, indent: string): string[] {
  switch (istr.genere) {
    case "dato":
      return [
        ...righeCommenti(istr.commenti, indent),
        stampaDato(istr.nome, istr.tipo, istr.valore, istr.mutabile, indent),
      ];
    case "assegnazione":
      return [...righeCommenti(istr.commenti, indent), `${indent}${istr.nome} = ${stampaEspressione(istr.valore)}`];
    case "se":
      return [...righeCommenti(istr.commenti, indent), ...stampaSe(istr, indent)];
    case "per-ogni":
      return [
        ...righeCommenti(istr.commenti, indent),
        `${indent}per ogni ${istr.nome} in ${stampaEspressione(istr.iterabile)} {`,
        ...stampaIstruzioni(istr.corpo, indent + "  "),
        `${indent}}`,
      ];
    case "mentre":
      return [
        ...righeCommenti(istr.commenti, indent),
        `${indent}mentre ${stampaEspressione(istr.condizione)} {`,
        ...stampaIstruzioni(istr.corpo, indent + "  "),
        `${indent}}`,
      ];
    case "ritorna":
      return [
        ...righeCommenti(istr.commenti, indent),
        istr.valore !== undefined ? `${indent}ritorna ${stampaEspressione(istr.valore)}` : `${indent}ritorna`,
      ];
    case "chiudi":
      return [...righeCommenti(istr.commenti, indent), `${indent}chiudi`];
    case "verifica":
      return [...righeCommenti(istr.commenti, indent), `${indent}verifica ${stampaEspressione(istr.espressione)}`];
    case "espressione":
      return [...righeCommenti(istr.commenti, indent), `${indent}${stampaEspressione(istr.espressione)}`];
  }
}

function stampaIstruzioni(istruzioni: Istruzione[], indent: string): string[] {
  return istruzioni.flatMap((i) => stampaIstruzione(i, indent));
}

function stampaSe(s: BloccoSe, indent: string): string[] {
  const fuori: string[] = [`${indent}se ${stampaEspressione(s.condizione)} {`];
  fuori.push(...stampaIstruzioni(s.allora, indent + "  "));
  if (s.altrimentiSe !== undefined) {
    const dentro = stampaSe(s.altrimentiSe, indent);
    dentro[0] = `} altrimenti ${dentro[0].slice(indent.length)}`;
    fuori.push(...dentro);
  } else if (s.altrimenti !== undefined) {
    fuori.push(`${indent}} altrimenti {`);
    fuori.push(...stampaIstruzioni(s.altrimenti, indent + "  "));
    fuori.push(`${indent}}`);
  } else {
    fuori.push(`${indent}}`);
  }
  return fuori;
}

function stampaFunzione(fn: BloccoFunzione, indent: string): string[] {
  let testa = `${indent}funzione ${fn.nome}${stampaParametri(fn.parametri)}`;
  if (fn.ritorno !== undefined) testa += ` -> ${stampaTipo(fn.ritorno)}`;
  if (fn.corpo === undefined) {
    return [...righeCommenti(fn.commenti, indent), testa];
  }
  return [
    ...righeCommenti(fn.commenti, indent),
    `${testa} {`,
    ...stampaIstruzioni(fn.corpo, indent + "  "),
    `${indent}}`,
  ];
}

function stampaEffetto(ef: BloccoEffetto, indent: string): string[] {
  let testa = `${indent}effetto ${ef.nome}${stampaParametri(ef.parametri)}`;
  if (ef.ritorno !== undefined) testa += ` -> ${stampaTipo(ef.ritorno)}`;
  return [...righeCommenti(ef.commenti, indent), testa];
}

function stampaRigaTest(riga: BloccoTest["corpo"][number], indent: string): string[] {
  if (riga.genere === "dato") {
    return [...righeCommenti(riga.commenti, indent), stampaDato(riga.nome, riga.tipo, riga.valore, riga.mutabile, indent)];
  }
  if (riga.genere === "verifica") {
    return [...righeCommenti(riga.commenti, indent), `${indent}verifica ${stampaEspressione(riga.espressione)}`];
  }
  return [...righeCommenti(riga.commenti, indent), `${indent}atteso ${stampaEspressione(riga.espressione)}`];
}

function stampaTest(t: BloccoTest, indent: string): string[] {
  return [
    ...righeCommenti(t.commenti, indent),
    `${indent}test ${t.nome} {`,
    ...t.corpo.flatMap((r) => stampaRigaTest(r, indent + "  ")),
    `${indent}}`,
  ];
}

function stampaElementoIntento(el: ElementoIntento, indent: string): string[] {
  switch (el.genere) {
    case "descrizione":
      return [...righeCommenti(el.commenti, indent), `${indent}descrizione ${virgolette(el.testo)}`];
    case "dato":
      return [...righeCommenti(el.commenti, indent), stampaDato(el.nome, el.tipo, el.valore, el.mutabile, indent)];
    case "funzione":
      return stampaFunzione(el, indent);
    case "effetto":
      return stampaEffetto(el, indent);
    case "vincolo":
      return [...righeCommenti(el.commenti, indent), `${indent}vincolo ${stampaEspressione(el.espressione)}`];
    case "test":
      return stampaTest(el, indent);
  }
}

function stampaIntento(b: BloccoIntento, indent: string): string[] {
  return [
    ...righeCommenti(b.commenti, indent),
    `${indent}intento ${b.nome} {`,
    ...b.elementi.flatMap((el) => stampaElementoIntento(el, indent + "  ")),
    `${indent}}`,
  ];
}

function stampaVincoli(b: BloccoVincoli, indent: string): string[] {
  const fuori = [...righeCommenti(b.commenti, indent), `${indent}vincoli {`];
  for (const c of b.coppie) {
    fuori.push(...righeCommenti(c.commenti, indent + "  "));
    fuori.push(`${indent}  ${c.chiave}: ${c.virgolette ? virgolette(c.valore) : c.valore}`);
  }
  fuori.push(`${indent}}`);
  return fuori;
}

function stampaUscita(b: BloccoUscita, indent: string): string[] {
  const fuori = [...righeCommenti(b.commenti, indent), `${indent}uscita {`];
  for (const v of b.voci) {
    fuori.push(...righeCommenti(v.commenti, indent + "  "));
    if (v.valore !== undefined) {
      fuori.push(`${indent}  ${v.nome}: ${v.virgolette ? virgolette(v.valore) : v.valore}`);
    } else {
      fuori.push(`${indent}  ${v.nome}`);
    }
  }
  fuori.push(`${indent}}`);
  return fuori;
}

function stampaRigaDialetto(r: RigaDialetto, indent: string): string[] {
  const testa = righeCommenti(r.commenti, indent);
  if (r.genere === "aggiunge-tipo") return [...testa, `${indent}aggiunge tipo ${r.nome}`];
  if (r.genere === "aggiunge-blocco") return [...testa, `${indent}aggiunge blocco ${r.nome}`];
  return [...testa, `${indent}usa solo il kernel`];
}

function stampaDialetto(b: BloccoDialetto, indent: string): string[] {
  return [
    ...righeCommenti(b.commenti, indent),
    `${indent}dialetto ${b.nome} {`,
    ...b.righe.flatMap((r) => stampaRigaDialetto(r, indent + "  ")),
    `${indent}}`,
  ];
}

function stampaBlocco(b: Blocco, indent: string): string[] {
  switch (b.genere) {
    case "dato":
      return stampaIstruzione(b, indent);
    case "intento":
      return stampaIntento(b, indent);
    case "vincoli":
      return stampaVincoli(b, indent);
    case "uscita":
      return stampaUscita(b, indent);
    case "dialetto":
      return stampaDialetto(b, indent);
    case "usa-dialetto":
      return [...righeCommenti(b.commenti, indent), `${indent}usa dialetto ${b.nome}`];
    case "tipo":
      return [...righeCommenti(b.commenti, indent), `${indent}tipo ${b.nome}`];
    case "funzione":
      return stampaFunzione(b, indent);
    case "effetto":
      return stampaEffetto(b, indent);
    case "test":
      return stampaTest(b, indent);
    case "importa":
      return [...righeCommenti(b.commenti, indent), `${indent}importa ${b.nome} da ${virgolette(b.da)}`];
  }
}

export function stampa(ast: FileKernel): string {
  const parti: string[][] = [];
  if (ast.versione !== undefined) {
    const righeVersione: string[] = [...righeCommenti(ast.versioneCommenti ?? [], "")];
    righeVersione.push(`versione ${ast.versione}`);
    parti.push(righeVersione);
  }
  for (const b of ast.blocchi) {
    parti.push(stampaBlocco(b, ""));
  }
  if (ast.commentiFinali.length > 0) {
    parti.push(righeCommenti(ast.commentiFinali, ""));
  }
  const fuori = parti
    .filter((p) => p.length > 0)
    .map((p) => p.join("\n"))
    .join("\n\n");
  return fuori.length > 0 ? fuori + "\n" : "";
}
