import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../../src/kernel/parser.js";
import { stampa } from "../../../src/kernel/stampa.js";
import { radiceProgetto } from "../../aiuto.js";

function ristampa(fonte: string): string {
  const esito = parse(fonte);
  assert.ok(esito.ok, esito.errori.map((e) => `${e.codice} r${e.riga}: ${e.messaggio}`).join("; "));
  return stampa(esito.ast);
}

test("un modulo gia' ordinato resta identico", () => {
  const fonte = [
    "versione 1",
    "",
    "intento conto {",
    '  descrizione "esempio"',
    "  dato soglia: numero = 10",
    '  variabile stato = "pronto"',
    "  funzione doppio(x: numero) -> numero {",
    "    ritorna x * 2",
    "  }",
    "  test conto_bene {",
    "    atteso doppio(2) uguale 4",
    "  }",
    "  vincolo soglia > 0",
    "}",
    "",
  ].join("\n");
  assert.equal(ristampa(fonte), fonte);
});

test("i commenti restano attaccati al loro posto", () => {
  const fonte =
    "# sopra la versione\nversione 1\n\n# sopra la funzione\nfunzione f() {\n  # dentro\n  ritorna 1\n}\n\n# in fondo\n";
  assert.equal(ristampa(fonte), fonte);
});

test("le parentesi si mettono solo dove servono", () => {
  assert.equal(ristampa("funzione f() -> numero {\n  ritorna 1 + 2 * 3\n}\n"), "funzione f() -> numero {\n  ritorna 1 + 2 * 3\n}\n");
  assert.equal(ristampa("funzione f() -> numero {\n  ritorna (1 + 2) * 3\n}\n"), "funzione f() -> numero {\n  ritorna (1 + 2) * 3\n}\n");
  assert.equal(ristampa("funzione f() -> numero {\n  ritorna 1 - (2 - 3)\n}\n"), "funzione f() -> numero {\n  ritorna 1 - (2 - 3)\n}\n");
  assert.equal(ristampa("funzione f() -> numero {\n  ritorna 20 / 4 / 2\n}\n"), "funzione f() -> numero {\n  ritorna 20 / 4 / 2\n}\n");
});

test("i valori delle coppie restano come sono nati", () => {
  const fonte = 'vincoli {\n  uscita: automatico\n  tono: "amichevole"\n}\n\nuscita {\n  codice\n  nome_file: "saluto"\n}\n';
  assert.equal(ristampa(fonte), fonte);
});

test("le stringhe con escape si ristampano identiche", () => {
  const fonte = 'funzione f() -> testo {\n  ritorna "a\\nb\\t\\"c\\" \\\\"\n}\n';
  assert.equal(ristampa(fonte), fonte);
});

test("i fine riga CRLF diventano LF", () => {
  assert.equal(ristampa("versione 1\r\n"), "versione 1\n");
});

test("la stampa e' un punto fisso sui file di prova", () => {
  const cartella = join(radiceProgetto(), "tests", "fixtures", "kernel", "valid");
  for (const nome of ["v06", "v09", "v12", "v14", "v23", "v37", "v38"]) {
    const fonte = readFileSync(join(cartella, `${nome}.why`), "utf8");
    const unaVolta = ristampa(fonte);
    assert.equal(ristampa(unaVolta), unaVolta, `${nome} non e' punto fisso`);
  }
});

test("il tipo esplicito si conserva nella stampa", () => {
  const fonte = "funzione f() -> lista di numero {\n  variabile coda: lista di numero = []\n  ritorna coda\n}\n";
  assert.equal(ristampa(fonte), fonte);
});

test("i decimali perdono gli zeri inutili in coda", () => {
  assert.equal(ristampa("dato prezzo = 3.50\n"), "dato prezzo = 3.5\n");
  assert.equal(ristampa("dato prezzo = 3.00\n"), "dato prezzo = 3\n");
  assert.equal(ristampa("dato prezzo = 0.50\n"), "dato prezzo = 0.5\n");
});
