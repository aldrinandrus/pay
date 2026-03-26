/**
 * Copies the bound URL from servers/hono/.resource-server-url into mcp/.env as RESOURCE_SERVER_URL.
 * Run after the Hono server has started at least once.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.join(__dirname, "..");
const urlFile = path.join(mcpRoot, "../servers/hono/.resource-server-url");
const envPath = path.join(mcpRoot, ".env");

if (!fs.existsSync(urlFile)) {
  console.error(
    "[sync-resource-url] Missing ../servers/hono/.resource-server-url — start Hono first:\n" +
      "  cd ../servers/hono && pnpm dev",
  );
  process.exit(1);
}

const url = fs.readFileSync(urlFile, "utf8").trim();
if (!/^https?:\/\//i.test(url)) {
  console.error("[sync-resource-url] Invalid URL in .resource-server-url:", url);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error("[sync-resource-url] No mcp/.env — copy .env-local to .env first.");
  process.exit(1);
}

let env = fs.readFileSync(envPath, "utf8");
const line = `RESOURCE_SERVER_URL=${url}`;
if (/^RESOURCE_SERVER_URL=/m.test(env)) {
  env = env.replace(/^RESOURCE_SERVER_URL=.*$/m, line);
} else {
  env = `${env.replace(/\s*$/, "")}\n${line}\n`;
}

const endpointLine = "ENDPOINT_PATH=/weather";
if (/^ENDPOINT_PATH=/m.test(env)) {
  env = env.replace(/^ENDPOINT_PATH=.*$/m, endpointLine);
} else {
  env = `${env.replace(/\s*$/, "")}\n${endpointLine}\n`;
}

fs.writeFileSync(envPath, env, "utf8");
console.error(
  `[sync-resource-url] Updated mcp/.env → RESOURCE_SERVER_URL=${url}, ${endpointLine}`,
);
