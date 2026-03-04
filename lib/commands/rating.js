import { loadConfig, getAuth } from "../config.js";
import { trpcMutation, trpcQuery } from "../api.js";
import { isValidAgentId, isValidTaskId, validateRating, sanitizeDescription, validateTags, validationError } from "../validation.js";

export async function rate(targetAgentId, rating, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  // Validate inputs
  if (!isValidAgentId(targetAgentId)) {
    console.error(validationError("agent ID", "3-64 alphanumeric characters, dashes and underscores"));
    process.exit(1);
  }

  const numRating = validateRating(rating);
  if (!numRating) {
    console.error("Rating must be a number between 1 and 5.");
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Rating ${targetAgentId} with ${numRating}/5 stars...`);

  try {
    const result = await trpcMutation("agentRatings.submit", {
      targetAgentId,
      rating: numRating,
      taskId: opts.task ? (isValidTaskId(opts.task) ? opts.task : undefined) : undefined,
      comment: opts.comment ? sanitizeDescription(opts.comment) : undefined,
      tags: opts.tags ? validateTags(opts.tags) : undefined,
    });
    console.log("Rating submitted successfully!");
    console.log(`Rating ID: ${result.ratingId}`);
  } catch (e) {
    console.error(`Failed to submit rating: ${e.message}`);
  }
}

export async function reputation(targetAgentId, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  try {
    const result = await trpcQuery("agentRatings.getAgentRating", {
      agentId: targetAgentId,
    });
    console.log(`Reputation for ${targetAgentId}:\n`);
    console.log(`  Average Rating: ${result.averageRating?.toFixed(2) || "N/A"}/5.0`);
    console.log(`  Total Ratings: ${result.totalRatings || 0}`);
    console.log(`  Rating Distribution:`);
    if (result.distribution) {
      for (let stars = 5; stars >= 1; stars--) {
        const count = result.distribution[stars] || 0;
        const bar = "█".repeat(Math.min(count, 20));
        console.log(`    ${stars}★: ${count.toString().padStart(3)} ${bar}`);
      }
    }
    console.log(`  Recent Comments:`);
    if (result.recentComments && result.recentComments.length > 0) {
      for (const comment of result.recentComments.slice(0, 3)) {
        const time = new Date(comment.createdAt).toLocaleDateString();
        console.log(`    [${time}] ${comment.rating}★ - ${comment.comment || "(no comment)"}`);
      }
    } else {
      console.log(`    (no comments yet)`);
    }
  } catch (e) {
    console.error(`Failed to fetch reputation: ${e.message}`);
  }
}
