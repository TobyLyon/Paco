#!/usr/bin/env node

// ===== DYNAMIC DEVELOPMENT SERVER =====
// Serves assets directly from source - no build step needed!

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; // Standard development port

console.log('🚀 Starting dynamic development server...');

// Add JSON body parsing middleware
app.use(express.json());

// API ROUTES MUST COME FIRST - before static file serving
// Token exchange endpoint
app.post('/api/twitter/token', async (req, res) => {
    try {
        console.log('🐦 Twitter token exchange request');
        
        const { grant_type, client_id, code, redirect_uri, code_verifier } = req.body;
        
        if (!code || !code_verifier) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
        const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
        
        if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
            return res.status(500).json({ error: 'Twitter credentials not configured' });
        }
        
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: TWITTER_CLIENT_ID,
            code: code,
            redirect_uri: redirect_uri,
            code_verifier: code_verifier
        });
        
        const credentials = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
        
        console.log('🔄 Exchanging code for token with Twitter...');
        
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Twitter token exchange failed:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('✅ Twitter token exchange successful');
        res.json(data);
        
    } catch (error) {
        console.error('❌ Token exchange error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User info endpoint  
app.get('/api/twitter/user', async (req, res) => {
    try {
        console.log('🐦 Twitter user info request');
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const accessToken = authHeader.substring(7);
        
        console.log('🔄 Fetching user info from Twitter...');
        
        const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Twitter user fetch failed:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('✅ Twitter user info fetched successfully');
        res.json(data);
        
    } catch (error) {
        console.error('❌ User info fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint
app.get('/api/twitter/debug', (req, res) => {
    const config = {
        clientId: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT SET',
        clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
        redirectUri: 'http://localhost:3000/auth/callback',
        port: req.get('host'),
        envLoaded: {
            TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'FOUND' : 'NOT FOUND',
            TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'FOUND' : 'NOT FOUND'
        }
    };
    
    console.log('🐦 Twitter debug info requested:', config);
    res.json(config);
});

// Serve HTML files with environment variable injection
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace Twitter Client ID placeholder
        const twitterClientId = process.env.TWITTER_CLIENT_ID || '';
        if (twitterClientId) {
            content = content.replace('__TWITTER_CLIENT_ID__', twitterClientId);
            console.log(`🔧 Injected Twitter Client ID into index.html`);
        } else {
            console.warn(`⚠️  No Twitter Client ID available for index.html`);
        }
        
        res.send(content);
    } else {
        res.status(404).send('File not found');
    }
});

app.get('/*.html', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace Twitter Client ID placeholder
        const twitterClientId = process.env.TWITTER_CLIENT_ID || '';
        if (twitterClientId) {
            content = content.replace('__TWITTER_CLIENT_ID__', twitterClientId);
            console.log(`🔧 Injected Twitter Client ID into ${req.path}`);
        } else {
            console.warn(`⚠️  No Twitter Client ID available for ${req.path}`);
        }
        
        res.send(content);
    } else {
        res.status(404).send('File not found');
    }
});

// Serve static files from root directory (except HTML)
app.use(express.static('.', {
    extensions: ['js', 'css', 'png', 'jpg', 'gif', 'ico', 'svg', 'json', 'txt'],
    index: false
}));

// Explicitly serve auth directory with logging
app.use('/auth', (req, res, next) => {
    console.log('🔐 AUTH REQUEST:', req.method, req.url, 'Query:', req.query);
    if (req.url.includes('callback')) {
        console.log('📞 TWITTER CALLBACK HIT!', 'Code:', req.query.code ? 'PRESENT' : 'MISSING', 'State:', req.query.state ? 'PRESENT' : 'MISSING');
    }
    next();
});
app.use('/auth', express.static('./auth'));

// DYNAMIC ASSET SERVING - directly from source!
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Fallback for any missing assets - serve from old location if needed
app.use('/ASSETS', (req, res, next) => {
    console.log(`⚠️  Legacy ASSETS path accessed: ${req.path}`);
    console.log('💡 Consider updating to use /assets path instead');
    
    // Try to serve from new assets location
    const newPath = req.path.replace('/ASSETS', '/assets');
    const filePath = path.join(__dirname, 'assets', req.path.substring(1));
    
    if (fs.existsSync(filePath)) {
        console.log(`🔄 Redirecting ${req.path} -> ${newPath}`);
        res.sendFile(filePath);
    } else {
        next();
    }
});

// CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== TWITTER OAUTH ENDPOINTS =====

// Debug environment loading
console.log('🔍 Environment check:');
console.log('   TWITTER_CLIENT_ID:', process.env.TWITTER_CLIENT_ID ? 'FOUND' : 'NOT FOUND');
console.log('   TWITTER_CLIENT_SECRET:', process.env.TWITTER_CLIENT_SECRET ? 'FOUND' : 'NOT FOUND');

// Twitter OAuth configuration - will be updated with actual port when server starts
let TWITTER_CONFIG = {
    clientId: process.env.TWITTER_CLIENT_ID || 'YOUR_TWITTER_CLIENT_ID',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || 'YOUR_TWITTER_CLIENT_SECRET',
    redirectUri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:3000/auth/callback', // Default to 3000
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userUrl: 'https://api.twitter.com/2/users/me'
};

console.log('🐦 Twitter config loaded:', {
    clientId: TWITTER_CONFIG.clientId !== 'YOUR_TWITTER_CLIENT_ID' ? 'SET' : 'NOT SET',
    clientSecret: TWITTER_CONFIG.clientSecret !== 'YOUR_TWITTER_CLIENT_SECRET' ? 'SET' : 'NOT SET',
    redirectUri: TWITTER_CONFIG.redirectUri
});

// Exchange authorization code for access token
app.post('/api/twitter/token', async (req, res) => {
    try {
        console.log('🐦 Twitter token exchange request');
        
        const { grant_type, client_id, code, redirect_uri, code_verifier } = req.body;
        
        if (!code || !code_verifier) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // Prepare token request
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: TWITTER_CONFIG.clientId,
            code: code,
            redirect_uri: TWITTER_CONFIG.redirectUri,
            code_verifier: code_verifier
        });
        
        // Create basic auth header
        const credentials = Buffer.from(`${TWITTER_CONFIG.clientId}:${TWITTER_CONFIG.clientSecret}`).toString('base64');
        
        console.log('🔄 Exchanging code for token with Twitter...');
        
        const response = await fetch(TWITTER_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Twitter token exchange failed:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('✅ Twitter token exchange successful');
        res.json(data);
        
    } catch (error) {
        console.error('❌ Token exchange error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Twitter user information
app.get('/api/twitter/user', async (req, res) => {
    try {
        console.log('🐦 Twitter user info request');
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const accessToken = authHeader.substring(7);
        
        console.log('🔄 Fetching user info from Twitter...');
        
        const response = await fetch(`${TWITTER_CONFIG.userUrl}?user.fields=profile_image_url,verified`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Twitter user fetch failed:', data);
            return res.status(response.status).json(data);
        }
        
        console.log('✅ Twitter user info fetched successfully');
        res.json(data);
        
    } catch (error) {
        console.error('❌ User fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// (API endpoints moved to top of file)

// Debug endpoint to check Twitter configuration  
app.get('/api/twitter/debug-old', (req, res) => {
    const config = {
        clientId: TWITTER_CONFIG.clientId !== 'YOUR_TWITTER_CLIENT_ID' ? 'SET' : 'NOT SET',
        clientSecret: TWITTER_CONFIG.clientSecret !== 'YOUR_TWITTER_CLIENT_SECRET' ? 'SET' : 'NOT SET',
        redirectUri: TWITTER_CONFIG.redirectUri,
        port: req.get('host'),
        envLoaded: {
            TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'FOUND' : 'NOT FOUND',
            TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'FOUND' : 'NOT FOUND'
        }
    };
    
    console.log('🐦 Twitter debug info requested:', config);
    res.json(config);
});

// Twitter OAuth callback - serve the actual callback.html file with injection
app.get('/auth/callback', (req, res) => {
    console.log('📞 TWITTER CALLBACK HIT!', 'Code:', req.query.code ? 'PRESENT' : 'MISSING', 'State:', req.query.state ? 'PRESENT' : 'MISSING');
    
    // Serve the auth/callback.html file with environment variables injected
    const callbackPath = path.join(__dirname, 'auth', 'callback.html');
    if (fs.existsSync(callbackPath)) {
        let content = fs.readFileSync(callbackPath, 'utf8');
        
        // Replace Twitter Client ID placeholder if present
        const twitterClientId = process.env.TWITTER_CLIENT_ID || '';
        if (twitterClientId) {
            content = content.replace('__TWITTER_CLIENT_ID__', twitterClientId);
        }
        
        console.log('✅ Twitter OAuth callback served from auth/callback.html');
        res.send(content);
    } else {
        console.error('❌ auth/callback.html not found');
        res.status(404).send('Callback file not found');
    }
});

// Start server with automatic port fallback
function startServer(port = PORT) {
    const server = app.listen(port, () => {
        // Update Twitter config with actual port
        if (!process.env.TWITTER_REDIRECT_URI) {
            TWITTER_CONFIG.redirectUri = `http://localhost:${port}/auth/callback`;
        }
        
        console.log(`✅ Development server running at http://localhost:${port}`);
        console.log(`📁 Assets served dynamically from: ./assets/`);
        console.log(`🎨 Add new assets to ./assets/hat/ or ./assets/item/ - no build needed!`);
        console.log(`🔄 Changes are reflected immediately!`);
        console.log(`🐦 Twitter OAuth redirect: ${TWITTER_CONFIG.redirectUri}`);
        console.log(`💡 To use a different port: PORT=3002 npm run dev`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ Server error:', err);
        }
    });
}

startServer();