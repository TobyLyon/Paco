/**
 * Deposit Indexer: scans blocks for native transfers to the house wallet
 */
const { createPublicClient, http } = require('viem')
const ABSTRACT = {
  id: 2741,
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
}

function createClient() {
  return createPublicClient({ chain: ABSTRACT, transport: http(ABSTRACT.rpcUrls.default.http[0]) })
}

async function indexDeposits({ supabase, houseAddress, minConfirmations = 1, windowBlocks = 2000n }) {
  const client = createClient()
  const toLower = houseAddress.toLowerCase()

  // get latest processed block
  let fromBlock
  const { data: cursorRows } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('id', 'deposit_cursor')
    .limit(1)
  if (cursorRows && cursorRows.length > 0 && cursorRows[0].cursor_block) {
    fromBlock = BigInt(cursorRows[0].cursor_block)
  } else {
    const tip = await client.getBlockNumber()
    fromBlock = tip > windowBlocks ? tip - windowBlocks : 0n
  }

  const latest = await client.getBlockNumber()
  const endBlock = latest - BigInt(minConfirmations)
  if (endBlock <= fromBlock) return { scanned: 0 }

  let scanned = 0
  for (let b = fromBlock; b <= endBlock; b++) {
    const block = await client.getBlock({ blockNumber: b, includeTransactions: true })
    for (const tx of block.transactions) {
      if (!tx.to) continue
      if (tx.to.toLowerCase() !== toLower) continue
      // Attribute deposit
      const txHash = tx.hash
      const amountWei = tx.value.toString()

      // Upsert deposit
      await supabase.from('deposits').upsert({
        id: txHash,
        tx_hash: txHash,
        amount_wei: amountWei,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
    }
    scanned++
  }

  await supabase
    .from('webhook_events')
    .upsert({ id: 'deposit_cursor', type: 'deposit_cursor', cursor_block: endBlock.toString(), created_at: new Date().toISOString() })
  return { scanned }
}

module.exports = { indexDeposits }


