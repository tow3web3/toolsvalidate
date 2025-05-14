// Check Wallet Balance
import { Connection, PublicKey } from "@solana/web3.js";

async function checkBalance(walletAddress) {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const publicKey = new PublicKey(walletAddress);
  const balance = await connection.getBalance(publicKey);
  console.log("Wallet balance:", balance / 1e9, "SOL");
}

checkBalance("YOUR_WALLET_ADDRESS_HERE");
