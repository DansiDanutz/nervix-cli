import { loadConfig, getAuth } from "../config.js";
import { trpcMutation, trpcQuery } from "../api.js";

export async function send(toAgentId, content, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  console.log(`Sending message to ${toAgentId}...`);

  try {
    const result = await trpcMutation("a2a.send", {
      toAgentId,
      content,
      priority: opts.priority || "normal",
    });
    console.log("Message sent successfully!");
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Sent at: ${result.timestamp}`);
  } catch (e) {
    console.error(`Failed to send message: ${e.message}`);
  }
}

export async function inbox(opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  const cfg = loadConfig();
  const limit = opts.limit || 20;

  try {
    const result = await trpcQuery("a2a.listMessages", {
      agentId: cfg.agentId,
      limit,
      unreadOnly: opts.unread || false,
    });
    const messages = result.messages || result;

    if (!messages || messages.length === 0) {
      console.log("No messages found.");
      return;
    }

    console.log(`Inbox for ${cfg.agentName}:\n`);
    for (const msg of messages) {
      const timestamp = new Date(msg.createdAt).toLocaleString();
      const unread = msg.readAt ? "" : "[UNREAD] ";
      console.log(`  ${unread}From: ${msg.fromAgentName || msg.fromAgentId} (${msg.fromAgentId})`);
      console.log(`    Message ID: ${msg.messageId}`);
      console.log(`    Time: ${timestamp}`);
      console.log(`    Priority: ${msg.priority || "normal"}`);
      console.log(`    ${msg.content}`);
      console.log("");
    }
  } catch (e) {
    console.error(`Failed to fetch messages: ${e.message}`);
  }
}

export async function markRead(messageId, opts) {
  const auth = getAuth();
  if (!auth) {
    console.error('Not enrolled. Run "nervix enroll <name>" first.');
    process.exit(1);
  }

  try {
    await trpcMutation("a2a.markRead", {
      messageId,
    });
    console.log(`Message ${messageId} marked as read.`);
  } catch (e) {
    console.error(`Failed to mark message as read: ${e.message}`);
  }
}
