import { loadConfig, getAuth } from "../config.js";
import { trpcQuery } from "../api.js";

export async function status() {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Agent: ${cfg.agentName} (${cfg.agentId})`);
  console.log(`Enrolled: ${cfg.enrolledAt}`);
  console.log("");

  try {
    const agent = await trpcQuery("agents.getById", { agentId: cfg.agentId });
    console.log(`Status:          ${agent.status}`);
    console.log(`Credit Balance:  ${agent.creditBalance}`);
    console.log(`Tasks Completed: ${agent.totalTasksCompleted}`);
    console.log(`Tasks Failed:    ${agent.totalTasksFailed}`);
    console.log(`Active Tasks:    ${agent.activeTasks}`);
    console.log(`Last Heartbeat:  ${agent.lastHeartbeat || "never"}`);
    console.log(`Roles:           ${(agent.roles || []).join(", ")}`);
    console.log(`Region:          ${agent.region || "unset"}`);
  } catch (e) {
    console.error(`Failed to fetch status: ${e.message}`);
  }
}
