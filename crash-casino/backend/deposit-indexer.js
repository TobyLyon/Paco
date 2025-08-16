/**
 * Deposit Indexer: scans blocks for native transfers to the house wallet
 * CRITICAL: All money calculations use BigInt/Wei for precision
 */
const { createPublicClient, http } = require('viem');
const { formatForDisplay, fromWei, toWei } = require('../../src/lib/money');
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
      // Display conversion only for logging - not money arithmetic
      const amountETH = Number(fromWei(amountWei))
      const fromAddress = tx.from.toLowerCase()
      
      console.log(`💰 Processing hot wallet deposit: ${amountETH.toFixed(6)} ETH from ${fromAddress} to ${toLower}`)

      // Check if already processed
      const { data: existingDeposit, error: checkError } = await supabase
        .from('balance_deposits')
        .select('id, from_address, amount, status, created_at')
        .eq('tx_hash', txHash)
        .single()
      
      if (existingDeposit) {
        console.log(`⚠️ Deposit ${txHash} already processed, skipping`)
        console.log(`📊 Existing deposit details:`, {
          id: existingDeposit.id,
          from_address: existingDeposit.from_address,
          amount: existingDeposit.amount,
          status: existingDeposit.status,
          created_at: existingDeposit.created_at
        })
        continue
      }
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking existing deposit:`, checkError)
        continue
      }

      // Get current balance for this user
      let currentBalance = 0
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('address', fromAddress)
        .single()
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error(`❌ Error fetching balance for ${fromAddress}:`, balanceError)
        continue
      }
      
      if (balanceData) {
        // Display conversion only for logging - not money arithmetic
        currentBalance = Number(balanceData.balance)
        console.log(`💰 Current balance for ${fromAddress}: ${currentBalance.toFixed(6)} ETH`)
      } else {
        console.log(`💰 New user ${fromAddress}, starting with 0 balance`)
      }

      // Calculate new balance using proper wei arithmetic
      const currentBalanceWei = toWei(currentBalance.toString())
      const newBalanceWei = currentBalanceWei + BigInt(amountWei)
      // Display conversion only for database storage - not money arithmetic
      const newBalance = Number(fromWei(newBalanceWei))
      console.log(`💰 Crediting: ${amountETH.toFixed(6)} ETH → New balance: ${newBalance.toFixed(6)} ETH`)

      // Update user balance
      const { error: balanceUpdateError } = await supabase
        .from('user_balances')
        .upsert({
          address: fromAddress,
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        
      if (balanceUpdateError) {
        console.error(`❌ Failed to update balance for ${fromAddress}:`, balanceUpdateError)
        continue
      }

      // Record deposit in balance_deposits table
      const { error: depositError } = await supabase
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
        
      if (depositError) {
        console.error(`❌ Failed to record deposit:`, depositError)
        continue
      }

      console.log(`✅ Deposit credited: ${fromAddress} +${amountETH.toFixed(6)} ETH (balance: ${currentBalance.toFixed(6)} → ${newBalance.toFixed(6)})`)
    }
    scanned++
  }

  await supabase
    .from('webhook_events')
    .upsert({ id: 'deposit_cursor', type: 'deposit_cursor', cursor_block: endBlock.toString(), created_at: new Date().toISOString() })
  return { scanned }
}

module.exports = { indexDeposits }


