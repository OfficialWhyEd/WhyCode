import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { radiceProgetto } from "../../aiuto.js";

/**
 * Regola R1: dentro il kernel e nei file di esempio non deve comparire mai
 * il nome di un linguaggio di programmazione vero.
 */
const VIETATI = [
  "python",
  "javascript",
  "typescript",
  "ruby",
  "rust",
  "kotlin",
  "swift",
  "php",
  "perl",
  "lua",
  "scala",
  "elixir",
  "erlang",
  "clojure",
  "haskell",
  "cobol",
  "fortran",
  "golang",
];

function elencaFile(cartella: string, filtro: (nome: string) => boolean): string[] {
  const fuori: string[] = [];
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) {
      fuori.push(...elencaFile(percorso, filtro));
    } else if (filtro(voce.name)) {
      fuori.push(percorso);
    }
  }
  return fuori.sort();
}

function trovaVietati(testo: string): string[] {
  const parole = new Set(testo.toLowerCase().split(/[^a-z]+/));
  return VIETATI.filter((v) => parole.has(v));
}

test("il kernel non nomina mai un linguaggio reale (R1)", () => {
  const cartella = join(radiceProgetto(), "src", "kernel");
  const file = elencaFile(cartella, (nome) => nome.endsWith(".ts"));
  assert.ok(file.length >= 6, "il kernel deve avere i suoi file");
  for (const percorso of file) {
    const trovati = trovaVietati(readFileSync(percorso, "utf8"));
    assert.deepEqual(trovati, [], `${percorso} nomina ${trovati.join(", ")}`);
  }
});

test("i file di esempio del kernel non nominano linguaggi reali (R1)", () => {
  const cartella = join(radiceProgetto(), "tests", "fixtures", "kernel");
  const file = elencaFile(cartella, (nome) => nome.endsWith(".why"));
  assert.ok(file.length > 0);
  for (const percorso of file) {
    const trovati = trovaVietati(readFileSync(percorso, "utf8"));
    assert.deepEqual(trovati, [], `${percorso} nomina ${trovati.join(", ")}`);
  }
});

test("il controllo di R1 funziona davvero", () => {
  assert.deepEqual(trovaVietati("un esempio con python dentro"), ["python"]);
  assert.deepEqual(trovaVietati("pitone e serpente"), []);
});
