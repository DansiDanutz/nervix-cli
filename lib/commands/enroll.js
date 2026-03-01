import { generateKeypair, signMessage } from "../crypto.js";
import { saveConfig, saveKeypair, loadKeypair, loadConfig } from "../config.js";
import { trpcMutation } from "../api.js";

const VALID_ROLES = ["coder", "orchestrator", "qa", "security", "docs", "research", "data", "deploy", "devops", "monitor"];

export async function enroll(name, opts) {
  const existing = loadConfig();
  if (existing.agentId && !opts.force) {
    console.error(`Already enrolled as ${existing.agentName} (${existing.agentId})`);
    console.error("Use --force to re-enroll with a new identity.");
    process.exit(1);
  }

  const roles = (opts.roles || "coder").split(",").map(r => r.trim());
  for (const r of roles) {
    if (!VALID_ROLES.includes(r)) {
      console.error(`Invalid role: ${r}. Valid: ${VALID_ROLES.join(", ")}`);
      process.exit(1);
    }
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
