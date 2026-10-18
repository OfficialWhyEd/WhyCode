import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../../src/kernel/parser.js";
import { stampa } from "../../src/kernel/stampa.js";
import { radiceProgetto } from "../aiuto.js";

test("i golden del kernel: parse e stampa lasciano il file come e'", async (t) => {
  const cartella = join(radiceProgetto(), "tests", "golden", "kernel");
  const file = readdirSync(cartella)
    .filter((f) => f.endsWith(".why"))
    .sort();
  assert.ok(file.length >= 20, `attesi almeno 20 golden, trovati ${file.length}`);
  for (const nome of file) {
    await t.test(nome, () => {
      const percorso = join(cartella, nome);
      const attesoPercorso = percorso.replace(/\.why$/, ".atteso");
      assert.ok(existsSync(attesoPercorso), `manca ${nome.replace(/\.why$/, ".atteso")}: lancialo prima con node build/tools/golden.js aggiorna --conferma`);
      const esito = parse(readFileSync(percorso, "utf8"));
      assert.ok(esito.ok, esito.errori.map((e) => `${e.codice} r${e.riga}: ${e.messaggio}`).join("; "));
      assert.equal(stampa(esito.ast), readFileSync(attesoPercorso, "utf8"));
    });
  }
});

test("i golden sono un punto fisso anche al secondo giro", () => {
  const cartella = join(radiceProgetto(), "tests", "golden", "kernel");
  for (const nome of readdirSync(cartella).filter((f) => f.endsWith(".why"))) {
    const unaVolta = stampa(parse(readFileSync(join(cartella, nome), "utf8")).ast);
    const dueVolte = stampa(parse(unaVolta).ast);
    assert.equal(dueVolte, unaVolta, `${nome} non e' stabile al secondo giro`);
  }
});
