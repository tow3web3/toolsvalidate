const {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction
} = require("@solana/web3.js");
const axios = require("axios");
const bs58 = require("bs58");
const fetch = require("node-fetch");

const PRIVATE_KEY = bs58.decode(process.env.PRIVATE_KEY);
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

const connection = new Connection(SOLANA_RPC, "confirmed");
const { logTrade } = require("./utils/log");

const PUMP_FUN_PROGRAM_ID = new PublicKey("xxxxxxxxxxxxx"); // Pump.fun

let seen = new Set();

async function pollNewTokens() {
  try {
    const confirmed = await connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, { limit: 10 });
    for (const tx of confirmed) {
      if (seen.has(tx.signature)) continue;
      seen.add(tx.signature);

      const parsed = await connection.getParsedTransaction(tx.signature, "confirmed");
      if (!parsed) continue;

      const innerInstructions = parsed.meta?.innerInstructions || [];
      for (const group of innerInstructions) {
        for (const ix of group.instructions) {
          if (ix.program === "spl-token" && ix.parsed?.type === "initializeMint") {
            const mintAddress = ix.parsed.info.mint;
            console.log("🆕 Nouveau token minté:", mintAddress);
            await handleNewToken(mintAddress);
          }
        }
      }
    }
  } catch (err) {
    console.error("Erreur de scan:", err.message);
  }

  setTimeout(pollNewTokens, 5000); // poll every 5 seconds
}

async function handleNewToken(mint) {
  try {
    const res = await axios.get(
      `https://public-api.birdeye.so/public/token/${mint}`,
      { headers: { "X-API-KEY": BIRDEYE_API_KEY } }
    );
    const data = res.data.data;
    if (!data) return;

    if (data.volume24h > 10 && data.liquidity > 2 && data.marketCap < 50000) {
      const txid = await buyToken(mint);
      logTrade("BUY", mint, 0.5, data.value, txid);
      await sendTelegramMessage(`✅ Achat via SCAN | ${mint} | tx: https://solscan.io/tx/${txid}`);
      trackAndSell(mint, data.value);
    }
  } catch (e) {
    console.warn("Impossible d'analyser token", mint);
  }
}

async function buyToken(mintAddress) {
  const keypair = Keypair.fromSecretKey(PRIVATE_KEY);
  const res = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: PUBLIC_KEY,
      action: "buy",
      mint: mintAddress,
      amount: 0.5,
      denominatedInSol: true,
      slippage: 10,
      priorityFee: 0.00005,
      pool: "pump",
    }),
  });

  const txBuffer = await res.arrayBuffer();
  const transaction = new VersionedTransaction(new Uint8Array(txBuffer));
  transaction.sign([Keypair.fromSecretKey(PRIVATE_KEY)]);
  return await connection.sendTransaction(transaction);
}

async function sellToken(mintAddress) {
  const keypair = Keypair.fromSecretKey(PRIVATE_KEY);
  const res = await fetch("https://pumpportal.fun/api/trade-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: PUBLIC_KEY,
      action: "sell",
      mint: mintAddress,
      amount: 100,
      denominatedInSol: false,
      slippage: 10,
      priorityFee: 0.00005,
      pool: "pump",
    }),
  });

  const txBuffer = await res.arrayBuffer();
  const transaction = new VersionedTransaction(new Uint8Array(txBuffer));
  transaction.sign([keypair]);
  return await connection.sendTransaction(transaction);
}

async function getTokenPrice(mint) {
  try {
    const res = await axios.get(
      `https://public-api.birdeye.so/public/token/${mint}`,
      { headers: { "X-API-KEY": BIRDEYE_API_KEY } }
    );
    return res.data.data.value;
  } catch (e) {
    return 0;
  }
}

async function trackAndSell(mint, entryPrice) {
  const timeout = Date.now() + 30 * 60 * 1000;

  const interval = setInterval(async () => {
    const currentPrice = await getTokenPrice(mint);
    const pct = (currentPrice - entryPrice) / entryPrice;

    if (pct >= 1 || pct <= -0.3 || Date.now() >= timeout) {
      clearInterval(interval);
      const txid = await sellToken(mint);
      logTrade("SELL", mint, 100, currentPrice, txid);
      await sendTelegramMessage(`💰 Vente ${mint} | ${Math.round(pct * 100)}% | tx: https://solscan.io/tx/${txid}`);
    }
  }, 60000);
}

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message
  });
}

// Start scanning
pollNewTokens();
