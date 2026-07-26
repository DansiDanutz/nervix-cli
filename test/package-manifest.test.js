import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the registry package exposes only runtime source", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(manifest.files, ["bin/", "lib/"]);
});
