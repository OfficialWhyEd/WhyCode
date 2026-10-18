import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { z } from "zod";
import { chiedi, chiediJson, disponibile, urlMotore } from "../../../src/motore/cliente.js";
import { ErroreWhyCode } from "../../../src/condivisi/errori.js";

interface Finto {
  baseUrl: string;
  richieste: { percorso: string; corpo: Record<string, unknown> }[];
  risposta: { status: number; corpo: unknown };
  saluteOk: boolean;
  chiudi: () => Promise<void>;
}

async function avviaFinto(): Promise<Finto> {
  const richieste: { percorso: string; corpo: Record<string, unknown> }[] = [];
  const stato: { risposta: { status: number; corpo: unknown }; saluteOk: boolean } = {
    risposta: { status: 200, corpo: { choices: [{ message: { content: "ciao" } }] } },
    saluteOk: true,
  };
  const server: Server = createServer((req, res) => {
    let testo = "";
    req.on("data", (pezzo: Buffer) => {
      testo += pezzo.toString("utf8");
    });
    req.on("end", () => {
      if (req.url === "/health") {
        res.writeHead(stato.saluteOk ? 200 : 500, { "content-type": "application/json" });
        res.end(JSON.stringify({ stato: "ok" }));
        return;
      }
      richieste.push({ percorso: req.url ?? "", corpo: JSON.parse(testo) as Record<string, unknown> });
      res.writeHead(stato.risposta.status, { "content-type": "application/json" });
      res.end(JSON.stringify(stato.risposta.corpo));
    });
  });
  await new Promise<void>((risolvi) => server.listen(0, "127.0.0.1", risolvi));
  const indirizzo = server.address();
  assert.ok(indirizzo !== null && typeof indirizzo === "object");
  const baseUrl = `http://127.0.0.1:${indirizzo.port}`;
  return {
    baseUrl,
    richieste,
    get risposta() {
      return stato.risposta;
    },
    set risposta(v) {
      stato.risposta = v;
    },
    get saluteOk() {
      return stato.saluteOk;
    },
    set saluteOk(v) {
      stato.saluteOk = v;
    },
    chiudi: () => new Promise((risolvi, rifiuta) => server.close((e) => (e ? rifiuta(e) : risolvi()))),
  };
}

test("disponibile risponde true col motore acceso e false da spento", async () => {
  const finto = await avviaFinto();
  try {
    assert.equal(await disponibile(finto.baseUrl), true);
    finto.saluteOk = false;
    assert.equal(await disponibile(finto.baseUrl), false);
  } finally {
    await finto.chiudi();
  }
  assert.equal(await disponibile(finto.baseUrl), false, "dopo la chiusura non risponde piu'");
});

test("chiedi manda i messaggi e torna il testo del motore", async () => {
  const finto = await avviaFinto();
  try {
    const testo = await chiedi(
      [
        { ruolo: "system", contenuto: "sei WhyCode" },
        { ruolo: "user", contenuto: "saluta" },
      ],
      { baseUrl: finto.baseUrl, temperatura: 0.2, maxTokens: 64 },
    );
    assert.equal(testo, "ciao");
    assert.equal(finto.richieste.length, 1);
    const corpo = finto.richieste[0].corpo;
    assert.equal(corpo.model, "whylocal");
    assert.equal(corpo.temperature, 0.2);
    assert.equal(corpo.max_tokens, 64);
    assert.deepEqual(corpo.messages, [
      { role: "system", content: "sei WhyCode" },
      { role: "user", content: "saluta" },
    ]);
  } finally {
    await finto.chiudi();
  }
});

test("con la grammatica si spegne il pensiero del modello", async () => {
  const finto = await avviaFinto();
  try {
    await chiedi([{ ruolo: "user", contenuto: "x" }], { baseUrl: finto.baseUrl, grammar: "radice ::= blocco" });
    const corpo = finto.richieste[0].corpo;
    assert.equal(corpo.grammar, "radice ::= blocco");
    assert.deepEqual(corpo.chat_template_kwargs, { enable_thinking: false });
  } finally {
    await finto.chiudi();
  }
});

test("un errore HTTP si riprova e poi diventa MOTORE-ERRORE", async () => {
  const finto = await avviaFinto();
  try {
    finto.risposta = { status: 500, corpo: { errore: "rotto" } };
    try {
      await chiedi([{ ruolo: "user", contenuto: "x" }], { baseUrl: finto.baseUrl, tentativi: 1, attesaMs: 5 });
      assert.fail("doveva lanciare");
    } catch (e) {
      assert.ok(e instanceof ErroreWhyCode);
      assert.equal(e.codice, "MOTORE-ERRORE");
      assert.equal(e.rimediabile, true);
      const causa = e.cause;
      assert.ok(causa instanceof ErroreWhyCode);
      assert.equal(causa.codice, "MOTORE-HTTP");
    }
    assert.equal(finto.richieste.length, 2, "un tentativo piu' un ritentativo");
  } finally {
    await finto.chiudi();
  }
});

test("col motore spento si lancia MOTORE-SPENTO subito", async () => {
  const finto = await avviaFinto();
  const baseUrl = finto.baseUrl;
  await finto.chiudi();
  try {
    await chiedi([{ ruolo: "user", contenuto: "x" }], { baseUrl });
    assert.fail("doveva lanciare");
  } catch (e) {
    assert.ok(e instanceof ErroreWhyCode);
    assert.equal(e.codice, "MOTORE-SPENTO");
    assert.equal(e.rimediabile, true);
  }
});

test("una risposta senza testo da' MOTORE-VUOTO", async () => {
  const finto = await avviaFinto();
  try {
    finto.risposta = { status: 200, corpo: { choices: [] } };
    try {
      await chiedi([{ ruolo: "user", contenuto: "x" }], { baseUrl: finto.baseUrl, tentativi: 0 });
      assert.fail("doveva lanciare");
    } catch (e) {
      assert.ok(e instanceof ErroreWhyCode);
      assert.equal(e.codice, "MOTORE-ERRORE");
      assert.ok(e.cause instanceof ErroreWhyCode && e.cause.codice === "MOTORE-VUOTO");
    }
  } finally {
    await finto.chiudi();
  }
});

test("chiediJson valida e restituisce il JSON del motore", async () => {
  const finto = await avviaFinto();
  try {
    finto.risposta = { status: 200, corpo: { choices: [{ message: { content: '{"nome": "Rex"}' } }] } };
    const dato = await chiediJson([{ ruolo: "user", contenuto: "x" }], z.object({ nome: z.string() }), {
      baseUrl: finto.baseUrl,
    });
    assert.deepEqual(dato, { nome: "Rex" });
  } finally {
    await finto.chiudi();
  }
});

test("un JSON rotto da' MOTORE-JSON", async () => {
  const finto = await avviaFinto();
  try {
    finto.risposta = { status: 200, corpo: { choices: [{ message: { content: "non json" } }] } };
    try {
      await chiediJson([{ ruolo: "user", contenuto: "x" }], z.object({ nome: z.string() }), { baseUrl: finto.baseUrl, tentativi: 0 });
      assert.fail("doveva lanciare");
    } catch (e) {
      assert.ok(e instanceof ErroreWhyCode);
      assert.equal(e.codice, "MOTORE-JSON");
    }
  } finally {
    await finto.chiudi();
  }
});

test("un JSON fuori schema da' MOTORE-JSON", async () => {
  const finto = await avviaFinto();
  try {
    finto.risposta = { status: 200, corpo: { choices: [{ message: { content: '{"nome": 3}' } }] } };
    try {
      await chiediJson([{ ruolo: "user", contenuto: "x" }], z.object({ nome: z.string() }), { baseUrl: finto.baseUrl, tentativi: 0 });
      assert.fail("doveva lanciare");
    } catch (e) {
      assert.ok(e instanceof ErroreWhyCode);
      assert.equal(e.codice, "MOTORE-JSON");
    }
  } finally {
    await finto.chiudi();
  }
});

test("l'indirizzo del motore si puo' cambiare via ambiente", () => {
  assert.equal(urlMotore("http://esempio:1"), "http://esempio:1");
  const prima = process.env.WHYCODE_MOTORE_URL;
  try {
    process.env.WHYCODE_MOTORE_URL = "http://macchina:9999";
    assert.equal(urlMotore(), "http://macchina:9999");
  } finally {
    if (prima === undefined) {
      delete process.env.WHYCODE_MOTORE_URL;
    } else {
      process.env.WHYCODE_MOTORE_URL = prima;
    }
  }
});
