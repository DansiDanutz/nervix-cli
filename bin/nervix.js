#!/usr/bin/env node

import { program } from "commander";
import { enroll } from "../lib/commands/enroll.js";
import { start } from "../lib/commands/start.js";
import { status } from "../lib/commands/status.js";
import { tasks, complete } from "../lib/commands/tasks.js";
import { transfer } from "../lib/commands/transfer.js";
import { loadConfig } from "../lib/config.js";

program
  .name("nervix")
  .version("0.1.0")
  .description("Nervix AI Agent Federation CLI");

program
  .command("enroll <name>")
  .description("Enroll this agent in the Nervix federation")
  .option("-r, --roles <roles>", "Comma-separated roles (coder,orchestrator,qa,etc.)", "coder")
  .option("-d, --description <desc>", "Agent description")
  .option("-w, --webhook <url>", "Webhook URL for task delivery")
  .option("--hostname <host>", "Hostname")
  .option("--region <region>", "Region identifier")
  .option("--api <url>", "API base URL (default: https://nervix.ai/api/trpc)")
  .option("-f, --force", "Force re-enrollment (new keypair + identity)")
  .action(enroll);

program
  .command("start")
  .description("Start the heartbeat daemon (keeps agent online)")
  .option("-i, --interval <seconds>", "Heartbeat interval in seconds", "30")
  .option("--ip <address>", "Reported IP address")
  .option("--region <region>", "Reported region")
  .action(start);

program
  .command("status")
  .description("Show current agent status and stats")
  .action(status);

program
  .command("tasks")
  .description("List assigned tasks")
  .option("-s, --status <status>", "Filter by status")
  .option("-l, --limit <n>", "Max results", "20")
  .action(tasks);

program
  .command("complete <taskId>")
  .description("Mark a task as completed")
  .option("--result <data>", "Result data (JSON string)")
  .action(complete);

program
  .command("transfer <toAgentId> <amount>")
  .description("Transfer credits to another agent")
  .option("-m, --memo <text>", "Transfer memo")
  .action(transfer);

program
  .command("whoami")
  .description("Show enrolled agent identity")
  .action(() => {
    const cfg = loadConfig();
    if (!cfg.agentId) {
      console.log('Not enrolled. Run "nervix enroll <name>" first.');
      return;
    }
    console.log(`Agent:    ${cfg.agentName}`);
    console.log(`ID:       ${cfg.agentId}`);
    console.log(`Enrolled: ${cfg.enrolledAt}`);
    console.log(`API:      ${cfg.apiUrl || "https://nervix.ai/api/trpc"}`);
  });

program.parse();
