import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const DEFAULT_API = "https://nervix.ai/api/trpc";

function getConfigDir() {
  return join(homedir(), ".nervix");
}

function getConfigFile() {
  return join(getConfigDir(), "config.json");
}

function getKeysFile() {
  return join(getConfigDir(), "keypair.json");
}

function ensureDir() {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
}

export function loadConfig() {
  const configFile = getConfigFile();
  ensureDir();
  if (!existsSync(configFile)) return {};
  return JSON.parse(readFileSync(configFile, "utf-8"));
}

export function saveConfig(data) {
  const configFile = getConfigFile();
  ensureDir();
  const existing = loadConfig();
  writeFileSync(configFile, JSON.stringify({ ...existing, ...data }, null, 2));
}

export function loadKeypair() {
  const keysFile = getKeysFile();
  if (!existsSync(keysFile)) return null;
  return JSON.parse(readFileSync(keysFile, "utf-8"));
}

export function saveKeypair(data) {
  const keysFile = getKeysFile();
  ensureDir();
  writeFileSync(keysFile, JSON.stringify(data, null, 2), { mode: 0o600 });
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
