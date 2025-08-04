// Vercel Serverless Function: /api/twitter/token.js

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐦 Twitter token exchange request');
        
        const { grant_type, client_id, code, redirect_uri, code_verifier } = req.body;
        
        if (!code || !code_verifier) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // Get credentials from environment variables
        const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
        const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
        const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;
        
        if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
            return res.status(500).json({ error: 'Twitter credentials not configured' });
        }
        
        // Prepare token request
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: TWITTER_CLIENT_ID,
            code: code,
            redirect_uri: TWITTER_REDIRECT_URI,
            code_verifier: code_verifier
        });
        
        // Create basic auth header
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
}