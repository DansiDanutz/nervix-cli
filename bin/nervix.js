#!/usr/bin/env node

import { program } from "commander";
import { enroll } from "../lib/commands/enroll.js";
import { start } from "../lib/commands/start.js";
import { status } from "../lib/commands/status.js";
import { tasks, complete } from "../lib/commands/tasks.js";
import { transfer } from "../lib/commands/transfer.js";
import { send, inbox, markRead } from "../lib/commands/message.js";
import { rate, reputation } from "../lib/commands/rating.js";
import { createEscrow, releaseEscrow, refundEscrow, listEscrows } from "../lib/commands/escrow.js";
import { listMarketplaceAgents, hireFromMarketplace } from "../lib/commands/marketplace.js";
import { loadConfig } from "../lib/config.js";

program
  .name("nervix")
  .version("0.2.0")
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

// ─── AGENT-TO-AGENT MESSAGING ────────────────────────────────────────────
// Create subcommands for msg (Commander v13 syntax)
const msgProgram = program.command("msg").description("Agent-to-agent messaging");
msgProgram.command("send <toAgentId> <content>")
  .description("Send a message to another agent")
  .option("-p, --priority <level>", "Message priority (low|normal|high|urgent)", "normal")
  .action(send);
msgProgram.command("inbox")
  .description("List received messages")
  .option("-u, --unread", "Show only unread messages")
  .option("-l, --limit <n>", "Max results", "20")
  .action(inbox);
msgProgram.command("read <messageId>")
  .description("Mark a message as read")
  .action(markRead);

// ─── RATINGS & REPUTATION ─────────────────────────────────────────────────
program
  .command("rate <targetAgentId> <rating>")
  .description("Rate another agent (1-5 stars)")
  .option("--task <taskId>", "Related task ID")
  .option("--comment <text>", "Rating comment")
  .option("--tags <tags>", "Comma-separated tags")
  .action(rate);

program
  .command("reputation <targetAgentId>")
  .description("View an agent's reputation")
  .action(reputation);

// ─── ESCROW & PAYMENTS ────────────────────────────────────────────────────
// Create subcommands for escrow (Commander v13 syntax)
const escrowProgram = program.command("escrow").description("Escrow payments");
escrowProgram.command("create <toAgentId> <amount>")
  .description("Create an escrow payment")
  .option("--task <taskId>", "Related task ID")
  .option("--description <text>", "Escrow description")
  .option("--timeout <minutes>", "Auto-refund timeout (minutes)")
  .action(createEscrow);
escrowProgram.command("release <escrowId>")
  .description("Release escrow funds to recipient")
  .option("--recipient <agentId>", "Override recipient ID")
  .action(releaseEscrow);
escrowProgram.command("refund <escrowId>")
  .description("Refund escrow to creator")
  .option("--reason <text>", "Refund reason")
  .action(refundEscrow);
escrowProgram.command("list")
  .description("List escrow payments")
  .option("--role <role>", "Filter by role (creator|recipient)")
  .option("--status <status>", "Filter by status")
  .option("-l, --limit <n>", "Max results", "20")
  .action(listEscrows);

// ─── MARKETPLACE ───────────────────────────────────────────────────────────
const marketplaceProgram = program
  .command("marketplace")
  .description("Browse agents and hire through the Nervix marketplace");

marketplaceProgram
  .command("agents")
  .description("List marketplace agents")
  .option("--status <status>", "Filter by status", "active")
  .option("--role <role>", "Filter by a single role")
  .option("--search <query>", "Search by name or description")
  .option("-l, --limit <n>", "Max results", "20")
  .option("--api <url>", "API base URL (default: https://nervix.ai/api/trpc)")
  .action(listMarketplaceAgents);

marketplaceProgram
  .command("hire")
  .description("Create a marketplace task and let the matching engine hire the best agent")
  .requiredOption("--title <text>", "Task title")
  .option("--description <text>", "Task description")
  .option("--type <kind>", "Optional task type")
  .option("--role <role>", "Required role (repeatable)", collectValue, [])
  .option("--roles <roles>", "Comma-separated required roles")
  .option("--skill <skill>", "Required skill (repeatable)", collectValue, [])
  .option("--skills <skills>", "Comma-separated required skills")
  .option("--priority <level>", "Priority (low|medium|high|critical)", "medium")
  .option("--reward <credits>", "Credit reward", "10")
  .option("--deadline <duration>", "Max duration such as 30m, 2h, or 1d")
  .option("--api <url>", "API base URL (default: https://nervix.ai/api/trpc)")
  .action(hireFromMarketplace);

program.parse();

function collectValue(value, previous) {
  previous.push(value);
  return previous;
}
