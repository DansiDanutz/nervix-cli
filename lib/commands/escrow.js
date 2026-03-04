import { loadConfig, getAuth } from "../config.js";
import { trpcMutation, trpcQuery } from "../api.js";

export async function createEscrow(toAgentId, amount, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error("Amount must be a positive number.");
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Creating escrow for ${numAmount} credits to ${toAgentId}...`);

  try {
    const result = await trpcMutation("escrow.create", {
      toAgentId,
      amount: numAmount,
      taskId: opts.task || undefined,
      description: opts.description || undefined,
      timeout: opts.timeout ? parseInt(opts.timeout) * 60 : undefined, // Convert minutes to seconds
    });
    console.log("Escrow created successfully!");
    console.log(`Escrow ID: ${result.escrowId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Amount: ${result.amount} credits`);
    console.log(`Timeout: ${result.expiresAt}`);
  } catch (e) {
    console.error(`Failed to create escrow: ${e.message}`);
  }
}

export async function releaseEscrow(escrowId, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Releasing escrow ${escrowId}...`);

  try {
    const result = await trpcMutation("escrow.release", {
      escrowId,
      recipientId: opts.recipient || undefined,
    });
    console.log("Escrow released successfully!");
    console.log(`Status: ${result.status}`);
    console.log(`Transferred: ${result.amount} credits to ${result.recipientId}`);
  } catch (e) {
    console.error(`Failed to release escrow: ${e.message}`);
  }
}

export async function refundEscrow(escrowId, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Refunding escrow ${escrowId}...`);

  try {
    const result = await trpcMutation("escrow.refund", {
      escrowId,
      reason: opts.reason || undefined,
    });
    console.log("Escrow refunded successfully!");
    console.log(`Status: ${result.status}`);
    console.log(`Refunded: ${result.amount} credits to ${result.refundTo}`);
  } catch (e) {
    console.error(`Failed to refund escrow: ${e.message}`);
  }
}

export async function listEscrows(opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  const limit = opts.limit || 20;

  try {
    const result = await trpcQuery("escrow.list", {
      agentId: cfg.agentId,
      role: opts.role || undefined, // 'creator' | 'recipient' | undefined (all)
      status: opts.status || undefined,
      limit,
    });
    const escrows = result.escrows || result;

    if (!escrows || escrows.length === 0) {
      console.log("No escrows found.");
      return;
    }

    console.log(`Escrows for ${cfg.agentName}:\n`);
    for (const esc of escrows) {
      const created = new Date(esc.createdAt).toLocaleString();
      const expires = esc.expiresAt ? new Date(esc.expiresAt).toLocaleString() : "never";
      console.log(`  [${esc.status}] Escrow ID: ${esc.escrowId}`);
      console.log(`    Amount: ${esc.amount} credits`);
      console.log(`    From: ${esc.creatorAgentName || esc.creatorId}`);
      console.log(`    To: ${esc.recipientAgentName || esc.recipientId}`);
      console.log(`    Created: ${created}`);
      console.log(`    Expires: ${expires}`);
      if (esc.taskId) console.log(`    Task: ${esc.taskId}`);
      if (esc.description) console.log(`    Description: ${esc.description}`);
      console.log("");
    }
  } catch (e) {
    console.error(`Failed to list escrows: ${e.message}`);
  }
}
