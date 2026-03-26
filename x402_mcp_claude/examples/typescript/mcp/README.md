# x402 MCP Example Client

This is an example client that demonstrates how to use the x402 payment protocol with the Model Context Protocol (MCP) to make paid API requests through an MCP server.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- **A running x402 resource server** on the URL in `RESOURCE_SERVER_URL` (default port **4021**). Use the example Hono server at `examples/typescript/servers/hono` — see step 1 below.
- A valid Ethereum private key for making payments (Base Sepolia USDC)
- Claude Desktop (or Cursor) with MCP support

## Setup

### 1. Start the resource server (required — otherwise you get `ECONNREFUSED` on port 4021)

From the **typescript examples** workspace root (`examples/typescript`):

```bash
cd servers/hono
cp .env-local .env
# Edit .env: set ADDRESS (pay-to), FACILITATOR_URL, NETWORK=base-sepolia
pnpm dev
```

You should see a line like `[hono-weather] x402 resource server listening on http://127.0.0.1:4021` (or **4022** if 4021 was already in use).

Hono writes the actual base URL to **`servers/hono/.resource-server-url`** on startup.

### 1b. Point MCP at that URL (after Hono is up)

The MCP process **automatically prefers** `servers/hono/.resource-server-url` when that file exists (written on Hono startup). That **overrides** `RESOURCE_SERVER_URL` from Cursor/Claude MCP JSON or `.env`, so a stale `http://localhost:3001` in JSON no longer breaks the tool.

Optional: sync `.env` for other tools — from **`examples/typescript`**:

```bash
pnpm sync-resource-url
```

(or `cd mcp && pnpm sync-resource-url`)

To **force** only `.env` / IDE vars, set **`MCP_USE_ENV_RESOURCE_URL=1`** in MCP env.

To use another port: `PORT=5000 pnpm dev` then run `pnpm sync-resource-url` again.

From the **mcp** folder you can also run: `pnpm resource-server` (starts the same Hono app).

### 2. Install dependencies (typescript examples root)

```bash
cd ../../   # examples/typescript
pnpm install
pnpm build
cd mcp
```

### 3. MCP env

Copy `.env-local` to `.env` and set `PRIVATE_KEY`, then sync the resource URL (step 1b):

```bash
cp .env-local .env
pnpm sync-resource-url
```

Use `http://127.0.0.1` (not `localhost`) on Windows if you still see connection errors.

### 4. Configure Claude Desktop / Cursor MCP settings

```json
{
  "mcpServers": {
    "x402-weather": {
      "command": "pnpm",
      "args": [
        "--silent",
        "-C",
        "<absolute path>/x402_mcp_claude/examples/typescript/mcp",
        "dev"
      ],
      "env": {
        "PRIVATE_KEY": "<private key — wallet with Base Sepolia USDC>",
        "ENDPOINT_PATH": "/weather"
      }
    }
  }
}
```

**`RESOURCE_SERVER_URL` in JSON is optional:** if **`servers/hono/.resource-server-url`** exists, the MCP server uses it and **ignores** a wrong URL in JSON (see stderr on startup). Use **`MCP_USE_ENV_RESOURCE_URL=1`** only if you must force JSON/`.env` values.

### 5. Run the MCP server (or let the IDE start it via the config above)

```bash
pnpm dev
```

## How It Works

The example demonstrates how to:
1. Create a wallet client using viem
2. Set up an MCP server with x402 payment handling
3. Create a tool that makes paid API requests
4. Handle responses and errors through the MCP protocol

## Example Code

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { withPaymentInterceptor } from "x402-axios";

// Create wallet client
const wallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account: privateKeyToAccount(PRIVATE_KEY as Hex),
}).extend(publicActions);

// Create Axios instance with payment handling
const client = withPaymentInterceptor(axios.create({ baseURL: RESOURCE_SERVER_URL }), wallet);

// Create MCP server
const server = new McpServer({
  name: "x402 MCP Client Demo",
  version: "1.0.0",
});

// Add tool for making paid requests
server.tool("get-data-from-resource-server", "Get data from the resource server (in this example, the weather)",  {}, async () => {
  const res = await client.get(`${ENDPOINT_PATH}`);
  return {
    content: [{ type: "text", text: JSON.stringify(res.data) }],
  };
});

// Connect to MCP transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Response Handling

### Payment Required (402)
When a payment is required, the MCP server will:
1. Receive the 402 response
2. Parse the payment requirements
3. Create and sign a payment header
4. Automatically retry the request with the payment header

### Successful Response
After payment is processed, the MCP server will return the response data through the MCP protocol:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"report\":{\"weather\":\"sunny\",\"temperature\":70}}"
    }
  ]
}
```

## Extending the Example

To use this pattern in your own application:

1. Install the required dependencies:
```bash
npm install @modelcontextprotocol/sdk x402-axios viem
```

2. Set up your environment variables
3. Create a wallet client
4. Set up your MCP server with x402 payment handling
5. Define your tools for making paid requests
6. Connect to the MCP transport

## Integration with Claude Desktop

This example is designed to work with Claude Desktop's MCP support. The MCP server will:
1. Listen for tool requests from Claude
2. Handle the payment process automatically
3. Return the response data through the MCP protocol
4. Allow Claude to process and display the results
