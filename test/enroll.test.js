import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/nervix.js", import.meta.url));

function makeHome() {
  return mkdtempSync(join(tmpdir(), "nervix-enroll-dryrun-"));
}

function runCli(args, home) {
  return spawnSync(process.execPath, [BIN, ...args], {
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 15000,
  });
}

test("enroll --dry-run succeeds on a valid config and persists nothing", () => {
  const home = makeHome();
  try {
    const res = runCli(["enroll", "TestAgent", "--dry-run"], home);

    assert.equal(res.status, 0, `exit should be 0\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);
    assert.match(res.stdout, /\[dry-run\] Validation successful/i);
    assert.match(res.stdout, /Would enroll agent "TestAgent"/);

    // Nothing must be persisted
    assert.equal(existsSync(join(home, ".nervix", "config.json")), false, "config.json must NOT be written in dry-run");
    assert.equal(existsSync(join(home, ".nervix", "keypair.json")), false, "keypair.json must NOT be written in dry-run");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("enroll --dry-run performs no network calls (succeeds with unreachable API)", () => {
  const home = makeHome();
  try {
    const res = runCli(
      ["enroll", "OfflineAgent", "--dry-run", "--api", "http://127.0.0.1:1/no-such-server"],
      home,
    );
    assert.equal(res.status, 0, `dry-run must not hit the network\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);
    assert.match(res.stdout, /\[dry-run\] Validation successful/i);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("enroll --dry-run still enforces role validation (fails on bad role)", () => {
  const home = makeHome();
  try {
    const res = runCli(["enroll", "BadRoleAgent", "--dry-run", "--roles", "not-a-real-role"], home);
    assert.notEqual(res.status, 0, "invalid role must cause non-zero exit");
    assert.match(res.stderr || res.stdout, /Invalid role: not-a-real-role/);
    // And it still must not persist
    assert.equal(existsSync(join(home, ".nervix", "config.json")), false);
    assert.equal(existsSync(join(home, ".nervix", "keypair.json")), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
