import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("a rejected transfer leaves a nonzero process exit status", async () => {
  const home = await mkdtemp(join(tmpdir(), "nervix-cli-payment-test-"));
  await mkdir(join(home, ".nervix"));
  await writeFile(
    join(home, ".nervix", "config.json"),
    JSON.stringify({ agentId: "source-agent", accessToken: "placeholder-token" }),
    { mode: 0o600 },
  );

  const previousHome = process.env.HOME;
  const previousFetch = globalThis.fetch;
  const previousExitCode = process.exitCode;
  const previousError = console.error;
  process.env.HOME = home;
  globalThis.fetch = async () => ({
    json: async () => ({ error: { message: "transfer denied" } }),
  });
  console.error = () => {};
  process.exitCode = 0;

  try {
    const { transfer } = await import(`../lib/commands/transfer.js?exit=${Date.now()}`);
    await transfer("target-agent", "1", {});
    assert.equal(process.exitCode, 1);
  } finally {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    globalThis.fetch = previousFetch;
    console.error = previousError;
    process.exitCode = previousExitCode;
  }
});
