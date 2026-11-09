import test from "node:test";
import assert from "node:assert/strict";
import { decideAppMode } from "./appMode.js";

test("Home Screen launch on a touch device opens the phone app", () => {
  assert.equal(decideAppMode({ standalone: true, coarsePointer: true }), true);
});

test("the website stays the website everywhere else", () => {
  assert.equal(decideAppMode({ standalone: false, coarsePointer: true }), false); // phone Safari
  assert.equal(decideAppMode({ standalone: false, coarsePointer: false }), false); // desktop browser
  assert.equal(decideAppMode({ standalone: true, coarsePointer: false }), false); // installed desktop PWA
});

test("?app=1 forces the phone app for testing and ?app=0 turns it off", () => {
  assert.equal(decideAppMode({ search: "?app=1" }), true);
  assert.equal(decideAppMode({ search: "?app=0", standalone: true, coarsePointer: true, forced: true }), false);
  assert.equal(decideAppMode({ forced: true }), true);
});
