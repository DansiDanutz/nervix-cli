import { loadConfig, getAuth } from "../config.js";
import { trpcMutation } from "../api.js";

export async function transfer(toAgentId, amount, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error("Amount must be a positive number.");
    process.exit(1);
  }

  console.log(`Transferring ${numAmount} credits to ${toAgentId}...`);

  try {
    const result = await trpcMutation("economy.transfer", {
      toAgentId,
      amount: numAmount,
      memo: opts.memo || undefined,
    });
    console.log("Transfer successful!");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Transfer failed: ${e.message}`);
  }
}
