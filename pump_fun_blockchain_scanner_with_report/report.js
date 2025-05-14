
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function parseLogLine(line) {
  const parts = line.trim().split(" | ");
  return {
    type: parts[1],
    mint: parts[2],
    amount: parseFloat(parts[3]),
    price: parseFloat(parts[4]),
    txid: parts[5],
  };
}

function calculateDailyPnL(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  let buys = {}, pnl = 0, countBuy = 0, countSell = 0;

  for (const line of lines) {
    const log = parseLogLine(line);
    if (log.type === "BUY") {
      buys[log.mint] = { price: log.price, amount: log.amount };
      countBuy++;
    } else if (log.type === "SELL" && buys[log.mint]) {
      const diff = (log.price - buys[log.mint].price) * (log.amount / 100);
      pnl += diff;
      countSell++;
    }
  }

  return { pnl, countBuy, countSell };
}

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message
  });
}

async function sendDailySummary() {
  const date = new Date().toISOString().split("T")[0];
  const logPath = path.join(__dirname, "logs", `${date}.log`);
  const summary = calculateDailyPnL(logPath);

  if (!summary) return;

  const { pnl, countBuy, countSell } = summary;
  const emoji = pnl >= 0 ? "📈" : "📉";
  const msg = `📊 *Résumé du ${date}*
✅ ${countBuy} achats / 💰 ${countSell} ventes
${emoji} Gain net : ${pnl.toFixed(4)} SOL`;

  await sendTelegramMessage(msg);
}

sendDailySummary();
