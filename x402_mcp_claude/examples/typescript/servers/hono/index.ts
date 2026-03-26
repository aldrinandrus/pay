import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Hono } from "hono";
import { createAdaptorServer } from "@hono/node-server";
import { paymentMiddleware, Network, Resource, SolanaAddress } from "x402-hono";

config();

/** Hosted testnet facilitator — same default as `x402` package; no local process on :3003 required. */
const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

const facilitatorUrl = (process.env.FACILITATOR_URL?.trim() ||
  DEFAULT_FACILITATOR_URL) as Resource;
const payTo = (process.env.ADDRESS?.trim() || process.env.X402_PAY_TO?.trim()) as
  | `0x${string}`
  | SolanaAddress
  | undefined;
const network = process.env.NETWORK?.trim() as Network | undefined;

const missing: string[] = [];
if (!payTo) missing.push("ADDRESS (or X402_PAY_TO)");
if (!network) missing.push("NETWORK");
if (missing.length > 0) {
  console.error(
    `[hono-weather] Missing required environment variables: ${missing.join(", ")}\n` +
      "Copy .env-local to .env and set ADDRESS to your Base Sepolia pay-to wallet (USDC receiver).\n" +
      `Optional: FACILITATOR_URL (defaults to ${DEFAULT_FACILITATOR_URL}).`,
  );
  process.exit(1);
}

if (!process.env.FACILITATOR_URL?.trim()) {
  console.error(`[hono-weather] FACILITATOR_URL unset — using ${DEFAULT_FACILITATOR_URL}`);
}

const app = new Hono();

/** Unpaid health — helps confirm you hit Hono, not :3000 / :3001. */
app.get("/", c =>
  c.json({
    service: "x402-hono-weather",
    paidEndpoint: "GET /weather",
    hint: "MCP RESOURCE_SERVER_URL should be this origin (e.g. http://127.0.0.1:4021)",
  }),
);

const parsedPort = parseInt(process.env.PORT || "4021", 10);
const preferredPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4021;
/** If true, fail immediately when PORT is taken (no scan). */
const strictPort =
  process.env.STRICT_PORT === "1" || process.env.STRICT_PORT?.toLowerCase() === "true";
/** How many ports to try after preferred (default 30). */
const portRange = Math.max(0, parseInt(process.env.PORT_RANGE || "30", 10) || 30);
const maxPort = strictPort ? preferredPort : preferredPort + portRange;
/** Bind IPv4 loopback so we don’t double-use the port with another `:::4021` listener. */
const hostname = process.env.HOST?.trim() || "127.0.0.1";

app.use(
  paymentMiddleware(
    payTo,
    {
      "/weather": {
        price: "$0.001",
        network,
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

const weatherJson = {
  report: {
    weather: "sunny",
    temperature: 70,
  },
};

app.get("/weather", c => c.json(weatherJson));
app.get("/weather/", c => c.json(weatherJson));

function tryListen(tryPort: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const srv = createAdaptorServer({
      fetch: app.fetch,
      hostname,
    });

    const onEarlyError = (err: Error & { code?: string }) => {
      srv.removeListener("error", onEarlyError);
      if (err.code === "EADDRINUSE") {
        srv.close(() => {});
        reject(Object.assign(new Error("EADDRINUSE"), { code: "EADDRINUSE" as const }));
        return;
      }
      reject(err);
    };

    srv.on("error", onEarlyError);

    srv.listen(tryPort, hostname, () => {
      srv.removeListener("error", onEarlyError);
      srv.on("error", (err: Error) => {
        console.error("[hono-weather] Server error:", err.message);
        process.exit(1);
      });

      const publicBase = `http://${hostname}:${tryPort}`;
      try {
        const hintFile = join(process.cwd(), ".resource-server-url");
        writeFileSync(hintFile, `${publicBase}\n`, "utf8");
        console.error(
          `[hono-weather] Wrote ${hintFile} — run in mcp/: pnpm sync-resource-url to update RESOURCE_SERVER_URL in .env`,
        );
      } catch (writeErr) {
        console.error("[hono-weather] Could not write .resource-server-url:", writeErr);
      }

      if (tryPort !== preferredPort) {
        console.error(
          `[hono-weather] Port ${preferredPort} was busy; bound to ${tryPort}. ` +
            `Point MCP at ${publicBase} or run: cd ../mcp && pnpm sync-resource-url`,
        );
      }
      console.error(
        `[hono-weather] x402 resource server listening on ${publicBase} (GET /weather)`,
      );
      resolve();
    });
  });
}

async function start() {
  for (let p = preferredPort; p <= maxPort; p++) {
    try {
      await tryListen(p);
      return;
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === "EADDRINUSE") continue;
      console.error("[hono-weather] Failed to start:", e);
      process.exit(1);
    }
  }
  console.error(
    `[hono-weather] No free port from ${preferredPort} through ${maxPort} on ${hostname}. ` +
      `Stop the other process or set PORT= to a free port. (Or STRICT_PORT=0 and widen PORT_RANGE.)`,
  );
  process.exit(1);
}

start().catch((e) => {
  console.error("[hono-weather]", e);
  process.exit(1);
});
