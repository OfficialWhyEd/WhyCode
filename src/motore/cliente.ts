/**
 * Cliente del motore WhyLocalLM. Tutto locale, niente cloud.
 * Fonte: docs/SPEC-07-MOTORE.md, sezione 2.
 * Se il motore e' spento si lancia ErroreWhyCode MOTORE-SPENTO: chi chiama decide se
 * passare al regime regole e segnare la prova come saltata.
 */
import type { ZodType } from "zod";
import { ErroreWhyCode } from "../condivisi/errori.js";

export interface Messaggio {
  ruolo: "system" | "user" | "assistant";
  contenuto: string;
}

export interface OpzioniMotore {
  baseUrl?: string;
  modello?: string;
  temperatura?: number;
  maxTokens?: number;
  timeoutMs?: number;
  tentativi?: number;
  attesaMs?: number;
  grammar?: string;
  jsonSchema?: { nome: string; schema: unknown };
}

const BASE_DEFAULT = "http://127.0.0.1:1235";

export function urlMotore(baseUrl?: string): string {
  return baseUrl ?? process.env.WHYCODE_MOTORE_URL ?? BASE_DEFAULT;
}

/** Battito rapido: il motore risponde? Timeout 2 secondi, mai eccezioni. */
export async function disponibile(baseUrl?: string): Promise<boolean> {
  try {
    const risposta = await fetch(`${urlMotore(baseUrl)}/health`, { signal: AbortSignal.timeout(2000) });
    return risposta.ok;
  } catch {
    return false;
  }
}

async function chiamataUnaVolta(messaggi: Messaggio[], opzioni: OpzioniMotore): Promise<string> {
  const corpo: Record<string, unknown> = {
    model: opzioni.modello ?? "whylocal",
    messages: messaggi.map((m) => ({ role: m.ruolo, content: m.contenuto })),
    temperature: opzioni.temperatura ?? 0,
    max_tokens: opzioni.maxTokens ?? 1024,
  };
  if (opzioni.grammar !== undefined) {
    corpo.grammar = opzioni.grammar;
    corpo.chat_template_kwargs = { enable_thinking: false };
  }
  if (opzioni.jsonSchema !== undefined) {
    corpo.response_format = {
      type: "json_schema",
      json_schema: { name: opzioni.jsonSchema.nome, schema: opzioni.jsonSchema.schema },
    };
  }

  const risposta = await fetch(`${urlMotore(opzioni.baseUrl)}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(opzioni.timeoutMs ?? 120000),
  });
  if (!risposta.ok) {
    throw new ErroreWhyCode("MOTORE-HTTP", `Il motore ha risposto ${risposta.status}`, { rimediabile: true });
  }
  const dati = (await risposta.json()) as { choices?: { message?: { content?: string } }[] };
  const testo = dati.choices?.[0]?.message?.content;
  if (typeof testo !== "string" || testo.length === 0) {
    throw new ErroreWhyCode("MOTORE-VUOTO", "Il motore ha risposto senza testo", { rimediabile: true });
  }
  return testo;
}

export async function chiedi(messaggi: Messaggio[], opzioni: OpzioniMotore = {}): Promise<string> {
  if (!(await disponibile(opzioni.baseUrl))) {
    throw new ErroreWhyCode("MOTORE-SPENTO", `Il motore non risponde su ${urlMotore(opzioni.baseUrl)}`, {
      rimediabile: true,
    });
  }
  const tentativi = opzioni.tentativi ?? 2;
  let ultimo: unknown;
  for (let k = 0; k <= tentativi; k++) {
    try {
      return await chiamataUnaVolta(messaggi, opzioni);
    } catch (e) {
      ultimo = e;
      if (k < tentativi) {
        await new Promise((r) => setTimeout(r, opzioni.attesaMs ?? 2000));
      }
    }
  }
  throw new ErroreWhyCode("MOTORE-ERRORE", `Il motore ha fallito dopo ${tentativi + 1} tentativi`, {
    causa: ultimo,
    rimediabile: true,
  });
}

export async function chiediJson<T>(messaggi: Messaggio[], schema: ZodType<T>, opzioni: OpzioniMotore = {}): Promise<T> {
  const testo = await chiedi(messaggi, opzioni);
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch (causa) {
    throw new ErroreWhyCode("MOTORE-JSON", "Il motore non ha risposto con JSON valido", { causa, rimediabile: true });
  }
  const esito = schema.safeParse(dati);
  if (!esito.success) {
    throw new ErroreWhyCode("MOTORE-JSON", "Il JSON del motore non rispetta lo schema richiesto", {
      causa: esito.error,
      rimediabile: true,
    });
  }
  return esito.data;
}
