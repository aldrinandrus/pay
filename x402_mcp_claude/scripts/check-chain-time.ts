import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

async function main() {
  const rpcUrl = baseSepolia.rpcUrls.default?.http?.[0] as string;
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const blockNumber = await client.getBlockNumber();
  const block = await client.getBlock({ blockNumber });
  const ts = Number(block.timestamp);
  console.log(
    "latest block",
    blockNumber,
    "timestamp",
    ts,
    new Date(ts * 1000),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});