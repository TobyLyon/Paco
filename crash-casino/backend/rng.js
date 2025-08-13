const { keccak256 } = require('ethers')

function calculateCrashFromSeed(serverSeed, options = {}) {
  const min = options.min || 1.0
  const max = options.max || 1000.0
  const houseEdge = options.houseEdge ?? 0.01
  const hash = keccak256(`0x${serverSeed}`)
  const bigint = BigInt(hash)
  const r = Number(bigint % (2n ** 52n)) / Number(2n ** 52n)
  const raw = Math.floor((100 * (1 - houseEdge)) / Math.max(r, 1e-12)) / 100
  const capped = Math.max(min, Math.min(raw, max))
  return Math.round(capped * 100) / 100
}

module.exports = { calculateCrashFromSeed }


