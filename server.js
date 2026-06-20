const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios'); // Added for self-ping

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "*"],
            connectSrc: ["'self'", "https://api.mangadex.org", "https://uploads.mangadex.org"]
        }
    }
}));

// Enable CORS for MangaDex API
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Compression
app.use(compression());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Ping endpoint for self-ping
app.get('/ping', (req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// API Proxy with enhanced error handling
app.get('/api/proxy/manga/*', async (req, res) => {
    try {
        // ✅ FIXED: Proper URL construction
        const apiPath = req.url.replace('/api/proxy/manga', '');
        const apiUrl = `https://api.mangadex.org${apiPath}`;
        
        console.log('🔄 Proxying request to:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'ZIKKY-MANGA-HUB/1.0'
            }
        });
        
        if (!response.ok) {
            console.error('❌ API error:', response.status);
            return res.status(response.status).json({ 
                error: 'API error', 
                status: response.status 
            });
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('❌ Proxy error:', error.message);
        res.status(500).json({ 
            error: 'API proxy error', 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ ADD THIS: Direct image proxy for MangaDex images
app.get('/api/proxy/image/*', async (req, res) => {
    try {
        const imagePath = req.url.replace('/api/proxy/image/', '');
        const imageUrl = `https://uploads.mangadex.org/${imagePath}`;
        
        console.log('🔄 Proxying image:', imageUrl);
        
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'ZIKKY-MANGA-HUB/1.0'
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).send('Image not found');
        }
        
        // Get the content type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        
        // Stream the image data
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
        
    } catch (error) {
        console.error('❌ Image proxy error:', error.message);
        res.status(500).send('Image proxy error');
    }
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Self-ping for Render (14 minutes)
if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🔄 Auto-ping enabled for Render at ${process.env.RENDER_EXTERNAL_URL}`);
    
    // Initial ping after server starts
    setTimeout(() => {
        axios.get(process.env.RENDER_EXTERNAL_URL + '/ping')
            .then(() => console.log('✅ Initial ping successful'))
            .catch(err => console.log('⚠️ Initial ping failed:', err.message));
    }, 60000); // Ping after 1 minute
    
    // Set up interval for self-ping
    setInterval(() => {
        axios.get(process.env.RENDER_EXTERNAL_URL + '/ping', { timeout: 10000 })
            .then(() => console.log(`✅ Ping successful at ${new Date().toISOString()}`))
            .catch(err => console.log(`⚠️ Ping failed at ${new Date().toISOString()}:`, err.message));
    }, 14 * 60 * 1000); // 14 minutes
} else {
    console.log('⚠️ RENDER_EXTERNAL_URL not set - auto-ping disabled');
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ZIKKY MANGA HUB running on port ${PORT}`);
    console.log(`📚 Server started at ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});