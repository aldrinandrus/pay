import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Minimal ABI for spending cap contract
const abi = [
  "function getSpendingCap(address user) view returns (uint256)",
  "function getCurrentBalance(address user) view returns (uint256)",
  "function deductCost(address user, uint256 amount) returns (bool)",
];

export const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// Verify EIP-712 / EIP-191 signature
export async function verifySignature(walletAddress: string, signature: string, message: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (e) {
    return false;
  }
}

export async function getBalances(walletAddress: string) {
  try {
    const cap = await contract.getSpendingCap(walletAddress);
    const bal = await contract.getCurrentBalance(walletAddress);
    return {
      spendingCap: ethers.formatUnits(cap, 6), // assuming USDC 6 decimals
      currentBalance: ethers.formatUnits(bal, 6),
    };
  } catch (e) {
    console.error("Blockchain read error", e);
    // Fallback logic for local testing without real contract
    return { spendingCap: "100.0", currentBalance: "10.0" };
  }
}

export async function deductOnChainCost(walletAddress: string, costInUsdc: number) {
  try {
    const amount = ethers.parseUnits(costInUsdc.toString(), 6);
    const tx = await contract.deductCost(walletAddress, amount);
    await tx.wait();
    return true;
  } catch (e) {
    console.error("Failed to deduct cost on chain", e);
    return false;
  }
}
