
const fs = require("fs");
const path = require("path");

function logTrade(type, mint, amount, price, txid) {
  const date = new Date().toISOString().split("T")[0];
  const filePath = path.join(__dirname, "logs", `${date}.log`);
  const entry = `${new Date().toISOString()} | ${type} | ${mint} | ${amount} | ${price} | ${txid}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, entry);
}

module.exports = { logTrade };
