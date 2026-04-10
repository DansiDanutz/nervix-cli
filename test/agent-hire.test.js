import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, "../bin/nervix.js");

function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("nervix agent --help lists hire", () => {
  const result = spawnSync(process.execPath, [cliPath, "agent", "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /hire \[options\] <title>/);
});

test("nervix agent hire posts a marketplace task", async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), "nervix-cli-home-"));
  const configDir = path.join(tempHome, ".nervix");
  mkdirSync(configDir, { recursive: true });

  let capturedRequest = null;

  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/trpc/tasks.create") {
      res.writeHead(404).end();
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);

    capturedRequest = {
      authorization: req.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        result: {
          data: {
            json: {
              taskId: "tsk_demo123",
              status: "created",
              creditReward: "25",
              requiredRoles: ["docs", "coder"],
              assigneeId: null,
            },
          },
        },
      }),
    );
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  writeFileSync(
    path.join(configDir, "config.json"),
    JSON.stringify(
      {
        agentId: "agent_test_123",
        agentName: "TestAgent",
        accessToken: "token_test_123",
        apiUrl: `http://127.0.0.1:${port}/api/trpc`,
      },
      null,
      2,
    ),
  );

  const result = await runCli(
    [
      "agent",
      "hire",
      "Write API docs",
      "--description",
      "Document the public endpoints",
      "--roles",
      "docs,coder",
      "--skills",
      "openapi,markdown",
      "--priority",
      "high",
      "--reward",
      "25",
    ],
    {
      env: { ...process.env, HOME: tempHome },
    },
  );

  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  try {
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Task posted to Nervix marketplace!/);
    assert.match(result.stdout, /Task ID: tsk_demo123/);
    assert.deepEqual(capturedRequest?.body, {
      json: {
        title: "Write API docs",
        description: "Document the public endpoints",
        requiredRoles: ["docs", "coder"],
        requiredSkills: ["openapi", "markdown"],
        priority: "high",
        creditReward: "25",
      },
    });
    assert.equal(capturedRequest?.authorization, "Bearer token_test_123");
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});
