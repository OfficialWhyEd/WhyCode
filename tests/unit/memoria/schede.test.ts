import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SchedaLingua } from "../../../src/condivisi/tipi.js";
import { ErroreWhyCode } from "../../../src/condivisi/errori.js";
import { caricaScheda, cartellaLingua, elencaSchede, percorsoScheda, salvaScheda } from "../../../src/memoria/schede.js";
import { cartellaTemporanea, pulisci } from "../../aiuto.js";

function schedaFinta(nome: string): SchedaLingua {
  return {
    nome,
    versione_studiata: "1.0",
    famiglia: "di prova",
    grammatica: { tipo: "regole", bnf: "prova" },
    uast_version: 1,
    idiomi: ["idioma di prova"],
    trappole: ["trappola di prova"],
    stile_default: { indent: 4, nomi: "snake", virgolette: "doppie" },
    benchmark: [{ numero: 1, cosa: "prova", esito: "ok", durata_ms: 10 }],
    stato: "in-prova",
    studiata_il: "2026-10-17T09:00:00+02:00",
    aggiornata: "2026-10-17T09:00:00+02:00",
  };
}

test("una scheda che non c'e' non e' un errore: e' null", () => {
  const dir = cartellaTemporanea();
  try {
    assert.equal(caricaScheda(dir, "mai-visto"), null);
  } finally {
    pulisci(dir);
  }
});

test("salvare e ricaricare una scheda torna identico", () => {
  const dir = cartellaTemporanea();
  try {
    const scheda = schedaFinta("prova");
    salvaScheda(dir, scheda);
    assert.ok(existsSync(percorsoScheda(dir, "prova")));
    assert.deepEqual(caricaScheda(dir, "prova"), scheda);
  } finally {
    pulisci(dir);
  }
});

test("ogni salvataggio lascia una riga nello storico e un backup dal secondo in poi", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("prova"));
    salvaScheda(dir, { ...schedaFinta("prova"), stato: "stabile" });
    const cartella = cartellaLingua(dir, "prova");
    const storico = readFileSync(join(cartella, "scheda.storico.jsonl"), "utf8")
      .split("\n")
      .filter((r) => r.trim().length > 0);
    assert.equal(storico.length, 2);
    const primaRiga = JSON.parse(storico[0]) as { azione: string; versione: string };
    assert.equal(primaRiga.azione, "salvata");
    assert.equal(primaRiga.versione, "1.0");
    const backup = readdirSync(cartella).filter((f) => f.startsWith("scheda.json.bak-"));
    assert.equal(backup.length, 1);
    assert.equal(caricaScheda(dir, "prova")?.stato, "stabile");
  } finally {
    pulisci(dir);
  }
});

test("elencaSchede ordina i nomi e ignora le cartelle senza scheda", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("zeta"));
    salvaScheda(dir, schedaFinta("alfa"));
    assert.deepEqual(elencaSchede(dir), ["alfa", "zeta"]);
    assert.deepEqual(elencaSchede(join(dir, "vuota-mai-creata")), []);
  } finally {
    pulisci(dir);
  }
});

test("una scheda scritta male da' E-SCHEMA invece di passare liscia", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("rotta"));
    writeFileSync(percorsoScheda(dir, "rotta"), JSON.stringify({ nome: "rotta" }), "utf8");
    try {
      caricaScheda(dir, "rotta");
      assert.fail("doveva lanciare");
    } catch (e) {
      assert.ok(e instanceof ErroreWhyCode);
      assert.equal(e.codice, "E-SCHEMA");
    }
  } finally {
    pulisci(dir);
  }
});

test("un nome con traversale (..\\fuori) viene rifiutato con E-SCHEMA", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("..\\fuori"));
    assert.fail("doveva lanciare");
  } catch (e) {
    assert.ok(e instanceof ErroreWhyCode);
    assert.equal(e.codice, "E-SCHEMA");
  } finally {
    pulisci(dir);
  }
});

test("un nome con slash ../fuori viene rifiutato con E-SCHEMA", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("../fuori"));
    assert.fail("doveva lanciare");
  } catch (e) {
    assert.ok(e instanceof ErroreWhyCode);
    assert.equal(e.codice, "E-SCHEMA");
  } finally {
    pulisci(dir);
  }
});
