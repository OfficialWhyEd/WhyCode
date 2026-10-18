import { test } from "node:test";
import assert from "node:assert/strict";
import { trovaCicliImport } from "../../../src/kernel/import.js";

function lettoreMappa(mappa: Record<string, string>) {
  return (percorso: string): string | null => mappa[percorso] ?? null;
}

test("due file che si importano a vicenda danno K-117", () => {
  const errori = trovaCicliImport(
    "a.why",
    lettoreMappa({
      "a.why": 'importa conta da "b.why"\n',
      "b.why": 'importa somma da "a.why"\n',
    }),
  );
  assert.equal(errori.length, 1);
  assert.equal(errori[0].codice, "K-117");
  assert.match(errori[0].messaggio, /a\.why -> b\.why -> a\.why/);
  assert.equal(errori[0].riga, 1);
  assert.equal(errori[0].colonna, 1);
});

test("un file che importa se stesso da' K-117", () => {
  const errori = trovaCicliImport("a.why", lettoreMappa({ "a.why": 'importa conta da "a.why"\n' }));
  assert.equal(errori.length, 1);
  assert.equal(errori[0].codice, "K-117");
  assert.match(errori[0].messaggio, /a\.why -> a\.why/);
});

test("una catena di import senza cicli e' a posto", () => {
  const errori = trovaCicliImport(
    "a.why",
    lettoreMappa({
      "a.why": 'importa conta da "b.why"\n',
      "b.why": 'importa somma da "c.why"\n',
      "c.why": "funzione somma(x: numero) -> numero {\n  ritorna x\n}\n",
    }),
  );
  assert.equal(errori.length, 0);
});

test("un import verso un file che non c'e' non e' un ciclo", () => {
  const errori = trovaCicliImport("a.why", lettoreMappa({ "a.why": 'importa conta da "manca.why"\n' }));
  assert.equal(errori.length, 0);
});

test("una catena di import lunga 10000 non fa esplodere la pila", () => {
  const mappa: Record<string, string> = {};
  for (let k = 0; k < 10000; k++) {
    mappa[`f${k}.why`] = `importa f${k + 1} da "f${k + 1}.why"\n`;
  }
  mappa["f10000.why"] = "funzione fine() {\n}\n";
  const errori = trovaCicliImport("f0.why", lettoreMappa(mappa));
  assert.equal(errori.length, 0);
});
