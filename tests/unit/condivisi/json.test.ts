import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  aggiungiRigaJsonl,
  assicuraCartella,
  leggiJson,
  leggiRigheJsonl,
  scriviJsonAtomico,
} from "../../../src/condivisi/json.js";
import { ErroreWhyCode } from "../../../src/condivisi/errori.js";
import { cartellaTemporanea, pulisci } from "../../aiuto.js";

const SchemaCane = z.object({ nome: z.string().min(1), eta: z.number().int() });

function cattura(fn: () => void): ErroreWhyCode {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ErroreWhyCode, "atteso un ErroreWhyCode");
    return e;
  }
  assert.fail("doveva lanciare un errore");
}

test("leggiJson su file mancante da' E-JSON-MANCANTE", () => {
  const dir = cartellaTemporanea();
  try {
    const e = cattura(() => leggiJson(join(dir, "non-c-e.json"), SchemaCane));
    assert.equal(e.codice, "E-JSON-MANCANTE");
    assert.equal(e.rimediabile, true);
  } finally {
    pulisci(dir);
  }
});

test("leggiJson su JSON rotto da' E-JSON-INVALIDO", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "rotto.json");
    writeFileSync(percorso, "{ non e' json", "utf8");
    const e = cattura(() => leggiJson(percorso, SchemaCane));
    assert.equal(e.codice, "E-JSON-INVALIDO");
  } finally {
    pulisci(dir);
  }
});

test("leggiJson su schema non rispettato da' E-SCHEMA con il campo", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "sbagliato.json");
    writeFileSync(percorso, JSON.stringify({ nome: "Rex", eta: "tanti" }), "utf8");
    const e = cattura(() => leggiJson(percorso, SchemaCane));
    assert.equal(e.codice, "E-SCHEMA");
    assert.ok(e.message.includes("eta"));
  } finally {
    pulisci(dir);
  }
});

test("scrivere e rileggere un JSON funziona", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "dati", "cane.json");
    scriviJsonAtomico(percorso, { nome: "Rex", eta: 3 });
    const letto = leggiJson(percorso, SchemaCane);
    assert.deepEqual(letto, { nome: "Rex", eta: 3 });
  } finally {
    pulisci(dir);
  }
});

test("riscrivere crea un backup .bak-<data> una volta al giorno", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "cane.json");
    scriviJsonAtomico(percorso, { nome: "Rex", eta: 3 });
    scriviJsonAtomico(percorso, { nome: "Rex", eta: 4 });
    scriviJsonAtomico(percorso, { nome: "Rex", eta: 5 });
    const attesi = readdirSync(join(dir)).filter((f) => f.startsWith("cane.json.bak-"));
    assert.equal(attesi.length, 1);
    const contenuto = JSON.parse(readFileSync(join(dir, attesi[0]), "utf8")) as { eta: number };
    assert.equal(contenuto.eta, 3, "il backup tiene la prima versione del giorno");
    assert.deepEqual(leggiJson(percorso, SchemaCane), { nome: "Rex", eta: 5 });
  } finally {
    pulisci(dir);
  }
});

test("quando la cartella non si puo' creare si lancia E-CARTELLA", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "cane.json");
    scriviJsonAtomico(percorso, { nome: "Rex", eta: 3 });
    const e = cattura(() => scriviJsonAtomico(join(percorso, "sotto"), { nome: "x", eta: 1 }));
    assert.equal(e.codice, "E-CARTELLA");
  } finally {
    pulisci(dir);
  }
});

test("quando il disco rifiuta il file si lancia E-SCRITTURA", () => {
  const dir = cartellaTemporanea();
  try {
    const e = cattura(() => scriviJsonAtomico(join(dir, "male\u0000nome.json"), { nome: "x", eta: 1 }));
    assert.equal(e.codice, "E-SCRITTURA");
  } finally {
    pulisci(dir);
  }
});

test("JSONL: append e rilettura con validazione", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "registri", "prove.jsonl");
    assert.deepEqual(leggiRigheJsonl(percorso, SchemaCane), [], "file mancante vuol dire zero righe");
    aggiungiRigaJsonl(percorso, { nome: "Rex", eta: 3 });
    aggiungiRigaJsonl(percorso, { nome: "Peggy", eta: 5 });
    assert.deepEqual(leggiRigheJsonl(percorso, SchemaCane), [
      { nome: "Rex", eta: 3 },
      { nome: "Peggy", eta: 5 },
    ]);
  } finally {
    pulisci(dir);
  }
});

test("JSONL: riga non JSON da' E-JSONL-INVALIDO con il numero di riga", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "prove.jsonl");
    aggiungiRigaJsonl(percorso, { nome: "Rex", eta: 3 });
    writeFileSync(percorso, `${readFileSync(percorso, "utf8")}non-json\n`, "utf8");
    const e = cattura(() => leggiRigheJsonl(percorso, SchemaCane));
    assert.equal(e.codice, "E-JSONL-INVALIDO");
    assert.ok(e.message.includes("Riga 2"));
  } finally {
    pulisci(dir);
  }
});

test("JSONL: riga fuori schema da' E-JSONL-SCHEMA", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(dir, "prove.jsonl");
    writeFileSync(percorso, `${JSON.stringify({ nome: "", eta: 3 })}\n`, "utf8");
    const e = cattura(() => leggiRigheJsonl(percorso, SchemaCane));
    assert.equal(e.codice, "E-JSONL-SCHEMA");
  } finally {
    pulisci(dir);
  }
});

test("assicuraCartella crea anche le cartelle intermedie", () => {
  const dir = cartellaTemporanea();
  try {
    const dentro = join(dir, "a", "b", "c");
    assicuraCartella(dentro);
    assert.ok(existsSync(dentro));
    assicuraCartella(dentro);
    assert.ok(existsSync(dentro), "chiamarla due volte non fa danno");
  } finally {
    pulisci(dir);
  }
});
