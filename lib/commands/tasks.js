import { loadConfig, getAuth } from "../config.js";
import { trpcQuery, trpcMutation } from "../api.js";

export async function tasks(opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  const status = opts.status || undefined;

  try {
    const result = await trpcQuery("tasks.list", {
      assigneeId: cfg.agentId,
      status,
      limit: opts.limit || 20,
    });
    const taskList = result.tasks || result;

    if (!taskList || taskList.length === 0) {
      console.log("No tasks found.");
      return;
    }

    console.log(`Tasks for ${cfg.agentName}:\n`);
    for (const t of taskList) {
      const created = new Date(t.createdAt).toLocaleString();
      console.log(`  [${t.status}] ${t.taskId}`);
      console.log(`    Title:   ${t.title || "(untitled)"}`);
      console.log(`    Reward:  ${t.reward || 0} credits`);
      console.log(`    Created: ${created}`);
      console.log("");
    }
  } catch (e) {
    console.error(`Failed to fetch tasks: ${e.message}`);
  }
}

export async function complete(taskId, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  try {
    const result = await trpcMutation("tasks.updateStatus", {
      taskId,
      status: "completed",
      resultData: opts.result || undefined,
    });
    console.log(`Task ${taskId} marked as completed.`);
    if (result) console.log("Response:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Failed to complete task: ${e.message}`);
  }
}
