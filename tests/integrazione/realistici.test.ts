import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import type { ErroreKernel } from "../../src/kernel/ast.js";
import { parse } from "../../src/kernel/parser.js";
import { stampa } from "../../src/kernel/stampa.js";
import { valuta } from "../../src/kernel/valuta.js";
import { trovaCicliImport } from "../../src/kernel/import.js";
import { radiceProgetto } from "../aiuto.js";

const cartellaReali = join(radiceProgetto(), "tests", "fixtures", "reali");

function descrivi(problemi: ErroreKernel[]): string {
  return problemi
    .map((e) => `${e.codice} riga ${e.riga}, colonna ${e.colonna}: ${e.messaggio}`)
    .join("; ");
}

function leggiReale(nome: string): string {
  return readFileSync(join(cartellaReali, nome), "utf8");
}

test("i programmi realistici si parsano, si stampano e si valutano puliti", async (t) => {
  const file = readdirSync(cartellaReali)
    .filter((f) => f.endsWith(".why"))
    .sort();
  assert.ok(file.length >= 6, `servono almeno sei programmi realistici, trovati ${file.length}`);
  for (const nome of file) {
    await t.test(nome, () => {
      const fonte = leggiReale(nome);
      const esito = parse(fonte);
      assert.ok(esito.ok, descrivi(esito.errori));
      const forma = stampa(esito.ast);
      const ritorno = parse(forma);
      assert.ok(ritorno.ok, descrivi(ritorno.errori));
      assert.equal(stampa(ritorno.ast), forma, "stampa non idempotente");
      const valutazione = valuta(esito.ast);
      assert.equal(valutazione.errori.length, 0, descrivi(valutazione.errori));
      assert.equal(valutazione.avvisi.length, 0, descrivi(valutazione.avvisi));
    });
  }
});

test("il progetto biblioteca non ha cicli di import", () => {
  const percorso = join(cartellaReali, "app.why");
  let letture = 0;
  const lettore = (riferimento: string): string | null => {
    letture++;
    const pieno = isAbsolute(riferimento) ? riferimento : join(cartellaReali, riferimento);
    try {
      return readFileSync(pieno, "utf8");
    } catch {
      return null;
    }
  };
  const cicli = trovaCicliImport(percorso, lettore);
  assert.equal(cicli.length, 0, descrivi(cicli));
  assert.ok(letture >= 3, `il controllo ha letto solo ${letture} file: non ha seguito gli import`);
});

test("un programma generato da oltre 2000 righe si processa in fretta", () => {
  const pezzi: string[] = ["versione 1"];
  for (let k = 0; k < 300; k++) {
    pezzi.push(
      `funzione passo_${k}(a: numero, b: numero) -> numero {\n` +
        `  variabile t = a + b * ${k + 1}\n` +
        `  se t > ${k} {\n` +
        `    ritorna t - ${k}\n` +
        `  }\n` +
        `  ritorna t\n` +
        `}`,
    );
  }
  pezzi.push("test i_primi_dieci {");
  pezzi.push("  dato primi = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
  for (let k = 0; k < 10; k++) {
    pezzi.push(`  verifica passo_1(${k}, 1) >= 0`);
  }
  pezzi.push("}");
  const fonte = pezzi.join("\n");
  const righe = fonte.split("\n").length;
  assert.ok(righe > 2000, `il programma generato ha solo ${righe} righe`);

  const inizio = Date.now();
  const esito = parse(fonte);
  assert.ok(esito.ok, descrivi(esito.errori).slice(0, 400));
  const forma = stampa(esito.ast);
  const ritorno = parse(forma);
  assert.ok(ritorno.ok, descrivi(ritorno.errori).slice(0, 400));
  const valutazione = valuta(ritorno.ast);
  assert.equal(valutazione.errori.length, 0, descrivi(valutazione.errori).slice(0, 400));
  const durata = Date.now() - inizio;
  assert.ok(durata < 5000, `troppo lento: ${durata} ms per ${righe} righe`);
});
