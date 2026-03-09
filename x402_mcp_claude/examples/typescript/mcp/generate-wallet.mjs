/**
 * Simple script to generate a new Ethereum wallet for testing
 * Run with: node generate-wallet.js
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Generate a new random private key
const privateKey = generatePrivateKey();

// Create an account from the private key
const account = privateKeyToAccount(privateKey);

console.log("\n🎉 New Test Wallet Generated!\n");
console.log("=" .repeat(60));
console.log("\n📋 IMPORTANT: Save these credentials securely!\n");
console.log("Private Key (keep this secret!):");
console.log(privateKey);
console.log("\nWallet Address (public):");
console.log(account.address);
console.log("\n" + "=".repeat(60));
console.log("\n⚠️  This is for TESTNET ONLY - Never use for real funds!");
console.log("\n📝 Next steps:");
console.log("1. Fund this address with Base Sepolia ETH from faucet");
console.log("2. Get Base Sepolia USDC from faucet");
console.log("3. Use these credentials in your .env files\n");
