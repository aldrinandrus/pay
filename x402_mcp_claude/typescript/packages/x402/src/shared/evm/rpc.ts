import { createPublicClient, http } from "viem";
import {
  base,
  baseSepolia,
  avalanche,
  avalancheFuji,
  polygon,
  polygonMumbai,
  // add additional chains here as needed
} from "viem/chains";
import { Network, EvmNetworkToChainId } from "../../types/shared/network";

/**
 * Returns a viem chain object corresponding to our network enum.
 * Throws if the network is not recognized or not supported by viem.
 */
function chainFromNetwork(network: Network) {
  switch (network) {
    case "base-sepolia":
      return baseSepolia;
    case "base":
      return base;
    case "avalanche":
      return avalanche;
    case "avalanche-fuji":
      return avalancheFuji;
    case "polygon":
      return polygon;
    case "polygon-amoy":
      // polygon-amoy is a testnet; polygonMumbai is the closest built-in
      return polygonMumbai;
    // if more networks are required add them here
    default:
      throw new Error(`Unsupported EVM network for RPC client: ${network}`);
  }
}

/**
 * Creates a public RPC client for the given EVM network.
 * If a custom URL is provided it will be used; otherwise the default URL
 * from the viem chain object is used.
 */
export function createEvmRpcClient(network: Network, url?: string) {
  const chain = chainFromNetwork(network);
  const transportUrl = url || (chain.rpcUrls.default?.http?.[0] as string);
  return createPublicClient({ chain, transport: http(transportUrl) });
}
