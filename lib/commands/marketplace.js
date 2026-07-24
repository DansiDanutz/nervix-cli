import { getApiUrl, getAuth } from "../config.js";
import {
  normalizeRoles,
  normalizeSkills,
  parseDurationToSeconds,
  validateAmount,
  validateTaskPriority,
  validationError,
} from "../validation.js";

export async function listMarketplaceAgents(opts) {
  const limit = Number.parseInt(opts.limit || "20", 10);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
    console.error(validationError("limit", "an integer between 1 and 100"));
    process.exit(1);
  }

  try {
    const result = await queryWithOptionalApi(opts.api, "agents.list", {
      status: opts.status || "active",
      role: opts.role || undefined,
      search: opts.search || undefined,
      limit,
    });
    const agents = result.agents || [];

    if (agents.length === 0) {
      console.log("No marketplace agents found.");
      return;
    }

    console.log(`Marketplace agents (${agents.length}/${result.total || agents.length}):\n`);
    for (const agent of agents) {
      const roles = Array.isArray(agent.roles) && agent.roles.length > 0
        ? agent.roles.join(", ")
        : "none";
      const description = (agent.shortBio || agent.description || "")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`${agent.name} (${agent.agentId})`);
      console.log(`  Status: ${agent.status || "unknown"} | Roles: ${roles}`);
      if (description) console.log(`  ${description}`);
      console.log("");
    }

    console.log("Hire via task creation:");
    console.log('  nervix marketplace hire --title "Build auth API" --role coder --reward 25');
  } catch (error) {
    console.error(`Failed to list marketplace agents: ${error.message}`);
    process.exit(1);
  }
}

export async function hireFromMarketplace(opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const roles = normalizeRoles(opts.role, opts.roles);
  const skills = normalizeSkills(opts.skill, opts.skills);
  if (roles.length === 0 && skills.length === 0) {
    console.error("Hiring requires at least one role or skill so the marketplace can match an agent.");
    console.error('Example: nervix marketplace hire --title "QA pass" --role qa');
    process.exit(1);
  }

  const reward = validateAmount(opts.reward || "10");
  if (!reward) {
    console.error(validationError("reward", "a positive number"));
    process.exit(1);
  }

  const priority = validateTaskPriority(opts.priority || "medium");
  if (!priority) {
    console.error(validationError("priority", "low, medium, high, or critical"));
    process.exit(1);
  }

  const deadline = opts.deadline ? parseDurationToSeconds(opts.deadline) : null;
  if (opts.deadline && !deadline) {
    console.error(validationError("deadline", "a positive duration like 30m, 2h, or 1d"));
    process.exit(1);
  }

  try {
    const apiUrl = opts.api || getApiUrl();
    const preview = await queryWithOptionalApi(apiUrl, "agents.matchPreview", {
      requiredRoles: roles.length > 0 ? roles : undefined,
      requiredSkills: skills.length > 0 ? skills : undefined,
    });
    const matches = preview.matches || preview || [];
    if (matches.length > 0) {
      const top = matches[0];
      console.log(`Top marketplace match: ${top.agentName} (${top.agentId}) — score ${top.score}`);
    } else {
      console.log("No live preview matches found. Creating the task anyway so it can wait in the marketplace.");
    }

    const task = await mutationWithOptionalApi(apiUrl, auth, "tasks.create", {
      title: opts.title,
      description: opts.description || undefined,
      type: opts.type || undefined,
      requiredRoles: roles.length > 0 ? roles : undefined,
      requiredSkills: skills.length > 0 ? skills : undefined,
      priority,
      creditReward: reward.toFixed(6),
      maxDuration: deadline || undefined,
    });

    console.log("\nMarketplace task created!");
    console.log(`Task ID: ${task.taskId}`);
    console.log(`Status: ${task.status}`);
    console.log(`Reward: ${task.creditReward} credits`);
    if (roles.length > 0) console.log(`Roles: ${roles.join(", ")}`);
    if (skills.length > 0) console.log(`Skills: ${skills.join(", ")}`);

    if (task.assigneeId) {
      let assigneeName = task.assigneeId;
      try {
        const agent = await queryWithOptionalApi(apiUrl, "agents.getById", { agentId: task.assigneeId });
        assigneeName = agent.name || assigneeName;
      } catch (_) {
        // Keep the assignee id when the lookup fails.
      }
      console.log(`Assigned to: ${assigneeName} (${task.assigneeId})`);
    } else {
      console.log("Assigned to: no agent yet — the task is waiting for a marketplace match");
    }
  } catch (error) {
    console.error(`Failed to hire through marketplace: ${error.message}`);
    process.exit(1);
  }
}

async function queryWithOptionalApi(apiOverride, path, input) {
  const apiUrl = apiOverride || getApiUrl();
  const encoded = encodeURIComponent(JSON.stringify({ json: input }));
  const res = await fetch(`${apiUrl}/${path}?input=${encoded}`);
  const json = await res.json();
  if (json.error) {
    const msg = json.error.message || json.error.json?.message || JSON.stringify(json.error);
    throw new Error(msg);
  }
  return json.result?.data?.json ?? json.result?.data ?? json.result;
}

async function mutationWithOptionalApi(apiOverride, auth, path, input) {
  const apiUrl = apiOverride || getApiUrl();
  const headers = { "Content-Type": "application/json" };
  if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

  const res = await fetch(`${apiUrl}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  const json = await res.json();
  if (json.error) {
    const msg = json.error.message || json.error.json?.message || JSON.stringify(json.error);
    throw new Error(msg);
  }
  return json.result?.data?.json ?? json.result?.data ?? json.result;
}
