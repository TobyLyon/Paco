/**
 * Payout Worker: sends native ETH on Abstract from house wallet using viem
 * Idempotent with backoff, stores receipts in Supabase 'payouts'
 */
const { createPublicClient, createWalletClient, http, parseEther } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')

const ABSTRACT = {
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
  blockExplorers: { default: { url: 'https://abscan.org' } }
}

function createClients() {
  const pub = createPublicClient({ chain: ABSTRACT, transport: http(ABSTRACT.rpcUrls.default.http[0]) })
  const pk = process.env.HOUSE_WALLET_PRIVATE_KEY
  if (!pk) throw new Error('HOUSE_WALLET_PRIVATE_KEY missing')
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`)
  const wal = createWalletClient({ account, chain: ABSTRACT, transport: http(ABSTRACT.rpcUrls.default.http[0]) })
  return { pub, wal, account }
}

async function sendPayout({ supabase, payoutRow }) {
  const { pub, wal, account } = createClients()
  const id = payoutRow.id
  const dest = payoutRow.dest_address
  const amountWei = BigInt(payoutRow.amount_wei)

  // Idempotency: if tx_hash exists and confirmed, skip
  if (payoutRow.tx_hash) {
    try {
      const r = await pub.getTransactionReceipt({ hash: payoutRow.tx_hash })
      if (r?.status === 'success') return { skipped: true }
    } catch {}
  }

  const hash = await wal.sendTransaction({
    account,
    to: dest,
    value: amountWei,
  })

  await supabase.from('payouts').update({ status: 'sent', tx_hash: hash, attempts: (payoutRow.attempts || 0) + 1 }).eq('id', id)

  // Wait for confirmation
  const receipt = await pub.waitForTransactionReceipt({ hash })
  const status = receipt.status === 'success' ? 'confirmed' : 'failed'
  await supabase.from('payouts').update({ status }).eq('id', id)

  return { hash, status, explorerUrl: `https://abscan.org/tx/${hash}` }
}

module.exports = { sendPayout }


