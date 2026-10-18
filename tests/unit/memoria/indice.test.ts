import { test } from "node:test";
import assert from "node:assert/strict";
import type { SchedaLingua } from "../../../src/condivisi/tipi.js";
import { aggiornaIndice, cercaSimili, leggiIndice, percorsoIndice } from "../../../src/memoria/indice.js";
import { salvaScheda } from "../../../src/memoria/schede.js";
import { cartellaTemporanea, pulisci } from "../../aiuto.js";

function schedaFinta(nome: string, extra?: Partial<SchedaLingua>): SchedaLingua {
  return {
    nome,
    versione_studiata: "1.0",
    famiglia: "di prova",
    grammatica: { tipo: "regole" },
    uast_version: 1,
    idiomi: [],
    trappole: [],
    stile_default: { indent: 2, nomi: "snake", virgolette: "doppie" },
    benchmark: [],
    stato: "in-prova",
    studiata_il: "2026-10-17T09:00:00+02:00",
    aggiornata: "2026-10-17T09:00:00+02:00",
    ...extra,
  };
}

test("indice mancante vuol dire elenco vuoto", () => {
  const dir = cartellaTemporanea();
  try {
    assert.deepEqual(leggiIndice(dir), []);
    assert.ok(percorsoIndice(dir).endsWith("indice.json"));
  } finally {
    pulisci(dir);
  }
});

test("l'indice tiene le voci ordinate e senza doppioni", () => {
  const dir = cartellaTemporanea();
  try {
    aggiornaIndice(dir, { nome: "zeta", aggiunta: "2026-10-17T09:00:00+02:00", stato: "in-prova" });
    aggiornaIndice(dir, { nome: "alfa", aggiunta: "2026-10-17T09:00:00+02:00", stato: "in-prova" });
    aggiornaIndice(dir, { nome: "zeta", aggiunta: "2026-10-17T09:00:00+02:00", stato: "stabile" });
    const voci = leggiIndice(dir);
    assert.deepEqual(
      voci.map((v) => v.nome),
      ["alfa", "zeta"],
    );
    assert.equal(voci[1].stato, "stabile", "la voce ripetuta si aggiorna, non si duplica");
  } finally {
    pulisci(dir);
  }
});

test("cercaSimili trova per famiglia, idiomi e trappole", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("alfa", { famiglia: "famiglia-a", idiomi: ["cicli a indice"] }));
    salvaScheda(dir, schedaFinta("beta", { famiglia: "famiglia-b", trappole: ["virgolette matte"] }));
    assert.deepEqual(
      cercaSimili(dir, ["famiglia-a"]).map((s) => s.nome),
      ["alfa"],
    );
    assert.deepEqual(
      cercaSimili(dir, ["VIRGOLETTE"]).map((s) => s.nome),
      ["beta"],
    );
    assert.deepEqual(
      cercaSimili(dir, ["cicli"]).map((s) => s.nome),
      ["alfa"],
    );
  } finally {
    pulisci(dir);
  }
});

test("cercaSimili senza caratteristiche non cerca niente", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(dir, schedaFinta("alfa"));
    assert.deepEqual(cercaSimili(dir, []), []);
    assert.deepEqual(cercaSimili(dir, ["   "]), []);
    assert.deepEqual(cercaSimili(dir, ["inesistente"]), []);
  } finally {
    pulisci(dir);
  }
});
