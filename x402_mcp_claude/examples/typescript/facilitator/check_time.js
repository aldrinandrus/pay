import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  const block = await client.getBlock({ blockTag: 'latest' });
  console.log('Block timestamp:', block.timestamp);
  console.log('Human time:', new Date(Number(block.timestamp) * 1000).toISOString());
  console.log('Current system time:', new Date().toISOString());
}

main();