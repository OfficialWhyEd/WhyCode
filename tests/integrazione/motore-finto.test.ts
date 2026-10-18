import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chiediJson } from "../../src/motore/cliente.js";
import { SchedaLinguaSchema } from "../../src/condivisi/schemi.js";
import { caricaScheda, salvaScheda } from "../../src/memoria/schede.js";
import { cercaSimili } from "../../src/memoria/indice.js";
import { cartellaTemporanea, pulisci } from "../aiuto.js";

test("dal motore finto alla scheda validata e salvata", async () => {
  const scheda = {
    nome: "pitone-finto",
    versione_studiata: "3",
    famiglia: "serpenti",
    grammatica: { tipo: "inferita" },
    uast_version: 1,
    idiomi: ["indentazione obbligatoria"],
    trappole: ["blocchi senza graffe"],
    stile_default: { indent: 4, nomi: "snake", virgolette: "triple" },
    benchmark: [{ numero: 1, cosa: "lettura", esito: "ok", durata_ms: 12 }],
    stato: "in-prova",
    studiata_il: "2026-10-17T09:00:00+02:00",
    aggiornata: "2026-10-17T09:00:00+02:00",
  };
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ stato: "ok" }));
      return;
    }
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(scheda) } }] }));
    });
  });
  await new Promise<void>((risolvi) => server.listen(0, "127.0.0.1", risolvi));
  const indirizzo = server.address();
  assert.ok(indirizzo !== null && typeof indirizzo === "object");
  const baseUrl = `http://127.0.0.1:${indirizzo.port}`;
  const dir = cartellaTemporanea();
  try {
    const risposta = await chiediJson(
      [{ ruolo: "user", contenuto: "compila la scheda" }],
      SchedaLinguaSchema,
      { baseUrl },
    );
    assert.equal(risposta.nome, "pitone-finto");
    salvaScheda(dir, risposta);
    const letto = caricaScheda(dir, "pitone-finto");
    assert.deepEqual(letto, risposta);
    assert.deepEqual(
      cercaSimili(dir, ["indentazione"]).map((s) => s.nome),
      ["pitone-finto"],
    );
  } finally {
    pulisci(dir);
    await new Promise<void>((risolvi, rifiuta) => server.close((e) => (e ? rifiuta(e) : risolvi())));
  }
});
