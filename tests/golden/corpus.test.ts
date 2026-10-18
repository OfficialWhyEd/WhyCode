import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../src/kernel/parser.js";
import { radiceProgetto } from "../aiuto.js";

interface Atteso {
  codice: string;
  riga: number;
  colonna: number;
}

test("tutti i 40 file validi si parsano", async (t) => {
  const cartella = join(radiceProgetto(), "tests", "fixtures", "kernel", "valid");
  const file = readdirSync(cartella)
    .filter((f) => f.endsWith(".why"))
    .sort();
  assert.equal(file.length, 40);
  for (const nome of file) {
    await t.test(nome, () => {
      const esito = parse(readFileSync(join(cartella, nome), "utf8"));
      assert.ok(esito.ok, esito.errori.map((e) => `${e.codice} r${e.riga}: ${e.messaggio}`).join("; "));
    });
  }
});

test("tutti i 10 file rotti danno il codice giusto, alla riga e colonna giuste", async (t) => {
  const cartella = join(radiceProgetto(), "tests", "fixtures", "kernel", "broken");
  const attesi = JSON.parse(readFileSync(join(cartella, "attesi.json"), "utf8")) as Record<string, Atteso>;
  const file = readdirSync(cartella)
    .filter((f) => f.endsWith(".why"))
    .sort();
  assert.equal(file.length, 10);
  for (const nome of file) {
    await t.test(nome, () => {
      const atteso = attesi[nome];
      assert.ok(atteso !== undefined, `manca l'atteso per ${nome}`);
      const esito = parse(readFileSync(join(cartella, nome), "utf8"));
      assert.ok(!esito.ok, `${nome} doveva fallire`);
      const primo = esito.errori[0];
      assert.equal(primo.codice, atteso.codice, `${nome}: ${primo.messaggio}`);
      assert.equal(primo.riga, atteso.riga, `${nome}: riga sbagliata (${primo.messaggio})`);
      assert.equal(primo.colonna, atteso.colonna, `${nome}: colonna sbagliata (${primo.messaggio})`);
    });
  }
});
