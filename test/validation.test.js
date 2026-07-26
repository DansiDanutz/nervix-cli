import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAmount,
  validateRating,
  validateTimeout,
} from "../lib/validation.js";

test("validateAmount accepts complete finite positive decimals", () => {
  assert.equal(validateAmount("1"), 1);
  assert.equal(validateAmount("0.5"), 0.5);
  assert.equal(validateAmount(.25), 0.25);
});

test("validateAmount rejects partial, non-decimal, and non-finite values", () => {
  for (const value of [
    "1credit",
    "Infinity",
    Infinity,
    "0x10",
    "",
    "0",
    -1,
    "9007199254740992",
  ]) {
    assert.equal(validateAmount(value), null, `expected ${String(value)} to fail`);
  }
});

test("validateRating accepts only whole ratings from one through five", () => {
  assert.equal(validateRating("1"), 1);
  assert.equal(validateRating(5), 5);
  for (const value of ["5stars", "1.5", 1.5, 0, 6, ""]) {
    assert.equal(validateRating(value), null, `expected ${String(value)} to fail`);
  }
});

test("validateTimeout accepts only bounded whole minutes", () => {
  assert.equal(validateTimeout("1"), 60);
  assert.equal(validateTimeout(10080), 604800);
  for (const value of ["1minute", "1.5", 0, -1, 10081, Infinity, ""]) {
    assert.equal(validateTimeout(value), null, `expected ${String(value)} to fail`);
  }
});
