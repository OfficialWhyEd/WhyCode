import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../../src/kernel/parser.js";
import { radiceProgetto } from "../../aiuto.js";

function descriviErrori(esito: ReturnType<typeof parse>): string {
  return esito.errori.map((e) => `${e.codice} riga ${e.riga}, colonna ${e.colonna}: ${e.messaggio}`).join("; ");
}

test("un file vuoto e' valido e non ha blocchi", () => {
  const esito = parse("");
  assert.ok(esito.ok);
  assert.deepEqual(esito.ast.blocchi, []);
  assert.deepEqual(esito.ast.commentiFinali, []);
});

test("un file di soli commenti e' valido e li conserva", () => {
  const esito = parse("# primo\n# secondo\n");
  assert.ok(esito.ok);
  assert.deepEqual(esito.ast.commentiFinali, ["primo", "secondo"]);
});

test("dato e variabile possono stare in cima al file", () => {
  const esito = parse('dato saluto = "ciao"\nvariabile conto = 0\n');
  assert.ok(esito.ok, descriviErrori(esito));
  assert.deepEqual(
    esito.ast.blocchi.map((b) => b.genere),
    ["dato", "dato"],
  );
  const primo = esito.ast.blocchi[0];
  assert.ok(primo.genere === "dato" && primo.mutabile === false && primo.nome === "saluto");
  const secondo = esito.ast.blocchi[1];
  assert.ok(secondo.genere === "dato" && secondo.mutabile === true && secondo.nome === "conto");
});

test("versione dopo un altro blocco da' K-001", () => {
  const esito = parse("funzione f() {\n}\nversione 1\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
});

test("due versioni danno K-001 sulla seconda", () => {
  const esito = parse("versione 1\nversione 2\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
  assert.equal(esito.errori[0].riga, 2);
});

test("l'assegnazione si legge dentro una funzione", () => {
  const esito = parse("funzione f() {\n  variabile x = 1\n  x = x + 1\n  ritorna x\n}\n");
  assert.ok(esito.ok, descriviErrori(esito));
  const funzione = esito.ast.blocchi[0];
  assert.ok(funzione.genere === "funzione" && funzione.corpo !== undefined);
  assert.deepEqual(
    funzione.corpo.map((i) => i.genere),
    ["dato", "assegnazione", "ritorna"],
  );
});

test("l'assegnazione fuori da un blocco non e' valida: K-001", () => {
  const esito = parse("x = 1\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
});

test("per ogni senza in da' K-001", () => {
  const esito = parse("funzione f() {\n  per ogni x numeri {\n  }\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-001");
  assert.equal(esito.errori[0].riga, 2);
});

test("il recupero trova piu' di un errore nello stesso file", () => {
  const esito = parse("$\nfunzione f() {\n  ritorna 1 @ 2\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori.length, 2);
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[1].riga, 3);
});

test("una parola riservata come nome da' K-005", () => {
  const esito = parse("funzione test() {\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-005");
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[0].colonna, 10);
});

test("un nome con la maiuscola da' K-118", () => {
  const esito = parse("funzione Nome() {\n}\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-118");
  assert.equal(esito.errori[0].riga, 1);
  assert.equal(esito.errori[0].colonna, 10);
});

test("un tipo opaco con la minuscola da' K-118", () => {
  const esito = parse("tipo rubino\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-118");
  assert.equal(esito.errori[0].colonna, 6);
});

test("i valori delle coppie si leggono anche senza virgolette", () => {
  const esito = parse('vincoli {\n  uscita: automatico\n  tono: "amichevole"\n  ripetibili: vero\n}\n');
  assert.ok(esito.ok, descriviErrori(esito));
  const b = esito.ast.blocchi[0];
  assert.ok(b.genere === "vincoli");
  assert.deepEqual(
    b.coppie.map((c) => [c.chiave, c.valore, c.virgolette]),
    [
      ["uscita", "automatico", false],
      ["tono", "amichevole", true],
      ["ripetibili", "vero", false],
    ],
  );
});

test("l'uscita accetta voci con e senza valore", () => {
  const esito = parse('uscita {\n  nome_file: "saluto"\n  pronto\n}\n');
  assert.ok(esito.ok, descriviErrori(esito));
  const b = esito.ast.blocchi[0];
  assert.ok(b.genere === "uscita");
  assert.deepEqual(
    b.voci.map((v) => [v.nome, v.valore, v.virgolette]),
    [
      ["nome_file", "saluto", true],
      ["pronto", undefined, false],
    ],
  );
});

test("aggiunge blocco vuole un nome semplice, non per Nome", () => {
  const ok = parse("dialetto grafica {\n  aggiunge blocco formato\n}\n");
  assert.ok(ok.ok, descriviErrori(ok));
  const b = ok.ast.blocchi[0];
  assert.ok(b.genere === "dialetto" && b.righe[0].genere === "aggiunge-blocco" && b.righe[0].nome === "formato");
  const male = parse("dialetto g {\n  aggiunge blocco per formato\n}\n");
  assert.ok(!male.ok);
  assert.equal(male.errori[0].codice, "K-005");
});

test("l'operatore percento si legge con la precedenza giusta", () => {
  const esito = parse("funzione resto(a: numero, b: numero) -> numero {\n  ritorna a % b + 1\n}\n");
  assert.ok(esito.ok, descriviErrori(esito));
  const funzione = esito.ast.blocchi[0];
  assert.ok(funzione.genere === "funzione" && funzione.corpo !== undefined);
  const ritorna = funzione.corpo[0];
  assert.ok(ritorna.genere === "ritorna" && ritorna.valore !== undefined);
  assert.equal(ritorna.valore.genere, "binaria");
  assert.ok(ritorna.valore.genere === "binaria" && ritorna.valore.operatore === "+");
  assert.ok(ritorna.valore.genere === "binaria" && ritorna.valore.sinistra.genere === "binaria" && ritorna.valore.sinistra.operatore === "%");
});

test("la moltiplicazione lega piu' forte della somma", () => {
  const esito = parse("funzione f() -> numero {\n  ritorna 1 + 2 * 3\n}\n");
  assert.ok(esito.ok);
  const funzione = esito.ast.blocchi[0];
  assert.ok(funzione.genere === "funzione" && funzione.corpo !== undefined);
  const ritorna = funzione.corpo[0];
  assert.ok(ritorna.genere === "ritorna" && ritorna.valore !== undefined && ritorna.valore.genere === "binaria");
  if (ritorna.valore.genere === "binaria") {
    assert.equal(ritorna.valore.operatore, "+");
    assert.ok(ritorna.valore.destra.genere === "binaria" && ritorna.valore.destra.operatore === "*");
  }
});

test("gli errori del tokenizer arrivano al parser", () => {
  const esito = parse('funzione f() {\n  dato x = "aperta\n}\n');
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-004");
});

test("nessun errore doppio uguale nella stessa posizione", () => {
  const esito = parse("funzione f() {\n  se vero {\n    ritorna 1\n");
  assert.ok(!esito.ok);
  const chiavi = esito.errori.map((e) => `${e.codice}|${e.riga}|${e.colonna}`);
  assert.equal(new Set(chiavi).size, chiavi.length);
});

function esempiDelSpec(): { numero: string; testo: string }[] {
  const percorso = join(radiceProgetto(), "docs", "SPEC-01-KERNEL.md");
  const righe = readFileSync(percorso, "utf8").split("\n");
  const fuori: { numero: string; testo: string }[] = [];
  let i = 0;
  while (i < righe.length) {
    const trovato = /^### Esempio (\d+):/.exec(righe[i]);
    if (trovato === null) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < righe.length && righe[j].trim() === "") j++;
    assert.equal(righe[j], "```", `manca l'inizio del blocco dopo "${righe[i]}"`);
    j++;
    const corpo: string[] = [];
    while (j < righe.length && righe[j] !== "```") {
      corpo.push(righe[j]);
      j++;
    }
    assert.notEqual(j, righe.length, `blocco non chiuso per "${righe[i]}"`);
    fuori.push({ numero: trovato[1], testo: corpo.join("\n") + "\n" });
    i = j + 1;
  }
  return fuori;
}

test("i dodici esempi del SPEC-01 si parsano tutti", async (t) => {
  const esempi = esempiDelSpec();
  assert.equal(esempi.length, 12, "il SPEC-01 deve contenere 12 esempi");
  for (const esempio of esempi) {
    await t.test(`esempio ${esempio.numero}`, () => {
      const esito = parse(esempio.testo);
      assert.ok(esito.ok, descriviErrori(esito));
    });
  }
});

test("parentesi annidate 5000 volte danno K-120 gentile, non un crash", () => {
  const esito = parse("dato x = " + "(".repeat(5000) + "1" + ")".repeat(5000) + "\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-120");
});

test("blocchi se annidati 5000 volte danno K-120 gentile, non un crash", () => {
  const fonte = "funzione f() {\n" + "se vero {\n".repeat(5000) + "}\n".repeat(5000) + "}\n";
  const esito = parse(fonte);
  assert.ok(!esito.ok);
  assert.ok(esito.errori.some((e) => e.codice === "K-120"));
});

test("liste annidate 5000 volte danno K-120 gentile, non un crash", () => {
  const esito = parse("dato x = " + "[".repeat(5000) + "1" + "]".repeat(5000) + "\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-120");
});

test("un annidamento normale di 20 livelli passa liscio", () => {
  const esito = parse("dato x = " + "(".repeat(20) + "1" + ")".repeat(20) + "\n");
  assert.ok(esito.ok, descriviErrori(esito));
});

test("un nome con maiuscola accentata da' K-118, non passa liscia", () => {
  const esito = parse("dato Étiquette = 1\n");
  assert.ok(!esito.ok);
  assert.equal(esito.errori[0].codice, "K-118");
});

test("un tipo opaco con maiuscola accentata e' ammesso", () => {
  const esito = parse("tipo Étiquette\n");
  assert.ok(esito.ok, descriviErrori(esito));
});
