import { z } from "zod";
import type { ZodType } from "zod";
import type {
  GrammaticaLingua,
  IntentoCompreso,
  ModelloComprensione,
  RigaCollasso,
  RigaProva,
  SchedaLingua,
  StileDefault,
  UsoCompreso,
  VoceBenchmark,
} from "./tipi.js";

export const VoceBenchmarkSchema: ZodType<VoceBenchmark> = z.object({
  numero: z.number().int().positive(),
  cosa: z.string().min(1),
  esito: z.enum(["ok", "fallito", "saltato"]),
  durata_ms: z.number().int().nonnegative(),
});

export const GrammaticaSchema: ZodType<GrammaticaLingua> = z.object({
  tipo: z.enum(["tree-sitter", "inferita", "regole"]),
  pacchetto: z.string().optional(),
  wasm: z.string().optional(),
  bnf: z.string().optional(),
});

export const StileDefaultSchema: ZodType<StileDefault> = z.object({
  indent: z.number().int().nonnegative(),
  nomi: z.string().min(1),
  virgolette: z.string().min(1),
});

export const SchedaLinguaSchema: ZodType<SchedaLingua> = z.object({
  nome: z
    .string()
    .min(1)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
      "il nome usa lettere, cifre, punto, trattino o underscore, e non comincia per punto",
    ),
  versione_studiata: z.string().min(1),
  famiglia: z.string().optional(),
  grammatica: GrammaticaSchema,
  uast_version: z.number().int().positive(),
  idiomi: z.array(z.string()),
  trappole: z.array(z.string()),
  stile_default: StileDefaultSchema,
  benchmark: z.array(VoceBenchmarkSchema),
  confidenza: z.number().min(0).max(1).optional(),
  stato: z.enum(["in-prova", "stabile"]),
  studiata_il: z.string().min(1),
  aggiornata: z.string().min(1),
  note: z.string().optional(),
});

export const IntentoCompresoSchema: ZodType<IntentoCompreso> = z.object({
  id: z.string().min(1),
  descrizione: z.string().min(1),
  esempi: z.array(z.string()),
});

export const UsoCompresoSchema: ZodType<UsoCompreso> = z.object({
  nome: z.string().min(1),
  input: z.array(z.string()),
  output: z.string().min(1),
});

export const ModelloComprensioneSchema: ZodType<ModelloComprensione> = z.object({
  linguaggio: z.string().min(1),
  versione: z.number().int().positive(),
  fonte_hash: z.string().min(1),
  intenti: z.array(IntentoCompresoSchema),
  usi: z.array(UsoCompresoSchema),
  flusso: z.array(z.string()),
  effetti: z.array(z.string()),
  incertezze: z.array(z.string()),
  uast: z.object({ nodi: z.number().int().nonnegative(), radice: z.string() }),
});

export const RigaCollassoSchema: ZodType<RigaCollasso> = z.object({
  id: z.string().min(1),
  ora: z.string().min(1),
  tipo: z.literal("collasso"),
  intento_hash: z.string().min(1),
  lingua_uscita: z.string().min(1),
  vincoli: z.record(z.string(), z.string()),
  varianti: z.array(z.string()),
  scelta: z.string(),
  motivo: z.string().min(1),
  versione_regole: z.string().min(1),
  esito_verifica: z.string().min(1),
  durata_ms: z.number().int().nonnegative(),
});

export const RigaProvaSchema: ZodType<RigaProva> = z.object({
  id: z.string().min(1),
  ora: z.string().min(1),
  tipo: z.literal("prova"),
  cosa: z.string().min(1),
  comando: z.string().min(1),
  esito: z.enum(["ok", "fallito", "saltato"]),
  durata_ms: z.number().int().nonnegative(),
});
