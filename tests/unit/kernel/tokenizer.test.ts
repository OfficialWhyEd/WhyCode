import { test } from "node:test";
import assert from "node:assert/strict";
import { PAROLE_CONTESTUALI, PAROLE_RISERVATE, tokenize } from "../../../src/kernel/tokenizer.js";

test("tokenizza una versione con numero", () => {
  const esito = tokenize("versione 1\n");
  assert.ok(esito.ok);
  assert.deepEqual(
    esito.token.map((t) => [t.tipo, t.valore]),
    [
      ["parola", "versione"],
      ["numero", "1"],
      ["fine", ""],
    ],
  );
  assert.deepEqual(esito.token[0].riga === 1 && esito.token[0].colonna === 1, true);
});

test("i commenti diventano token commento senza cancelletto", () => {
  const esito = tokenize("# ciao mondo\nversione 1\n");
  assert.ok(esito.ok);
  assert.equal(esito.token[0].tipo, "commento");
  assert.equal(esito.token[0].valore, "ciao mondo");
  assert.equal(esito.token[1].riga, 2);
});

test("le stringhe si leggono con gli escape", () => {
  const esito = tokenize('"a\\nb\\t\\"c\\" è"');
  assert.ok(esito.ok);
  assert.equal(esito.token[0].tipo, "testo");
  assert.equal(esito.token[0].valore, 'a\nb\t"c" è');
});

test("stringa mai chiusa: K-004 alla riga giusta", () => {
  const esito = tokenize('funzione f() {\n  dato x = "mai chiusa\n}\n');
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-004");
  assert.equal(esito.errori[0].riga, 2);
  assert.equal(esito.errori[0].colonna, 12);
});

test("escape sconosciuto: K-004 sulla colonna della barra", () => {
  const esito = tokenize('dato x = "boh \\q"\n');
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-004");
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[0].colonna, 15);
});

test("carattere inatteso: K-001", () => {
  const esito = tokenize("versione 1 @ 2\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[0].colonna, 12);
});

test("un BOM all'inizio viene spiegato con parole chiare: K-001", () => {
  const esito = tokenize("\uFEFFversione 1\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[0].colonna, 1);
  assert.ok(esito.errori[0].messaggio.includes("BOM"), esito.errori[0].messaggio);
  assert.ok(esito.errori[0].rimedio.includes("senza BOM"), esito.errori[0].rimedio);
});

test("numero con punto senza cifre: K-001", () => {
  const esito = tokenize("dato x = 3.\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
});

test("i simboli doppi -> <= >= si leggono interi", () => {
  const esito = tokenize("-> <= >= %\n");
  assert.ok(esito.ok);
  assert.deepEqual(
    esito.token.slice(0, 4).map((t) => t.valore),
    ["->", "<=", ">=", "%"],
  );
});

test("CRLF e CR da soli contano come una sola andata a capo", () => {
  const esito = tokenize("versione 1\r\nfunzione f() {\r}\n");
  assert.ok(esito.ok);
  const funzione = esito.token.find((t) => t.valore === "funzione");
  assert.ok(funzione);
  assert.equal(funzione.riga, 2);
  assert.equal(funzione.colonna, 1);
});

test("le parole riservate e quelle contestuali sono due elenchi distinti", () => {
  assert.ok(PAROLE_RISERVATE.has("versione"));
  assert.ok(PAROLE_RISERVATE.has("uguale"));
  assert.ok(PAROLE_RISERVATE.has("diverso"));
  assert.ok(!PAROLE_RISERVATE.has("il"));
  assert.ok(PAROLE_CONTESTUALI.has("il"));
  assert.ok(PAROLE_CONTESTUALI.has("ogni"));
  assert.ok(!PAROLE_CONTESTUALI.has("versione"));
});

test("i numeri decimali si leggono interi, con la parte decimale", () => {
  const esito = tokenize("3.50 0.5 10");
  assert.ok(esito.ok);
  assert.deepEqual(
    esito.token.slice(0, 3).map((t) => t.valore),
    ["3.50", "0.5", "10"],
  );
});
