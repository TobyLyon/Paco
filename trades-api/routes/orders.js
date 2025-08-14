const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Initialize Supabase client with service role key for server operations
const supabase = createClient(
  process.env.TRADES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.TRADES_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Risk scoring service
const RiskScorer = require('../services/riskScorer');
const riskScorer = new RiskScorer();

/**
 * POST /api/trades/orders
 * Create a new trade order
 */
router.post('/', async (req, res) => {
  try {
    const { 
      orderHash,
      makerAddress,
      takerAddress,
      giveItems,
      takeItems,
      expiry,
      nonce,
      feeBps,
      signature 
    } = req.body;

    // Validate required fields
    if (!orderHash || !makerAddress || !giveItems || !takeItems || !expiry || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['orderHash', 'makerAddress', 'giveItems', 'takeItems', 'expiry', 'signature']
      });
    }

    // Validate expiry (max 24 hours from now)
    const maxExpiryHours = 24;
    const maxExpiry = new Date(Date.now() + maxExpiryHours * 60 * 60 * 1000);
    const orderExpiry = new Date(expiry);
    
    if (orderExpiry > maxExpiry) {
      return res.status(400).json({ 
        error: `Order expiry cannot be more than ${maxExpiryHours} hours from now` 
      });
    }

    if (orderExpiry <= new Date()) {
      return res.status(400).json({ 
        error: 'Order expiry must be in the future' 
      });
    }

    // Validate signature format
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return res.status(400).json({ 
        error: 'Invalid signature format' 
      });
    }

    // Validate arrays
    if (!Array.isArray(giveItems) || !Array.isArray(takeItems)) {
      return res.status(400).json({ 
        error: 'giveItems and takeItems must be arrays' 
      });
    }

    if (giveItems.length === 0 || takeItems.length === 0) {
      return res.status(400).json({ 
        error: 'Both giveItems and takeItems must contain at least one item' 
      });
    }

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('trades_orders')
      .select('id')
      .eq('order_hash', orderHash)
      .single();

    if (existingOrder) {
      return res.status(409).json({ 
        error: 'Order with this hash already exists' 
      });
    }

    // Insert order into database
    const { data: order, error: insertError } = await supabase
      .from('trades_orders')
      .insert([{
        order_hash: orderHash,
        maker_address: makerAddress.toLowerCase(),
        taker_address: takerAddress ? takerAddress.toLowerCase() : null,
        give_items: giveItems,
        take_items: takeItems,
        expiry: orderExpiry.toISOString(),
        nonce: nonce || 0,
        fee_bps: feeBps || 0,
        signature,
        status: 'open'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting order:', insertError);
      return res.status(500).json({ 
        error: 'Failed to create order',
        details: insertError.message 
      });
    }

    // Run risk scoring asynchronously
    riskScorer.scoreOrder(order.id, order)
      .catch(error => console.error('Risk scoring failed:', error));

    res.status(201).json({ 
      success: true, 
      order: {
        id: order.id,
        orderHash: order.order_hash,
        status: order.status,
        createdAt: order.created_at
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * GET /api/trades/orders
 * Get orders with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      maker,
      taker,
      status = 'open',
      collection,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('trades_order_book')
      .select('*');

    // Apply filters
    if (maker) {
      query = query.eq('maker_address', maker.toLowerCase());
    }

    if (taker) {
      query = query.eq('taker_address', taker.toLowerCase());
    }

    if (status && status !== 'all') {
      if (status === 'open') {
        query = query.eq('computed_status', 'open');
      } else {
        query = query.eq('status', status);
      }
    }

    if (collection) {
      // Filter by collection address in give_items or take_items
      query = query.or(
        `give_items->0->contractAddr.eq.${collection.toLowerCase()},` +
        `take_items->0->contractAddr.eq.${collection.toLowerCase()}`
      );
    }

    // Apply sorting
    const validSortFields = ['created_at', 'expiry', 'maker_reputation'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 items
    const offsetNum = parseInt(offset) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch orders',
        details: error.message 
      });
    }

    res.json({
      success: true,
      orders: orders || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * GET /api/trades/orders/:orderId
 * Get specific order details
 */
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: 'Invalid order ID format' 
      });
    }

    const { data: order, error } = await supabase
      .from('trades_order_book')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * POST /api/trades/orders/:orderId/cancel
 * Cancel an order (maker only)
 */
router.post('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { makerAddress, cancelTxHash } = req.body;

    if (!makerAddress) {
      return res.status(400).json({ 
        error: 'makerAddress is required' 
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: 'Invalid order ID format' 
      });
    }

    // Get order and verify maker
    const { data: order, error: fetchError } = await supabase
      .from('trades_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    if (order.maker_address.toLowerCase() !== makerAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Only the order maker can cancel this order' 
      });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }

    // Update order status to cancelled
    const { data: updatedOrder, error: updateError } = await supabase
      .from('trades_orders')
      .update({ 
        status: 'cancelled',
        cancel_tx_hash: cancelTxHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return res.status(500).json({ 
        error: 'Failed to cancel order',
        details: updateError.message 
      });
    }

    res.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        cancelTxHash: updatedOrder.cancel_tx_hash,
        updatedAt: updatedOrder.updated_at
      }
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * POST /api/trades/orders/:orderId/fill
 * Mark order as filled (webhook from blockchain monitoring)
 */
router.post('/:orderId/fill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      fillerAddress, 
      txHash, 
      blockNumber, 
      protocolFee, 
      gasUsed, 
      gasPrice 
    } = req.body;

    if (!fillerAddress || !txHash) {
      return res.status(400).json({ 
        error: 'fillerAddress and txHash are required' 
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: 'Invalid order ID format' 
      });
    }

    // Get order
    const { data: order, error: fetchError } = await supabase
      .from('trades_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ 
        error: `Cannot fill order with status: ${order.status}` 
      });
    }

    // Start transaction
    const { data: updatedOrder, error: updateError } = await supabase
      .from('trades_orders')
      .update({ 
        status: 'filled',
        fill_tx_hash: txHash,
        filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update order',
        details: updateError.message 
      });
    }

    // Insert fill record
    const { data: fill, error: fillError } = await supabase
      .from('trades_fills')
      .insert([{
        order_id: orderId,
        order_hash: order.order_hash,
        filler_address: fillerAddress.toLowerCase(),
        tx_hash: txHash,
        block_number: blockNumber,
        protocol_fee: protocolFee,
        gas_used: gasUsed,
        gas_price: gasPrice
      }])
      .select()
      .single();

    if (fillError) {
      console.error('Error inserting fill:', fillError);
      // Don't fail the request if fill record creation fails
    }

    // Update trader profiles asynchronously
    updateTraderProfiles(order.maker_address, fillerAddress)
      .catch(error => console.error('Profile update failed:', error));

    res.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        fillTxHash: updatedOrder.fill_tx_hash,
        filledAt: updatedOrder.filled_at
      },
      fill: fill ? {
        id: fill.id,
        txHash: fill.tx_hash,
        blockNumber: fill.block_number
      } : null
    });

  } catch (error) {
    console.error('Error filling order:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Helper function to update trader profiles after a successful trade
 */
async function updateTraderProfiles(makerAddress, takerAddress) {
  try {
    const addresses = [makerAddress.toLowerCase(), takerAddress.toLowerCase()];
    
    for (const address of addresses) {
      // Get or create profile
      const { data: profile, error: fetchError } = await supabase
        .from('trades_profiles')
        .select('*')
        .eq('wallet_address', address)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`Error fetching profile for ${address}:`, fetchError);
        continue;
      }

      if (!profile) {
        // Create new profile
        await supabase
          .from('trades_profiles')
          .insert([{
            wallet_address: address,
            total_trades: 1,
            successful_trades: 1,
            reputation_score: 10, // Starting reputation
            last_trade_at: new Date().toISOString()
          }]);
      } else {
        // Update existing profile
        const newReputationScore = Math.min(100, profile.reputation_score + 2); // Cap at 100
        
        await supabase
          .from('trades_profiles')
          .update({
            total_trades: profile.total_trades + 1,
            successful_trades: profile.successful_trades + 1,
            reputation_score: newReputationScore,
            last_trade_at: new Date().toISOString()
          })
          .eq('wallet_address', address);
      }
    }
  } catch (error) {
    console.error('Error updating trader profiles:', error);
  }
}

module.exports = router;