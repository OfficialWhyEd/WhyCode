import { test } from "node:test";
import assert from "node:assert/strict";
import { ErroreWhyCode } from "../../../src/condivisi/errori.js";

test("un ErroreWhyCode e' un Error con codice e rimediabile", () => {
  const e = new ErroreWhyCode("E-PROVA", "qualcosa e' andato storto");
  assert.ok(e instanceof Error);
  assert.equal(e.name, "ErroreWhyCode");
  assert.equal(e.codice, "E-PROVA");
  assert.equal(e.message, "qualcosa e' andato storto");
  assert.equal(e.rimediabile, false);
});

test("rimediabile si puo' accendere", () => {
  const e = new ErroreWhyCode("MOTORE-SPENTO", "il motore non risponde", { rimediabile: true });
  assert.equal(e.rimediabile, true);
});

test("la causa viene conservata", () => {
  const causa = new Error("dentro");
  const e = new ErroreWhyCode("E-CAUSA", "fuori", { causa });
  assert.equal(e.cause, causa);
});

test("toJSON produce codice, messaggio e rimediabile", () => {
  const e = new ErroreWhyCode("E-JSON", "json rotto", { rimediabile: true });
  assert.deepEqual(e.toJSON(), { codice: "E-JSON", messaggio: "json rotto", rimediabile: true });
});
