import { generateKeypair, signMessage } from "../crypto.js";
import { saveConfig, saveKeypair, loadKeypair, loadConfig } from "../config.js";
import { trpcMutation } from "../api.js";

const VALID_ROLES = ["coder", "orchestrator", "qa", "security", "docs", "research", "data", "deploy", "devops", "monitor"];

export async function enroll(name, opts) {
  const dryRun = !!opts.dryRun;
  const existing = loadConfig();
  if (existing.agentId && !opts.force) {
    if (dryRun) {
      console.log(`[dry-run] Already enrolled as ${existing.agentName} (${existing.agentId}); not modifying existing identity.`);
    } else {
      console.error(`Already enrolled as ${existing.agentName} (${existing.agentId})`);
      console.error("Use --force to re-enroll with a new identity.");
      process.exit(1);
    }
  }

  // Schema check: agent name must be present and non-empty
  if (!name || !name.trim()) {
    console.error("Agent name is required.");
    process.exit(1);
  }

  // Schema check: roles must all be valid
  const roles = (opts.roles || "coder").split(",").map(r => r.trim());
  for (const r of roles) {
    if (!VALID_ROLES.includes(r)) {
      console.error(`Invalid role: ${r}. Valid: ${VALID_ROLES.join(", ")}`);
      process.exit(1);
    }
  }

  if (dryRun) {
    // Exercise the crypto path in-memory without persisting anything.
    // Validates that keypair generation + signing work end-to-end.
    const keypair = loadKeypair() || generateKeypair();
    const signature = signMessage("dry-run-validation", keypair.secretKey);
    if (!signature) {
      console.error("[dry-run] Crypto validation failed: signature could not be produced.");
      process.exit(1);
    }

    console.log("[dry-run] Validation successful — no persistence, no registration, no API calls.");
    console.log(`[dry-run] Would enroll agent "${name}" with roles: ${roles.join(", ")}.`);
    if (opts.api) console.log(`[dry-run] Would set API URL: ${opts.api}`);
    if (opts.description) console.log(`[dry-run] Description: ${opts.description}`);
    if (opts.webhook) console.log(`[dry-run] Webhook: ${opts.webhook}`);
    console.log("[dry-run] Skipped: keypair save, config save, enrollment.request, enrollment.verify.");
    return;
  }

  // Generate or reuse keypair
  let keypair = loadKeypair();
  if (!keypair || opts.force) {
    keypair = generateKeypair();
    saveKeypair(keypair);
    console.log("Generated new Ed25519 keypair");
  } else {
    console.log("Using existing keypair");
  }

  if (opts.api) saveConfig({ apiUrl: opts.api });

  console.log(`Enrolling agent "${name}" with roles: ${roles.join(", ")}...`);

  // Step 1: Request enrollment challenge
  const challenge = await trpcMutation("enrollment.request", {
    agentName: name,
    publicKey: keypair.publicKey,
    roles,
    description: opts.description || undefined,
    webhookUrl: opts.webhook || undefined,
    hostname: opts.hostname || undefined,
    region: opts.region || undefined,
  });

  console.log(`Challenge received: ${challenge.challengeId}`);

  // Step 2: Sign the nonce
  const signature = signMessage(challenge.challengeNonce, keypair.secretKey);

  // Step 3: Verify enrollment
  const result = await trpcMutation("enrollment.verify", {
    challengeId: challenge.challengeId,
    signature,
  });

  // Save credentials
  saveConfig({
    agentId: result.agentId,
    agentName: name,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    sessionId: result.sessionId,
    enrolledAt: new Date().toISOString(),
  });

  console.log("");
  console.log("Enrollment successful!");
  console.log(`  Agent ID:     ${result.agentId}`);
  console.log(`  Name:         ${name}`);
  console.log(`  Roles:        ${roles.join(", ")}`);
  console.log(`  Access Token: ${result.accessToken.slice(0, 12)}...`);
  console.log("");
  console.log('Run "nervix start" to begin heartbeat and go online.');
}
