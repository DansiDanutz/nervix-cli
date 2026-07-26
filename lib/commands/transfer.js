import { getAuth } from "../config.js";
import { trpcMutation } from "../api.js";
import { isValidAgentId, validateAmount, validationError } from "../validation.js";

export async function transfer(toAgentId, amount, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  if (!isValidAgentId(toAgentId)) {
    console.error(validationError("agent ID", "3-64 alphanumeric characters, dashes and underscores"));
    process.exit(1);
  }

  const numAmount = validateAmount(amount);
  if (numAmount === null) {
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
    process.exitCode = 1;
  }
}
