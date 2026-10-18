import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SchedaLingua } from "../../src/condivisi/tipi.js";
import { parse } from "../../src/kernel/parser.js";
import { stampa } from "../../src/kernel/stampa.js";
import { salvaScheda } from "../../src/memoria/schede.js";
import { cartellaTemporanea, pulisci, radiceProgetto } from "../aiuto.js";

function whycode(argomenti: string[], cwd: string): { status: number | null; out: string } {
  const percorso = join(radiceProgetto(), "build", "tools", "whycode.js");
  const esito = spawnSync(process.execPath, [percorso, ...argomenti], { cwd, encoding: "utf8" });
  return { status: esito.status, out: `${esito.stdout ?? ""}${esito.stderr ?? ""}` };
}

function schedaFinta(nome: string): SchedaLingua {
  return {
    nome,
    versione_studiata: "1",
    grammatica: { tipo: "regole" },
    uast_version: 1,
    idiomi: [],
    trappole: [],
    stile_default: { indent: 2, nomi: "snake", virgolette: "doppie" },
    benchmark: [],
    stato: "in-prova",
    studiata_il: "2026-10-17T09:00:00+02:00",
    aggiornata: "2026-10-17T09:00:00+02:00",
  };
}

test("whycode --versione funziona a motore spento", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode(["--versione"], dir);
    assert.equal(esito.status, 0);
    assert.ok(esito.out.includes("WhyCode"), esito.out);
    assert.ok(esito.out.includes(process.version), esito.out);
    assert.ok(esito.out.includes("1235"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("senza argomenti si comporta come --versione", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode([], dir);
    assert.equal(esito.status, 0);
    assert.ok(esito.out.includes("WhyCode"));
  } finally {
    pulisci(dir);
  }
});

test("memoria vedi su memoria vuota spiega che non c'e' niente", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode(["memoria", "vedi"], dir);
    assert.equal(esito.status, 0);
    assert.ok(esito.out.includes("non c'e' ancora nessun linguaggio"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("memoria vedi elenca e mostra le schede a motore spento", () => {
  const dir = cartellaTemporanea();
  try {
    salvaScheda(join(dir, "kb"), schedaFinta("demo"));
    const elenco = whycode(["memoria", "vedi"], dir);
    assert.equal(elenco.status, 0);
    assert.ok(elenco.out.includes("demo"), elenco.out);
    const dettaglio = whycode(["memoria", "vedi", "demo"], dir);
    assert.equal(dettaglio.status, 0);
    assert.ok(dettaglio.out.includes("Scheda di demo"), dettaglio.out);
    const manca = whycode(["memoria", "vedi", "mai-visto"], dir);
    assert.equal(manca.status, 1);
    assert.ok(manca.out.includes('Non ho trovato la scheda di "mai-visto"'), manca.out);
  } finally {
    pulisci(dir);
  }
});

test("report test fuori dal progetto lo dice chiaro", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode(["report", "test"], dir);
    assert.equal(esito.status, 2);
    assert.ok(esito.out.includes("radice del progetto"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("un comando sconosciuto esce con 2 e suggerisce i comandi", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode(["fai", "magie"], dir);
    assert.equal(esito.status, 2);
    assert.ok(esito.out.includes("Comando non riconosciuto"));
    assert.ok(esito.out.includes("--versione"));
    assert.ok(esito.out.includes("controlla"));
  } finally {
    pulisci(dir);
  }
});

test("controlla dice OK su un programma realistico", () => {
  const dir = cartellaTemporanea();
  try {
    const percorso = join(radiceProgetto(), "tests", "fixtures", "reali", "calcolatrice.why");
    const esito = whycode(["controlla", percorso], dir);
    assert.equal(esito.status, 0, esito.out);
    assert.ok(esito.out.includes("OK:"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("controlla segnala errori con codice, posizione e rimedio", () => {
  const dir = cartellaTemporanea();
  try {
    const rotto = join(dir, "rotto.why");
    writeFileSync(rotto, "funzione f() {\n  ritorna 1\n", "utf8");
    const esito = whycode(["controlla", rotto], dir);
    assert.equal(esito.status, 1);
    assert.ok(esito.out.includes("K-0"), esito.out);
    assert.ok(esito.out.includes("rimedio:"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("controlla becca i cicli di import tra file vicini", () => {
  const dir = cartellaTemporanea();
  try {
    writeFileSync(join(dir, "a.why"), 'versione 1\n\nimporta uno da "b.why"\n', "utf8");
    writeFileSync(join(dir, "b.why"), 'versione 1\n\nimporta due da "a.why"\n', "utf8");
    const esito = whycode(["controlla", join(dir, "a.why")], dir);
    assert.equal(esito.status, 1);
    assert.ok(esito.out.includes("K-117"), esito.out);
    assert.ok(esito.out.includes("Cicli di import"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("controlla su un file che non esiste esce con 2", () => {
  const dir = cartellaTemporanea();
  try {
    const esito = whycode(["controlla", join(dir, "fantasma.why")], dir);
    assert.equal(esito.status, 2);
    assert.ok(esito.out.includes("File non trovato"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("stampa riscrive un file sporco in forma pulita e idempotente", () => {
  const dir = cartellaTemporanea();
  try {
    const sporco = join(dir, "sporco.why");
    writeFileSync(sporco, "versione 1\n\n\nfunzione   f(a:numero)->numero{\n        ritorna a+1\n}\n\n\n", "utf8");
    const esito = whycode(["stampa", sporco], dir);
    assert.equal(esito.status, 0, esito.out);
    const ripulito = parse(esito.out);
    assert.ok(ripulito.ok);
    assert.equal(stampa(ripulito.ast), esito.out, "stampa non idempotente");
    assert.ok(esito.out.includes("ritorna a + 1"), esito.out);
  } finally {
    pulisci(dir);
  }
});

test("stampa su un file rotto esce con 1 e non scrive niente", () => {
  const dir = cartellaTemporanea();
  try {
    const rotto = join(dir, "rotto.why");
    writeFileSync(rotto, "versione\n", "utf8");
    const esito = whycode(["stampa", rotto], dir);
    assert.equal(esito.status, 1);
    assert.ok(esito.out.includes("K-0"), esito.out);
    assert.ok(!esito.out.includes("versione 1"), esito.out);
  } finally {
    pulisci(dir);
  }
});
