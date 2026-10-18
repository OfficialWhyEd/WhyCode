import { test } from "node:test";
import assert from "node:assert/strict";
import { durataMs, oraIso } from "../../../src/condivisi/tempo.js";

test("oraIso ha la forma ISO 8601 con fuso locale", () => {
  const d = new Date(2026, 9, 17, 9, 30, 0);
  const iso = oraIso(d);
  assert.match(iso, /^2026-10-17T09:30:00[+-]\d{2}:\d{2}$/);
});

test("oraIso usa davvero il fuso di questa macchina", () => {
  const d = new Date(2026, 0, 2, 3, 4, 5);
  const iso = oraIso(d);
  const offsetMin = -d.getTimezoneOffset();
  const segno = offsetMin >= 0 ? "+" : "-";
  const p2 = (n: number): string => String(n).padStart(2, "0");
  const atteso = `${segno}${p2(Math.floor(Math.abs(offsetMin) / 60))}:${p2(Math.abs(offsetMin) % 60)}`;
  assert.ok(iso.endsWith(atteso), `atteso fondo ${atteso}, trovato ${iso}`);
});

test("durataMs arrotonda e non scende sotto zero", () => {
  assert.equal(durataMs(100, 250), 150);
  assert.equal(durataMs(100, 100.4), 0);
  assert.equal(durataMs(100, 99), 0);
  assert.equal(durataMs(0, 1500), 1500);
});
