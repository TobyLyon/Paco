/**
 * 🎰 PacoRocko Backend Server Entry Point
 * 
 * This is the main server file for Render deployment
 * Enhanced with environment fixes for perfect local/production parity
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// 🔧 Apply Render Environment Fixes First
console.log('🎯 Applying Render environment fixes...');
const RenderEnvironmentFixer = require('./render-environment-fixes.js');
const fixer = new RenderEnvironmentFixer();

// Apply critical fixes synchronously
fixer.clearRequireCache();
fixer.fixEnvironmentVariables();

console.log('✅ Environment fixes applied, continuing startup...');

// Import the FIXED crash casino implementation with proper synchronization
const FixedPacoRockoProduction = require('./crash-casino/fixed-production-integration.js');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory for frontend
app.use(express.static('.', {
    index: 'index.html',
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'gif', 'ico']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'PacoRocko Backend',
        timestamp: new Date().toISOString()
    });
});

// Initialize crash casino backend
console.log('🎰 Initializing PacoRocko crash casino backend...');

// Start the server
const PORT = process.env.PORT || 3001;

console.log('🎰 Creating FIXED PacoRocko Production instance...');
const crashCasino = new FixedPacoRockoProduction(app, {
    corsOrigin: process.env.CORS_ORIGIN || "*"
});

console.log('🚀 Starting PacoRocko backend server...');
crashCasino.start(PORT).then(async () => {
    console.log(`✅ FIXED PacoRocko backend running on port ${PORT}`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT} (wss://paco-x57j.onrender.com in production)`);
    console.log(`🏥 Health check: http://localhost:${PORT}/crash/health`);
    console.log(`🎰 Fixed crash casino with proper synchronization!`);
    console.log('');
    console.log('🎯 Server-authoritative architecture - no more sync issues!');
    console.log('🎯 Based on working reference implementation!');
    
    // 🔧 Run comprehensive environment validation
    console.log('\n🔍 Running post-startup validation...');
    try {
        const success = await fixer.runAllFixes();
        if (success) {
            console.log('🎉 All systems validated and working!');
        } else {
            console.log('⚠️ Some issues detected, but server is running');
        }
        fixer.generateEnvironmentReport();
    } catch (validationError) {
        console.error('⚠️ Validation error (non-critical):', validationError.message);
    }
}).catch((error) => {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Error details:', error.stack);
    
    // 🔧 Generate diagnostic report on failure
    console.log('\n📋 Generating diagnostic report...');
    fixer.generateEnvironmentReport();
    
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down PacoRocko backend...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down PacoRocko backend...');
    process.exit(0);
});
