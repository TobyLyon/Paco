/**
 * 💰 Core Money Helpers - All amounts in WEI as bigint
 * 
 * CRITICAL: Never use JavaScript Number for money calculations
 * All amounts are stored as wei (1e18 precision) using BigInt
 */

const { parseEther, parseUnits, formatEther, formatUnits } = require('viem');

const WAD = 10n ** 18n;           // 1e18 (Solidity-style fixed point)
const BP  = 10_000n;              // basis points (100% = 10000)

/** Parse user ETH string -> wei bigint (rejects junk) */
function toWei(eth) {
  // viem parseEther throws on invalid inputs; good.
  return parseEther(eth);
}

/** Format wei -> ETH string for display only */
function fromWei(wei) {
  return formatEther(wei);
}

/** Parse units with custom decimals (tokens) */
function toUnits(amount, decimals) {
  return parseUnits(amount, decimals);
}

function fromUnits(wei, decimals) {
  return formatUnits(wei, decimals);
}

/** Fixed-point multiply/divide (WAD = 1e18). Rounds half-up. */
function wadMul(a, wad) { 
  return (a * wad + WAD/2n) / WAD; 
}

function wadDiv(a, wad) { 
  return (a * WAD + wad/2n) / wad; 
}

/** Percentage in basis points (e.g., 300 = 3%) */
function percentMul(a, bps) {
  const n = typeof bps === 'bigint' ? bps : BigInt(bps);
  return (a * n) / BP;
}

/** Safe add/sub (readability) */
const add = (a, b) => a + b;
const sub = (a, b) => a - b;

/** Guards */
const isNonNeg = (x) => x >= 0n;

/** Serialize for JSON (since BigInt can't cross the wire) */
const weiToString  = (x) => x.toString();
const stringToWei  = (s) => BigInt(s);

/** Convert multiplier (float) to WAD fixed-point for safe math */
function multiplierToWad(mult) {
  // Convert float -> fixed 1e18 with rounding to avoid drift
  return BigInt(Math.round(mult * 1e18));
}

/** Compute payout using fixed-point arithmetic */
function computePayoutWei(betWei, cashoutMultiplier) {
  const mWad = multiplierToWad(cashoutMultiplier);
  return wadMul(betWei, mWad);
}

/** Parse user input safely */
function parseUserAmount(input) {
  const trimmed = input.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('INVALID_AMOUNT');
  }
  return toWei(trimmed);
}

/** Format for UI display with specified decimals */
function formatForDisplay(wei, decimals = 4) {
  // UI display only - safe conversion to number for .toFixed()
  const ethString = fromWei(wei);
  return parseFloat(ethString).toFixed(decimals);
}

/** Convert wei string from database to BigInt */
function dbStringToWei(dbValue) {
  return BigInt(dbValue);
}

/** Convert wei BigInt to database string */
function weiToDbString(wei) {
  return wei.toString();
}

module.exports = {
  WAD,
  BP,
  toWei,
  fromWei,
  toUnits,
  fromUnits,
  wadMul,
  wadDiv,
  percentMul,
  add,
  sub,
  isNonNeg,
  weiToString,
  stringToWei,
  multiplierToWad,
  computePayoutWei,
  parseUserAmount,
  formatForDisplay,
  dbStringToWei,
  weiToDbString
};
