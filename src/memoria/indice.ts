/**
 * Indice della knowledge base: kb/indice.json, voci ordinate per nome.
 * Fonte: docs/SPEC-05-MEMORIA.md, sezione 2.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ZodType } from "zod";
import type { SchedaLingua } from "../condivisi/tipi.js";
import { leggiJson, scriviJsonAtomico } from "../condivisi/json.js";
import { caricaScheda, elencaSchede } from "./schede.js";

export interface VoceIndice {
  nome: string;
  aggiunta: string;
  stato: string;
  famiglia?: string;
}

const VoceIndiceSchema: ZodType<VoceIndice> = z.object({
  nome: z.string().min(1),
  aggiunta: z.string().min(1),
  stato: z.string().min(1),
  famiglia: z.string().optional(),
});

const IndiceSchema: ZodType<VoceIndice[]> = z.array(VoceIndiceSchema);

export function percorsoIndice(kbDir: string): string {
  return join(kbDir, "indice.json");
}

export function leggiIndice(kbDir: string): VoceIndice[] {
  const percorso = percorsoIndice(kbDir);
  if (!existsSync(percorso)) {
    return [];
  }
  return leggiJson(percorso, IndiceSchema);
}

export function aggiornaIndice(kbDir: string, voce: VoceIndice): void {
  const voci = leggiIndice(kbDir).filter((v) => v.nome !== voce.nome);
  voci.push(voce);
  voci.sort((a, b) => a.nome.localeCompare(b.nome));
  scriviJsonAtomico(percorsoIndice(kbDir), voci);
}

/** Cerca fra le schede in memoria quelle che somigliano alle caratteristiche date. */
export function cercaSimili(kbDir: string, caratteristiche: string[]): SchedaLingua[] {
  const cercabili = caratteristiche.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0);
  if (cercabili.length === 0) {
    return [];
  }
  const fuori: SchedaLingua[] = [];
  for (const nome of elencaSchede(kbDir)) {
    const scheda = caricaScheda(kbDir, nome);
    if (scheda === null) {
      continue;
    }
    const testo = [scheda.nome, scheda.famiglia ?? "", ...scheda.idiomi, ...scheda.trappole].join(" ").toLowerCase();
    if (cercabili.some((c) => testo.includes(c))) {
      fuori.push(scheda);
    }
  }
  return fuori;
}
