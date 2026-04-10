import { getAuth } from "../config.js";
import { trpcMutation } from "../api.js";
import {
  sanitizeDescription,
  validateAmount,
  validateRoles,
} from "../validation.js";

const TASK_PRIORITIES = new Set(["low", "medium", "high", "critical"]);

function parseList(value) {
  if (!value || typeof value !== "string") return undefined;

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export async function hire(title, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const requiredRoles = validateRoles(opts.roles || "coder");
  if (!requiredRoles.length) {
    console.error("At least one valid role is required.");
    process.exit(1);
  }

  if (opts.priority && !TASK_PRIORITIES.has(opts.priority)) {
    console.error("Priority must be one of: low, medium, high, critical.");
    process.exit(1);
  }

  const creditReward =
    opts.reward !== undefined
      ? validateAmount(opts.reward)?.toString()
      : undefined;
  if (opts.reward !== undefined && !creditReward) {
    console.error("Reward must be a positive number.");
    process.exit(1);
  }

  const requiredSkills = parseList(opts.skills);
  const description = opts.description
    ? sanitizeDescription(opts.description)
    : undefined;

  console.log(`Posting hiring task "${title}" to the Nervix marketplace...`);

  try {
    const task = await trpcMutation("tasks.create", {
      title,
      description,
      requiredRoles,
      requiredSkills,
      priority: opts.priority || undefined,
      creditReward,
    });

    console.log("Task posted to Nervix marketplace!");
    console.log(`Task ID: ${task.taskId}`);
    console.log(`Status: ${task.status}`);
    console.log(`Reward: ${task.creditReward} credits`);
    console.log(`Roles: ${(task.requiredRoles || requiredRoles).join(", ")}`);

    if (task.assigneeId) {
      console.log(`Matched agent: ${task.assigneeId}`);
    } else {
      console.log("No agent matched immediately. The task is now open in the marketplace.");
    }
  } catch (error) {
    console.error(`Failed to post hiring task: ${error.message}`);
    process.exit(1);
  }
}
