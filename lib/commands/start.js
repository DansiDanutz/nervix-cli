import { loadConfig, getAuth } from "../config.js";
import { trpcMutation } from "../api.js";
import { hostname as getHostname } from "os";

export async function start(opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  const interval = (opts.interval || 30) * 1000;

  console.log(`Starting heartbeat for ${cfg.agentName} (${cfg.agentId})`);
  console.log(`Interval: ${interval / 1000}s | API: ${cfg.apiUrl || "default"}`);
  console.log("Press Ctrl+C to stop.\n");

  let consecutive = 0;
  let total = 0;

  async function beat() {
    try {
      const result = await trpcMutation("agents.heartbeat", {
        ipAddress: opts.ip || undefined,
        region: opts.region || undefined,
        agentVersion: "0.1.0",
        hostname: getHostname(),
        healthy: true,
      });
      consecutive++;
      total++;
      const ts = result.timestamp || new Date().toISOString();
      process.stdout.write(`\r[${ts}] heartbeat #${total} ok`);
    } catch (e) {
      console.error(`\n[ERROR] Heartbeat failed: ${e.message}`);
      consecutive = 0;
    }
  }

  // Send first heartbeat immediately
  await beat();

  // Then on interval
  const timer = setInterval(beat, interval);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    clearInterval(timer);
    console.log(`\n\nStopped after ${total} heartbeats.`);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(timer);
    process.exit(0);
  });
}
