import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const marketplaceModuleUrl = pathToFileURL(join(process.cwd(), "lib/commands/marketplace.js")).href;

function createTrpcResponse(payload) {
  return {
    json: async () => ({
      result: {
        data: {
          json: payload,
        },
      },
    }),
  };
}

function setupHome(config) {
  const home = mkdtempSync(join(tmpdir(), "nervix-cli-test-"));
  const configDir = join(home, ".nervix");
  mkdirSync(configDir, { recursive: true });
  if (config) {
    writeFileSync(join(configDir, "config.json"), JSON.stringify(config, null, 2));
  }
  return home;
}

async function importMarketplaceModule() {
  return import(`${marketplaceModuleUrl}?t=${Date.now()}-${Math.random()}`);
}

function patchProcessExit() {
  const originalExit = process.exit;
  process.exit = (code) => {
    throw new Error(`EXIT:${code}`);
  };
  return () => {
    process.exit = originalExit;
  };
}

test("marketplace agents lists public agents", async () => {
  const originalHome = process.env.HOME;
  process.env.HOME = setupHome();

  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return createTrpcResponse({
      agents: [
        {
          agentId: "agt_alpha",
          name: "Alpha",
          status: "active",
          roles: ["coder", "qa"],
          description: "Typescript and test automation specialist",
        },
      ],
      total: 1,
    });
  };

  try {
    const { listMarketplaceAgents } = await importMarketplaceModule();
    await listMarketplaceAgents({
      api: "https://example.com/api/trpc",
      role: "coder",
      status: "active",
      limit: "5",
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0], /agents\.list\?/);
  } finally {
    delete global.fetch;
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  }
});

test("marketplace hire previews then creates a matched task", async () => {
  const originalHome = process.env.HOME;
  const home = setupHome({
    agentId: "agt_requester",
    accessToken: "at_test_token",
    refreshToken: "rt_test_token",
  });
  process.env.HOME = home;

  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (String(url).includes("agents.matchPreview")) {
      return createTrpcResponse({
        matches: [{ agentId: "agt_beta", agentName: "Beta", score: 92 }],
      });
    }
    if (String(url).endsWith("/tasks.create")) {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.json.requiredRoles, ["coder"]);
      assert.deepEqual(body.json.requiredSkills, ["react"]);
      assert.equal(body.json.priority, "high");
      assert.equal(body.json.creditReward, "25.000000");
      assert.equal(body.json.maxDuration, 7200);
      assert.equal(options.headers.Authorization, "Bearer at_test_token");

      return createTrpcResponse({
        taskId: "tsk_123",
        status: "assigned",
        creditReward: "25.000000",
        assigneeId: "agt_beta",
      });
    }
    if (String(url).includes("agents.getById")) {
      return createTrpcResponse({
        agentId: "agt_beta",
        name: "Beta",
      });
    }

    throw new Error(`Unhandled fetch: ${url}`);
  };

  try {
    const { hireFromMarketplace } = await importMarketplaceModule();
    await hireFromMarketplace({
      api: "https://example.com/api/trpc",
      title: "Build landing page",
      role: ["coder"],
      skill: ["react"],
      priority: "high",
      reward: "25",
      deadline: "2h",
    });
    assert.equal(requests.length, 3);
  } finally {
    delete global.fetch;
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  }
});

test("marketplace hire requires at least one role or skill", async () => {
  const originalHome = process.env.HOME;
  const home = setupHome({
    agentId: "agt_requester",
    accessToken: "at_test_token",
  });
  process.env.HOME = home;

  const restoreExit = patchProcessExit();

  try {
    const { hireFromMarketplace } = await importMarketplaceModule();
    await assert.rejects(
      () => hireFromMarketplace({ title: "Build landing page" }),
      /EXIT:1/,
    );
  } finally {
    restoreExit();
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  }
});
