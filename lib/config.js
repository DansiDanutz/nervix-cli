import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".nervix");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const KEYS_FILE = join(CONFIG_DIR, "keypair.json");

export const DEFAULT_API = "https://nervix.ai/api/trpc";

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadConfig() {
  ensureDir();
  if (!existsSync(CONFIG_FILE)) return {};
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}

export function saveConfig(data) {
  ensureDir();
  const existing = loadConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...data }, null, 2));
}

export function loadKeypair() {
  if (!existsSync(KEYS_FILE)) return null;
  return JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
}

export function saveKeypair(data) {
  ensureDir();
  writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function getApiUrl() {
  const cfg = loadConfig();
  return cfg.apiUrl || DEFAULT_API;
}

export function getAuth() {
  const cfg = loadConfig();
  if (!cfg.accessToken) return null;
  return { agentId: cfg.agentId, accessToken: cfg.accessToken, refreshToken: cfg.refreshToken };
}
