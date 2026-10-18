import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SchedaLingua } from "../../src/condivisi/tipi.js";
import { sha256 } from "../../src/condivisi/hash.js";
import { parse } from "../../src/kernel/parser.js";
import { stampa } from "../../src/kernel/stampa.js";
import { caricaScheda, elencaSchede, salvaScheda } from "../../src/memoria/schede.js";
import { aggiornaIndice, leggiIndice } from "../../src/memoria/indice.js";
import { cartellaTemporanea, pulisci } from "../aiuto.js";

test("dal sorgente .why alla scheda in memoria", () => {
  const dir = cartellaTemporanea();
  try {
    const sorgente = 'usa dialetto grafica\n\nintento disegna {\n  effetto apri(l: numero) -> Superficie\n  vincolo l >= 0\n}\n';
    const fileWhy = join(dir, "disegno.why");
    writeFileSync(fileWhy, sorgente, "utf8");

    const esito = parse(readFileSync(fileWhy, "utf8"));
    assert.ok(esito.ok, "il sorgente del dialetto si parsa");

    const scheda: SchedaLingua = {
      nome: "disegno",
      versione_studiata: "1",
      famiglia: "grafici",
      grammatica: { tipo: "regole" },
      uast_version: 1,
      idiomi: ["vincoli sui parametri"],
      trappole: [],
      stile_default: { indent: 2, nomi: "snake", virgolette: "doppie" },
      benchmark: [],
      stato: "in-prova",
      studiata_il: "2026-10-17T09:00:00+02:00",
      aggiornata: "2026-10-17T09:00:00+02:00",
      note: sha256(sorgente),
    };
    salvaScheda(dir, scheda);
    aggiornaIndice(dir, { nome: "disegno", aggiunta: "2026-10-17T09:00:00+02:00", stato: "in-prova", famiglia: "grafici" });

    const ricaricata = caricaScheda(dir, "disegno");
    assert.ok(ricaricata !== null);
    assert.equal(ricaricata.note, sha256(sorgente), "l'hash del sorgente e' lo stesso");
    assert.deepEqual(elencaSchede(dir), ["disegno"]);
    const indice = leggiIndice(dir);
    assert.equal(indice.length, 1);
    assert.equal(indice[0].famiglia, "grafici");
    assert.equal(stampa(esito.ast), sorgente.replace(/\r\n/g, "\n"), "il sorgente era gia' in forma canonica");
  } finally {
    pulisci(dir);
  }
});

test("kernel e memoria insieme: parse, stampa, risalvataggio senza perdite", () => {
  const dir = cartellaTemporanea();
  try {
    const sorgente = "funzione doppio(n: numero) -> numero {\n  ritorna n * 2\n}\n\ntest doppio_bene {\n  atteso doppio(2) uguale 4\n}\n";
    const esito = parse(sorgente);
    assert.ok(esito.ok);
    const canonico = stampa(esito.ast);
    const riparsato = parse(canonico);
    assert.ok(riparsato.ok, "la stampa resta parsabile");
    assert.equal(stampa(riparsato.ast), canonico, "e la stampa e' stabile");

    const scheda: SchedaLingua = {
      nome: "prova",
      versione_studiata: "1",
      grammatica: { tipo: "regole" },
      uast_version: 1,
      idiomi: [],
      trappole: [],
      stile_default: { indent: 2, nomi: "snake", virgolette: "doppie" },
      benchmark: [{ numero: 1, cosa: "parse del canonico", esito: "ok", durata_ms: 1 }],
      stato: "stabile",
      studiata_il: "2026-10-17T09:00:00+02:00",
      aggiornata: "2026-10-17T09:00:00+02:00",
    };
    salvaScheda(dir, scheda);
    salvaScheda(dir, { ...scheda, versione_studiata: "2" });
    assert.equal(caricaScheda(dir, "prova")?.versione_studiata, "2");
  } finally {
    pulisci(dir);
  }
});
