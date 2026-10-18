#!/usr/bin/env node
/**
 * Golden del kernel: parse e stampa devono lasciare i file di prova esattamente come sono.
 * Fonte: docs/PIANO-IMPLEMENTAZIONE.md, Fase 0.
 * Uso: node build/tools/golden.js verifica | aggiorna --conferma [cartella]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parse, stampa } from "../src/kernel/index.js";
import { aggiungiRigaJsonl } from "../src/condivisi/json.js";
import { durataMs, oraIso } from "../src/condivisi/tempo.js";

export interface EsitoGolden {
  ok: boolean;
  righe: string[];
}

function primoDiverso(trovato: string, atteso: string): string {
  const righeTrovate = trovato.split("\n");
  const righeAttese = atteso.split("\n");
  const n = Math.max(righeTrovate.length, righeAttese.length);
  for (let i = 0; i < n; i++) {
    if (righeTrovate[i] !== righeAttese[i]) {
      return `riga ${i + 1}: atteso ${JSON.stringify(righeAttese[i] ?? "")}, trovato ${JSON.stringify(righeTrovate[i] ?? "")}`;
    }
  }
  return "differenza solo nei fine riga";
}

export function eseguiGolden(comando: "verifica" | "aggiorna", cartella: string, conferma: boolean): EsitoGolden {
  const righe: string[] = [];
  if (!existsSync(cartella)) {
    return { ok: false, righe: [`Cartella non trovata: ${cartella}`] };
  }
  const file = readdirSync(cartella)
    .filter((f) => f.endsWith(".why"))
    .sort();
  if (file.length === 0) {
    return { ok: false, righe: [`Nessun file .why in ${cartella}`] };
  }

  let ok = 0;
  let male = 0;
  for (const nome of file) {
    const percorso = join(cartella, nome);
    const attesoPercorso = percorso.replace(/\.why$/, ".atteso");
    const esito = parse(readFileSync(percorso, "utf8"));
    if (!esito.ok) {
      const e = esito.errori[0];
      righe.push(`FALLITO  ${nome}: il file non si parsa (${e.codice} riga ${e.riga}: ${e.messaggio})`);
      male++;
      continue;
    }
    const fuori = stampa(esito.ast);
    if (comando === "aggiorna" && conferma) {
      writeFileSync(attesoPercorso, fuori, "utf8");
      righe.push(`SCRITTO  ${nome}.atteso`);
      ok++;
      continue;
    }
    if (!existsSync(attesoPercorso)) {
      righe.push(`FALLITO  ${nome}: manca ${nome.replace(/\.why$/, ".atteso")}`);
      male++;
      continue;
    }
    const atteso = readFileSync(attesoPercorso, "utf8");
    if (fuori !== atteso) {
      righe.push(`FALLITO  ${nome}: ${primoDiverso(fuori, atteso)}`);
      male++;
      continue;
    }
    righe.push(`OK       ${nome}`);
    ok++;
  }
  if (comando === "aggiorna" && !conferma) {
    righe.push("Per scrivere davvero i file .atteso serve --conferma (e il diff va letto prima)");
  }
  righe.push(`Golden: ${ok} OK, ${male} FALLITO`);
  return { ok: male === 0, righe };
}

function main(): number {
  const argomenti = process.argv.slice(2);
  const comando = argomenti[0];
  if (comando !== "verifica" && comando !== "aggiorna") {
    console.log("Uso: golden verifica | golden aggiorna --conferma [cartella]");
    return 2;
  }
  const conferma = argomenti.includes("--conferma");
  const cartella = argomenti.find((a) => !a.startsWith("--") && a !== comando) ?? join(process.cwd(), "tests", "golden", "kernel");
  const inizio = Date.now();
  const esito = eseguiGolden(comando, cartella, conferma);
  for (const riga of esito.righe) {
    console.log(riga);
  }
  const durata = durataMs(inizio, Date.now());
  aggiungiRigaJsonl(join(process.cwd(), "registri", "prove.jsonl"), {
    id: randomUUID(),
    ora: oraIso(),
    tipo: "prova",
    cosa: `golden ${comando}`,
    comando: `golden ${comando} ${cartella}`,
    esito: esito.ok ? "ok" : "fallito",
    durata_ms: durata,
  });
  return esito.ok ? 0 : 1;
}

process.exit(main());
