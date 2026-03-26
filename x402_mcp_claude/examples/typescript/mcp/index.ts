/**
 * Need:
 * - MCP server to be able to verify token (SSE should be able to do this)
 * - Need client to be able to send header
 * - Each client application would need to implement a wallet type
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { isAxiosError } from "axios";
import { config } from "dotenv";
import { createWalletClient, http, Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

const MCP_ROOT = dirname(fileURLToPath(import.meta.url));
config({ path: join(MCP_ROOT, ".env"), override: true });

const privateKey = process.env.PRIVATE_KEY as Hex;
/** Hono x402 weather demo only exposes GET /weather — ignore ENDPOINT_PATH so .env from other examples cannot break MCP. */
const WEATHER_PATH = "/weather";

if (!privateKey) {
  throw new Error(
    "Missing PRIVATE_KEY (copy mcp/.env-local to mcp/.env and set your Base Sepolia wallet key)",
  );
}

/** Written by servers/hono on startup — wins over env so Cursor MCP JSON cannot pin the wrong port. */
const HONO_HINT_FILE = join(MCP_ROOT, "../servers/hono/.resource-server-url");

/** Avoid Windows localhost → ::1 vs IPv4-only listener (ECONNREFUSED). */
function normalizeResourceServerUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "localhost") u.hostname = "127.0.0.1";
    return u.origin;
  } catch {
    return url.trim();
  }
}

function readHonoHintUrl(): string | undefined {
  try {
    if (!existsSync(HONO_HINT_FILE)) return undefined;
    const line = readFileSync(HONO_HINT_FILE, "utf8").trim().split(/\r?\n/)[0]?.trim();
    if (!line || !/^https?:\/\//i.test(line)) return undefined;
    return normalizeResourceServerUrl(line);
  } catch {
    return undefined;
  }
}

/**
 * Prefer ../servers/hono/.resource-server-url when present (unless MCP_USE_ENV_RESOURCE_URL=1).
 * Otherwise RESOURCE_SERVER_URL, then default 4021.
 */
function resolveResourceBaseUrl(): { baseURL: string; source: string } {
  const envUrl = process.env.RESOURCE_SERVER_URL?.trim();
  const forceEnv = process.env.MCP_USE_ENV_RESOURCE_URL === "1";
  const fromHint = !forceEnv ? readHonoHintUrl() : undefined;

  if (fromHint) {
    if (envUrl && normalizeResourceServerUrl(envUrl) !== fromHint) {
      console.error(
        `[mcp] Using ${HONO_HINT_FILE} → ${fromHint} (ignoring RESOURCE_SERVER_URL=${envUrl}). ` +
          `Set MCP_USE_ENV_RESOURCE_URL=1 to force .env / IDE env only.`,
      );
    } else {
      console.error(`[mcp] Resource server from Hono hint file → ${fromHint}`);
    }
    return { baseURL: fromHint, source: "hono/.resource-server-url" };
  }

  if (envUrl) {
    const baseURL = normalizeResourceServerUrl(envUrl);
    console.error(`[mcp] Resource server from RESOURCE_SERVER_URL → ${baseURL}`);
    return { baseURL, source: "env" };
  }

  const fallback = normalizeResourceServerUrl("http://127.0.0.1:4021");
  console.error(
    `[mcp] No Hono hint file (${HONO_HINT_FILE}) and no RESOURCE_SERVER_URL — defaulting to ${fallback}. ` +
      `Start servers/hono (pnpm dev), then pnpm sync-resource-url or rely on the hint file.`,
  );
  return { baseURL: fallback, source: "default" };
}

const { baseURL } = resolveResourceBaseUrl();

try {
  const u = new URL(baseURL);
  const p = u.port || (u.protocol === "https:" ? "443" : "80");
  if (p === "3001" || p === "3000") {
    console.error(
      `[mcp] Resource server uses port ${p} — usually not Hono /weather. ` +
        `Start servers/hono and ensure .resource-server-url exists or fix RESOURCE_SERVER_URL.`,
    );
  }
} catch {
  /* ignore */
}

/** Wallet must be tied to Base Sepolia so x402-axios can select base-sepolia payment requirements. */
const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

const client = withPaymentInterceptor(axios.create({ baseURL }), walletClient);

// Create an MCP server
const server = new McpServer({
  name: "x402 MCP Client Demo",
  version: "1.0.0",
});

// Add an addition tool
server.tool(
  "get-data-from-resource-server",
  "Get data from the resource server (in this example, the weather)",
  {},
  async () => {
    const fullUrl = `${baseURL.replace(/\/$/, "")}${WEATHER_PATH}`;
    try {
      const res = await client.get(WEATHER_PATH, {
        headers: { Accept: "application/json" },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `404 Not Found for ${fullUrl}. ` +
                `RESOURCE_SERVER_URL is probably not the Hono weather server — ` +
                `Express Prompt402 (:3001) and Next (:3000) do not define GET /weather.\n` +
                `Fix: start servers/hono (pnpm dev), run mcp: pnpm sync-resource-url, restart MCP, ` +
                `and remove RESOURCE_SERVER_URL from Cursor MCP JSON if it overrides mcp/.env.`,
            },
          ],
        };
      }
      if (isAxiosError(err) && err.response?.status === 402) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `402 Payment Required — x402-axios could not complete payment for ${fullUrl}.\n` +
                `1) mcp/.env: PRIVATE_KEY must be the payer (0x…); fund that address with Base Sepolia USDC (e.g. https://docs.base.org/chain/tools/network-faucets or Coinbase CDP testnet faucet).\n` +
                `2) servers/hono/.env: ADDRESS is the USDC recipient; use hosted facilitator FACILITATOR_URL=https://x402.org/facilitator unless you run the local facilitator on :3003.\n` +
                `3) Restart Hono after changing .env, then retry the MCP tool.`,
            },
          ],
        };
      }
      if (isAxiosError(err) && err.code === "ECONNREFUSED") {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Cannot reach resource server at ${baseURL} (${err.code}). ` +
                `Start Hono (writes ../servers/hono/.resource-server-url for this MCP to read):\n` +
                `  cd x402_mcp_claude/examples/typescript/servers/hono && pnpm dev\n` +
                `Optional: cd ../mcp && pnpm sync-resource-url (updates .env). ` +
                `Restart MCP after Hono starts. Facilitator must match Hono FACILITATOR_URL.`,
            },
          ],
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: `Request failed (${fullUrl}): ${msg}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
