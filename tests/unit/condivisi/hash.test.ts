import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../../../src/condivisi/hash.js";

test("lo sha256 della stringa vuota e' il vettore noto", () => {
  assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("lo sha256 ha sempre 64 caratteri esadecimali minuscoli", () => {
  for (const testo of ["ciao", "a\nb\tc", "à è ì ò ù"]) {
    assert.match(sha256(testo), /^[0-9a-f]{64}$/);
  }
});

test("stessa stringa, stesso hash; stringhe diverse, hash diversi", () => {
  assert.equal(sha256("WhyCode"), sha256("WhyCode"));
  assert.notEqual(sha256("WhyCode"), sha256("whycode"));
});
