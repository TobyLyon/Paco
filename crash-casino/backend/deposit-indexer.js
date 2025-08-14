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

async function indexDeposits({ supabase, hotWalletAddress, minConfirmations = 1, windowBlocks = 2000n }) {
  const client = createClient()
  const toLower = hotWalletAddress.toLowerCase()

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
      // Professional attribution: extract user from tx.from (sender)
      const txHash = tx.hash
      const amountWei = tx.value.toString()
      const amountETH = parseFloat(amountWei) / 1e18
      const fromAddress = tx.from.toLowerCase()
      
      console.log(`💰 Processing hot wallet deposit: ${amountETH.toFixed(6)} ETH from ${fromAddress} to ${toLower}`)

      // Check if already processed
      const { data: existingDeposit } = await supabase
        .from('balance_deposits')
        .select('id')
        .eq('tx_hash', txHash)
        .single()
      
      if (existingDeposit) {
        console.log(`⚠️ Deposit ${txHash} already processed, skipping`)
        continue
      }

      // Get current balance for this user
      let currentBalance = 0
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('address', fromAddress)
        .single()
      
      if (balanceData) {
        currentBalance = parseFloat(balanceData.balance)
      }

      const newBalance = currentBalance + amountETH

      // Update user balance
      await supabase
        .from('user_balances')
        .upsert({
          address: fromAddress,
          balance: newBalance,
          updated_at: new Date().toISOString()
        })

      // Record deposit in balance_deposits table
      await supabase
        .from('balance_deposits')
        .insert({
          tx_hash: txHash,
          from_address: fromAddress,
          amount: amountETH,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: 'confirmed',
          created_at: new Date().toISOString()
        })

      console.log(`✅ Deposit credited: ${fromAddress} +${amountETH} ETH (balance: ${currentBalance} → ${newBalance})`)
    }
    scanned++
  }

  await supabase
    .from('webhook_events')
    .upsert({ id: 'deposit_cursor', type: 'deposit_cursor', cursor_block: endBlock.toString(), created_at: new Date().toISOString() })
  return { scanned }
}

module.exports = { indexDeposits }


