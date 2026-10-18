import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../../src/kernel/parser.js";
import { valuta } from "../../../src/kernel/valuta.js";

function codiceEsito(fonte: string): ReturnType<typeof valuta> {
  const esito = parse(fonte);
  assert.ok(esito.ok, "prima bisogna che il file si parsi");
  return valuta(esito.ast);
}

test("un modulo completo si valuta senza errori", () => {
  const fonte = [
    "versione 1",
    "",
    "intento pulisci_righe {",
    '  descrizione "togliere le righe vuote"',
    "  effetto leggi(percorso: testo) -> testo",
    "  funzione pulisci(dentro: testo) -> testo {",
    "    ritorna dentro",
    "  }",
    "  funzione lunghezza(dentro: testo) -> numero",
    "  test pulisci_semplice {",
    '    atteso pulisci("a\\n\\nb") uguale "a\\nb"',
    "  }",
    "  vincolo lunghezza(pulisci(\"ciao\")) uguale 4",
    "}",
    "",
    "vincoli {",
    "  uscita: automatico",
    "}",
    "",
    "uscita {",
    "  codice",
    "}",
    "",
  ].join("\n");
  const esito = codiceEsito(fonte);
  assert.ok(esito.ok, esito.errori.map((e) => `${e.codice}: ${e.messaggio}`).join("; "));
  assert.equal(esito.valutazione.intenti.length, 1);
  const intento = esito.valutazione.intenti[0];
  assert.equal(intento.nome, "pulisci_righe");
  assert.equal(intento.descrizione, "togliere le righe vuote");
  assert.equal(intento.funzioni.length, 2);
  assert.equal(intento.effetti.length, 1);
  assert.equal(intento.test.length, 1);
  assert.equal(intento.vincoli.length, 1);
  assert.deepEqual(esito.valutazione.vincoli, { uscita: "automatico" });
  assert.deepEqual(esito.valutazione.uscita, ["codice"]);
});

test("un dato in cima al file si vede dentro le funzioni", () => {
  const esito = codiceEsito("dato soglia = 10\n\nfunzione sopra(x: numero) -> booleano {\n  ritorna x > soglia\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("un nome mai dichiarato da' K-112", () => {
  const esito = codiceEsito("funzione f() -> numero {\n  ritorna manca\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-112");
});

test("chiamare un dato come funzione da' K-105", () => {
  const esito = codiceEsito("dato tre = 3\n\nfunzione f() -> numero {\n  ritorna tre(1)\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-105");
});

test("riassegnare un dato da' K-111", () => {
  const esito = codiceEsito("funzione f() {\n  dato x = 1\n  x = 2\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-111");
});

test("assegnare a un nome sconosciuto da' K-112", () => {
  const esito = codiceEsito("funzione f() {\n  x = 1\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-112");
});

test("una doppia dichiarazione in cima da' K-101", () => {
  const esito = codiceEsito("funzione doppio(x: numero) -> numero {\n  ritorna x * 2\n}\n\nfunzione doppio(x: numero) -> numero {\n  ritorna x + x\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-101");
});

test("un tipo opaco senza dialetto in uso da' K-104", () => {
  const esito = codiceEsito("funzione crea() -> Diamante {\n  ritorna niente\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-104");
});

test("con usa dialetto il tipo opaco non da' K-104", () => {
  const esito = codiceEsito('usa dialetto grafica\n\nfunzione crea() -> Superficie {\n  ritorna niente\n}\n');
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("un vincolo che chiama un effetto da' K-110", () => {
  const fonte = "intento pulito {\n  effetto leggi(percorso: testo) -> testo\n  vincolo leggi(\"file.txt\") uguale \"\"\n}\n";
  const esito = codiceEsito(fonte);
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-110");
});

test("un test vuoto da' K-114", () => {
  const esito = codiceEsito("test senza_controlli {\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-114");
});

test("un confronto con se stesso e' solo un avviso K-115", () => {
  const esito = codiceEsito("test sospetto {\n  atteso 1 uguale 1\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
  assert.equal(esito.avvisi.length, 1);
  assert.equal(esito.avvisi[0].codice, "K-115");
});

test("un confronto fra cose diverse non da' avvisi", () => {
  const esito = codiceEsito("test serio {\n  atteso 1 + 1 uguale 2\n}\n");
  assert.ok(esito.ok);
  assert.equal(esito.avvisi.length, 0);
});

test("i parametri senza nome non vengono dichiarati", () => {
  const esito = codiceEsito("funzione conta(testo, numero) -> numero {\n  ritorna 0\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("il ciclo per ogni dichiara il suo nome", () => {
  const esito = codiceEsito("funzione somma(numeri: lista di numero) -> numero {\n  variabile totale = 0\n  per ogni n in numeri {\n    totale = totale + n\n  }\n  ritorna totale\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("la descrizione finisce nell'intento valutato", () => {
  const esito = codiceEsito('intento piccolo {\n  descrizione "un intento minimo"\n}\n');
  assert.ok(esito.ok);
  assert.equal(esito.valutazione.intenti[0].descrizione, "un intento minimo");
});

test("una lista con tipi mescolati e' solo un avviso K-102", () => {
  const esito = codiceEsito('dato misto = [1, "due"]\n');
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
  assert.equal(esito.avvisi[0].codice, "K-102");
});

test("sommare testo e numero da' K-105", () => {
  const esito = codiceEsito('funzione f(t: testo) -> numero {\n  ritorna t + 1\n}\n');
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-105");
});

test("il meno su testo da' K-105", () => {
  const esito = codiceEsito('funzione f(t: testo) -> numero {\n  ritorna -t\n}\n');
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-105");
});

test("una chiamata a un nome mai dichiarato da' K-106", () => {
  const esito = codiceEsito("funzione f() -> numero {\n  ritorna magia(1)\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-106");
});

test("un ramo senza ritorna da' K-107", () => {
  const esito = codiceEsito("funzione f(x: numero) -> numero {\n  se x > 0 {\n    ritorna 1\n  }\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-107");
});

test("una funzione che ritorna in tutti i rami e' a posto", () => {
  const esito = codiceEsito("funzione f(x: numero) -> numero {\n  se x > 0 {\n    ritorna 1\n  } altrimenti {\n    ritorna 0\n  }\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("un mentre che non cambia mai da' solo un avviso K-108", () => {
  const esito = codiceEsito("funzione f() {\n  mentre 1 < 2 {\n    f2()\n  }\n}\n\nfunzione f2() {\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
  assert.equal(esito.avvisi[0].codice, "K-108");
});

test("un mentre che assegna un nome della condizione non da' K-108", () => {
  const esito = codiceEsito("funzione f() {\n  variabile i = 0\n  mentre i < 3 {\n    i = i + 1\n  }\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
  assert.equal(esito.avvisi.length, 0);
});

test("il codice dopo ritorna e' solo un avviso K-109", () => {
  const esito = codiceEsito("funzione f() -> numero {\n  ritorna 1\n  effettua()\n}\n\nfunzione effettua() {\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
  assert.equal(esito.avvisi[0].codice, "K-109");
});

test("un vincolo che non e' un'affermazione da' K-113", () => {
  const esito = codiceEsito("funzione f() -> numero {\n  ritorna 1\n}\n\nintento strano {\n  vincolo 5\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-113");
});

test("un vincolo che e' un confronto non da' K-113", () => {
  const esito = codiceEsito("dato soglia = 10\n\nintento sensato {\n  vincolo soglia > 0\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("una lista vuota senza tipo da' K-116", () => {
  const esito = codiceEsito("dato vuota = []\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-116");
});

test("una lista vuota con il tipo dichiarato e' a posto", () => {
  const esito = codiceEsito("dato vuota: lista di numero = []\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("un dialetto senza usa solo il kernel da' K-119", () => {
  const esito = codiceEsito("dialetto abbozzo {\n  aggiunge tipo Cosa\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-119");
});

test("un dialetto completo con usa solo il kernel e' a posto", () => {
  const esito = codiceEsito("dialetto grafica {\n  usa solo il kernel\n  aggiunge tipo Superficie\n  aggiunge blocco disegno\n}\n");
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});

test("un nome importato si puo' chiamare", () => {
  const esito = codiceEsito('importa conta da "utilita.why"\n\nfunzione f() -> numero {\n  ritorna conta(1)\n}\n');
  assert.ok(esito.ok, esito.errori.map((e) => e.messaggio).join("; "));
});
