// Vercel Serverless Function: /api/twitter/user.js

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🐦 Twitter user info request');
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        
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
}