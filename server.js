/**
 * 🎰 PacoRocko Backend Server Entry Point
 * 
 * This is the main server file for Render deployment
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the crash casino production integration
const PacoRockoProduction = require('./crash-casino/production-integration.js');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

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

const crashCasino = new PacoRockoProduction(app, {
    jwtSecret: process.env.JWT_SECRET || 'paco-crash-secret-key',
    corsOrigin: process.env.CORS_ORIGIN || "*",
    enableDatabase: true,
    enableSmartContracts: true
});

// Start the server
const PORT = process.env.PORT || 3001;

crashCasino.start(PORT).then(() => {
    console.log(`🚀 PacoRocko backend running on port ${PORT}`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/crash-ws`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
}).catch((error) => {
    console.error('❌ Failed to start server:', error);
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
