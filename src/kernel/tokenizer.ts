/**
 * Tokenizzatore del kernel WhyCode.
 * Fonte: docs/SPEC-01-KERNEL.md, sezione 3.
 * Regole: le parole riservate del kernel non possono fare da nome (K-005),
 * le stringhe si chiudono sulla riga (K-004), i numeri sono interi o decimali con il punto.
 */
import type { ErroreKernel } from "./ast.js";

export type TipoToken = "parola" | "numero" | "testo" | "simbolo" | "commento" | "fine";

export interface Token {
  tipo: TipoToken;
  valore: string;
  riga: number;
  colonna: number;
}

export type EsitoTokenize = { ok: true; token: Token[] } | { ok: false; errori: ErroreKernel[] };

/**
 * Parole riservate del kernel: se usate come nome danno K-005.
 * Le parole contestuali (il, di, a, da, ogni, in, solo) NON sono qui:
 * valgono come parole chiave solo dove la grammatica le chiede.
 */
export const PAROLE_RISERVATE: ReadonlySet<string> = new Set([
  "versione",
  "intento",
  "descrizione",
  "dato",
  "variabile",
  "funzione",
  "effetto",
  "tipo",
  "test",
  "verifica",
  "atteso",
  "vincolo",
  "vincoli",
  "uscita",
  "dialetto",
  "aggiunge",
  "usa",
  "blocco",
  "kernel",
  "importa",
  "se",
  "altrimenti",
  "per",
  "mentre",
  "ritorna",
  "chiudi",
  "vero",
  "falso",
  "niente",
  "e",
  "o",
  "non",
  "lista",
  "mappa",
  "numero",
  "testo",
  "booleano",
  "uguale",
  "diverso",
]);

export const PAROLE_CONTESTUALI: ReadonlySet<string> = new Set(["il", "di", "a", "da", "ogni", "in", "solo"]);

const INIZIO_PAROLA = /[A-Za-z_\u00C0-\u024F]/;
const CARATTERE_PAROLA = /[A-Za-z0-9_\u00C0-\u024F]/;
const CIFRA = /[0-9]/;
const SIMBOLI = new Set(["(", ")", "[", "]", "{", "}", ",", ":", "=", "+", "-", "*", "/", "%", "<", ">"]);

export function tokenize(fonte: string): EsitoTokenize {
  const testo = fonte.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const token: Token[] = [];
  const errori: ErroreKernel[] = [];
  let indice = 0;
  let riga = 1;
  let colonna = 1;

  function avanza(passi = 1): void {
    for (let k = 0; k < passi; k++) {
      if (testo[indice] === "\n") {
        riga++;
        colonna = 1;
      } else {
        colonna++;
      }
      indice++;
    }
  }

  while (indice < testo.length) {
    const c = testo[indice];
    const posRiga = riga;
    const posColonna = colonna;

    if (c === " " || c === "\t" || c === "\n") {
      avanza();
      continue;
    }

    if (c === "#") {
      let fine = indice + 1;
      while (fine < testo.length && testo[fine] !== "\n") {
        fine++;
      }
      token.push({ tipo: "commento", valore: testo.slice(indice + 1, fine).trim(), riga: posRiga, colonna: posColonna });
      avanza(fine - indice);
      continue;
    }

    if (CIFRA.test(c)) {
      let fine = indice;
      while (fine < testo.length && CIFRA.test(testo[fine])) {
        fine++;
      }
      if (testo[fine] === ".") {
        fine++;
        if (fine >= testo.length || !CIFRA.test(testo[fine])) {
          errori.push({
            codice: "K-001",
            messaggio: `Numero non valido alla riga ${posRiga}: dopo il punto serve almeno una cifra`,
            riga: posRiga,
            colonna: posColonna,
            rimedio: "scrivi un numero tipo 3.14 oppure togli il punto",
          });
        }
        while (fine < testo.length && CIFRA.test(testo[fine])) {
          fine++;
        }
      }
      token.push({ tipo: "numero", valore: testo.slice(indice, fine), riga: posRiga, colonna: posColonna });
      avanza(fine - indice);
      continue;
    }

    if (INIZIO_PAROLA.test(c)) {
      let fine = indice;
      while (fine < testo.length && CARATTERE_PAROLA.test(testo[fine])) {
        fine++;
      }
      token.push({ tipo: "parola", valore: testo.slice(indice, fine), riga: posRiga, colonna: posColonna });
      avanza(fine - indice);
      continue;
    }

    if (c === '"') {
      let valore = "";
      let fine = indice + 1;
      let rotto = false;
      while (fine < testo.length && testo[fine] !== '"' && testo[fine] !== "\n") {
        const cc = testo[fine];
        if (cc === "\\") {
          const dopo = testo[fine + 1];
          if (dopo === "n") {
            valore += "\n";
            fine += 2;
            continue;
          }
          if (dopo === "t") {
            valore += "\t";
            fine += 2;
            continue;
          }
          if (dopo === '"') {
            valore += '"';
            fine += 2;
            continue;
          }
          if (dopo === "\\") {
            valore += "\\";
            fine += 2;
            continue;
          }
          errori.push({
            codice: "K-004",
            messaggio: `Escape non valido alla riga ${riga}, colonna ${colonna + (fine - indice)}: \\${dopo ?? ""}`,
            riga,
            colonna: colonna + (fine - indice),
            rimedio: 'usa uno di questi escape: \\n \\t \\" \\\\',
          });
          rotto = true;
          break;
        }
        valore += cc;
        fine++;
      }
      if (!rotto && (fine >= testo.length || testo[fine] === "\n")) {
        errori.push({
          codice: "K-004",
          messaggio: `Stringa non chiusa alla riga ${posRiga}: il file finisce prima della chiusura`,
          riga: posRiga,
          colonna: posColonna,
          rimedio: 'chiudi la stringa con "',
        });
        rotto = true;
      }
      if (rotto) {
        while (fine < testo.length && testo[fine] !== '"' && testo[fine] !== "\n") {
          fine++;
        }
        if (fine < testo.length && testo[fine] === '"') {
          fine++;
        }
        avanza(fine - indice);
      } else {
        avanza(fine - indice + 1);
        token.push({ tipo: "testo", valore, riga: posRiga, colonna: posColonna });
      }
      continue;
    }

    if (c === "-" && testo[indice + 1] === ">") {
      token.push({ tipo: "simbolo", valore: "->", riga: posRiga, colonna: posColonna });
      avanza(2);
      continue;
    }
    if (c === "<" && testo[indice + 1] === "=") {
      token.push({ tipo: "simbolo", valore: "<=", riga: posRiga, colonna: posColonna });
      avanza(2);
      continue;
    }
    if (c === ">" && testo[indice + 1] === "=") {
      token.push({ tipo: "simbolo", valore: ">=", riga: posRiga, colonna: posColonna });
      avanza(2);
      continue;
    }
    if (SIMBOLI.has(c)) {
      token.push({ tipo: "simbolo", valore: c, riga: posRiga, colonna: posColonna });
      avanza();
      continue;
    }

    if (c === "\uFEFF" && indice === 0) {
      errori.push({
        codice: "K-001",
        messaggio: "Il file comincia con il BOM, un marchio invisibile: qui non serve",
        riga: posRiga,
        colonna: posColonna,
        rimedio: "salva il file come UTF-8 senza BOM",
      });
      avanza();
      continue;
    }

    errori.push({
      codice: "K-001",
      messaggio: `Carattere inatteso "${c}" alla riga ${posRiga}, colonna ${posColonna}`,
      riga: posRiga,
      colonna: posColonna,
      rimedio: "togli il carattere o sostituiscilo con uno del linguaggio",
    });
    avanza();
  }

  token.push({ tipo: "fine", valore: "", riga, colonna });
  if (errori.length > 0) {
    return { ok: false, errori };
  }
  return { ok: true, token };
}
