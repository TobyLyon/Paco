const express = require('express');
const router = express.Router();
const RiskScorer = require('../services/riskScorer');

const riskScorer = new RiskScorer();

/**
 * GET /api/trades/risk/:orderId
 * Get risk assessment for a specific order
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

    const riskAssessment = await riskScorer.getRiskAssessment(orderId);

    res.json({
      success: true,
      riskAssessment
    });

  } catch (error) {
    console.error('Error getting risk assessment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * POST /api/trades/risk/preview
 * Preview risk assessment for order data without storing
 */
router.post('/preview', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (!orderData.giveItems || !orderData.takeItems || !orderData.makerAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: giveItems, takeItems, makerAddress'
      });
    }

    // Create temporary order structure for risk scoring
    const tempOrder = {
      give_items: orderData.giveItems,
      take_items: orderData.takeItems,
      maker_address: orderData.makerAddress,
      expiry: orderData.expiry || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Score the order without storing flags
    const score = await riskScorer.scoreOrder(null, tempOrder);

    res.json({
      success: true,
      riskScore: score,
      riskLevel: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      message: score >= 70 ? 'High risk detected' : 
               score >= 40 ? 'Medium risk detected' : 
               'Low risk detected'
    });

  } catch (error) {
    console.error('Error previewing risk assessment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;