import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("configuration and key material remain owner-only", async () => {
  const home = await mkdtemp(join(tmpdir(), "nervix-cli-test-"));
  const configDir = join(home, ".nervix");
  await mkdir(configDir);
  await writeFile(join(configDir, "config.json"), "{}\n", { mode: 0o644 });
  await writeFile(join(configDir, "keypair.json"), "{}\n", { mode: 0o644 });

  const previousHome = process.env.HOME;
  process.env.HOME = home;
  try {
    const config = await import(`../lib/config.js?permissions=${Date.now()}`);
    config.loadConfig();
    config.loadKeypair();
    assert.equal((await stat(join(configDir, "config.json"))).mode & 0o777, 0o600);
    assert.equal((await stat(join(configDir, "keypair.json"))).mode & 0o777, 0o600);

    config.saveConfig({ accessToken: "placeholder-access-token" });
    config.saveKeypair({ secretKey: "placeholder-secret-key" });

    assert.equal((await stat(configDir)).mode & 0o777, 0o700);
    assert.equal((await stat(join(configDir, "config.json"))).mode & 0o777, 0o600);
    assert.equal((await stat(join(configDir, "keypair.json"))).mode & 0o777, 0o600);
  } finally {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
  }
});
