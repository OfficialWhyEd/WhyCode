#!/usr/bin/env node
/**
 * Strumento a riga di comando di WhyCode.
 * Fonte: docs/PIANO-IMPLEMENTAZIONE.md, Fase 0, e SPEC-09 Appendice A.
 * Comandi: --versione, controlla <file.why>, stampa <file.why>, memoria vedi [linguaggio], report test.
 * Tutto deve funzionare anche a motore spento: qui non si chiama mai la rete.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import type { ErroreKernel } from "../src/kernel/ast.js";
import { parse } from "../src/kernel/parser.js";
import { stampa } from "../src/kernel/stampa.js";
import { valuta } from "../src/kernel/valuta.js";
import { trovaCicliImport } from "../src/kernel/import.js";
import { caricaScheda, elencaSchede } from "../src/memoria/schede.js";
import { leggiIndice } from "../src/memoria/indice.js";
import { aggiungiRigaJsonl } from "../src/condivisi/json.js";
import { durataMs, oraIso } from "../src/condivisi/tempo.js";

const RADICE_PROGETTO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function versione(): string {
  const pkg = JSON.parse(readFileSync(join(RADICE_PROGETTO, "package.json"), "utf8")) as { version?: string };
  return pkg.version ?? "0.0.0";
}

export function memoriaVedi(argomenti: string[], base: string): number {
  if (argomenti[0] !== "vedi") {
    console.log("Uso: whycode memoria vedi [linguaggio]");
    return 2;
  }
  const kbDir = join(base, "kb");
  const lingua = argomenti[1];
  if (lingua === undefined) {
    const voci = leggiIndice(kbDir);
    if (voci.length > 0) {
      console.log("Nella memoria ci sono questi linguaggi:");
      for (const v of voci) {
        console.log(`  ${v.nome} (${v.stato}, aggiunto il ${v.aggiunta})`);
      }
      return 0;
    }
    const schede = elencaSchede(kbDir);
    if (schede.length === 0) {
      console.log("Nella memoria non c'e' ancora nessun linguaggio.");
      return 0;
    }
    console.log("Nella memoria ci sono queste schede:");
    for (const s of schede) {
      console.log(`  ${s}`);
    }
    return 0;
  }
  const scheda = caricaScheda(kbDir, lingua);
  if (scheda === null) {
    console.log(`Non ho trovato la scheda di "${lingua}".`);
    return 1;
  }
  console.log(`Scheda di ${scheda.nome}`);
  console.log(`  versione studiata: ${scheda.versione_studiata}`);
  if (scheda.famiglia !== undefined) console.log(`  famiglia: ${scheda.famiglia}`);
  console.log(`  stato: ${scheda.stato}`);
  console.log(`  studiata il: ${scheda.studiata_il}`);
  console.log(`  aggiornata il: ${scheda.aggiornata}`);
  console.log(`  idiomi: ${scheda.idiomi.length}`);
  console.log(`  trappole: ${scheda.trappole.length}`);
  console.log(`  prove fatte: ${scheda.benchmark.length}`);
  return 0;
}

function compilaElencoTest(cartella: string): string[] {
  const fuori: string[] = [];
  if (!existsSync(cartella)) return fuori;
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) {
      fuori.push(...compilaElencoTest(percorso));
    } else if (voce.name.endsWith(".test.js")) {
      fuori.push(percorso);
    }
  }
  return fuori.sort();
}

export function reportTest(base: string): number {
  if (!existsSync(join(base, "package.json"))) {
    console.log("report test va lanciato dalla radice del progetto WhyCode");
    return 2;
  }
  const fileTest = compilaElencoTest(join(base, "build", "tests"));
  if (fileTest.length === 0) {
    console.log("Non trovo test compilati in build/tests: lancia prima npm run build");
    return 2;
  }
  const inizio = Date.now();
  const esito = spawnSync(process.execPath, ["--test", ...fileTest], { cwd: base, encoding: "utf8" });
  const uscita = `${esito.stdout ?? ""}${esito.stderr ?? ""}`;
  process.stdout.write(uscita);
  const contaPass = /^(?:#|ℹ) +pass (\d+)$/m.exec(uscita);
  const contaFail = /^(?:#|ℹ) +fail (\d+)$/m.exec(uscita);
  const passati = contaPass ? Number(contaPass[1]) : 0;
  const falliti = contaFail ? Number(contaFail[1]) : 0;
  const ok = esito.status === 0 && falliti === 0 && passati > 0;
  const durata = durataMs(inizio, Date.now());
  console.log(`REPORT: ${ok ? "OK" : "FALLITO"}: ${passati} passati, ${falliti} falliti, in ${(durata / 1000).toFixed(1)} secondi`);
  aggiungiRigaJsonl(join(base, "registro", "prove", "prove.jsonl"), {
    id: randomUUID(),
    ora: oraIso(),
    tipo: "prova",
    cosa: "tutti i test",
    comando: "node --test build/tests/**/*.test.js",
    esito: ok ? "ok" : "fallito",
    durata_ms: durata,
  });
  return ok ? 0 : 1;
}

function stampaProblemi(titolo: string, problemi: ErroreKernel[]): void {
  if (problemi.length === 0) return;
  console.log(`${titolo} (${problemi.length}):`);
  for (const p of problemi) {
    console.log(`  ${p.codice} riga ${p.riga}, colonna ${p.colonna}: ${p.messaggio}`);
    console.log(`    rimedio: ${p.rimedio}`);
  }
}

/** Legge un file .why accanto a un altro: risolve gli import relativi alla cartella. */
function lettoreAccanto(cartella: string) {
  return (riferimento: string): string | null => {
    const pieno = isAbsolute(riferimento) ? riferimento : join(cartella, riferimento);
    if (!existsSync(pieno)) return null;
    try {
      return readFileSync(pieno, "utf8");
    } catch {
      return null;
    }
  };
}

export function controlla(percorso: string | undefined): number {
  if (percorso === undefined) {
    console.log("Uso: whycode controlla <file.why>");
    return 2;
  }
  if (!existsSync(percorso)) {
    console.log(`File non trovato: ${percorso}`);
    return 2;
  }
  const fonte = readFileSync(percorso, "utf8");
  const esito = parse(fonte);
  if (!esito.ok) {
    stampaProblemi("Problemi trovati", esito.errori);
    return 1;
  }
  const valutazione = valuta(esito.ast);
  stampaProblemi("Errori", valutazione.errori);
  stampaProblemi("Avvisi (non bloccanti)", valutazione.avvisi);
  const cicli = trovaCicliImport(percorso, lettoreAccanto(dirname(percorso)));
  stampaProblemi("Cicli di import", cicli);
  const rotto = valutazione.errori.length > 0 || cicli.length > 0;
  if (!rotto) {
    console.log(`OK: ${percorso} e' a posto (${esito.ast.blocchi.length} blocchi).`);
  }
  return rotto ? 1 : 0;
}

export function stampaFile(percorso: string | undefined): number {
  if (percorso === undefined) {
    console.log("Uso: whycode stampa <file.why>");
    return 2;
  }
  if (!existsSync(percorso)) {
    console.log(`File non trovato: ${percorso}`);
    return 2;
  }
  const fonte = readFileSync(percorso, "utf8");
  const esito = parse(fonte);
  if (!esito.ok) {
    stampaProblemi("Problemi trovati", esito.errori);
    return 1;
  }
  process.stdout.write(stampa(esito.ast));
  return 0;
}

function main(): number {
  const argomenti = process.argv.slice(2);
  const primo = argomenti[0];
  const base = process.cwd();
  if (primo === undefined || primo === "--versione" || primo === "versione") {
    console.log(`WhyCode ${versione()}`);
    console.log(`node ${process.version}, ${process.platform}`);
    console.log(`motore: ${process.env.WHYCODE_MOTORE_URL ?? "http://127.0.0.1:1235"}`);
    return 0;
  }
  if (primo === "memoria") {
    return memoriaVedi(argomenti.slice(1), base);
  }
  if (primo === "controlla") {
    return controlla(argomenti[1]);
  }
  if (primo === "stampa") {
    return stampaFile(argomenti[1]);
  }
  if (primo === "report") {
    if (argomenti[1] !== "test") {
      console.log("Uso: whycode report test");
      return 2;
    }
    return reportTest(base);
  }
  console.log(`Comando non riconosciuto: ${argomenti.join(" ")}`);
  console.log("Comandi: --versione, controlla <file.why>, stampa <file.why>, memoria vedi [linguaggio], report test");
  return 2;
}

const lanciatoDirettamente =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (lanciatoDirettamente) {
  process.exit(main());
}
