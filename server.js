const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');

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
            connectSrc: ["'self'", "https://api.mangadex.org", "https://api.jikan.moe", "https://uploads.mangadex.org"]
        }
    }
}));

// Enable CORS
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
    res.status(200).json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'ZIKKY MANGA HUB is running',
        timestamp: new Date().toISOString()
    });
});

// API Proxy for MangaDex - using axios instead of fetch
app.get('/api/proxy/manga/*', async (req, res) => {
    try {
        const apiUrl = `https://api.mangadex.org${req.url.replace('/api/proxy/manga', '')}`;
        
        console.log(`Proxying request to: ${apiUrl}`);
        
        const response = await axios({
            method: 'GET',
            url: apiUrl,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'ZIKKY-MANGA-HUB/1.0'
            },
            timeout: 10000 // 10 second timeout
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            res.status(504).json({ 
                error: 'Gateway timeout', 
                message: 'The request to MangaDex timed out',
                timestamp: new Date().toISOString()
            });
        } else if (error.response) {
            // The request was made and the server responded with a status code
            res.status(error.response.status).json({ 
                error: 'API error', 
                message: error.response.statusText,
                status: error.response.status,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({ 
                error: 'Proxy error', 
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// API Proxy for Jikan (optional, can be used directly from frontend)
app.get('/api/proxy/jikan/*', async (req, res) => {
    try {
        const apiUrl = `https://api.jikan.moe/v4${req.url.replace('/api/proxy/jikan', '')}`;
        
        console.log(`Proxying Jikan request to: ${apiUrl}`);
        
        const response = await axios({
            method: 'GET',
            url: apiUrl,
            timeout: 10000,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Jikan proxy error:', error.message);
        res.status(500).json({ 
            error: 'Jikan proxy error', 
            message: error.message 
        });
    }
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Self-ping for Render (every 14 minutes to prevent sleeping)
if (process.env.RENDER_EXTERNAL_URL) {
    const externalUrl = process.env.RENDER_EXTERNAL_URL;
    console.log(`🔄 Auto-ping enabled for Render at ${externalUrl}`);
    
    // Function to ping the server
    const pingServer = () => {
        axios.get(`${externalUrl}/ping`, { 
            timeout: 10000,
            headers: { 'User-Agent': 'ZIKKY-MANGA-HUB-SELF-PING/1.0' }
        })
        .then(response => {
            console.log(`✅ Ping successful at ${new Date().toISOString()} - Status: ${response.status}`);
        })
        .catch(err => {
            console.log(`⚠️ Ping failed at ${new Date().toISOString()}:`, err.message);
        });
    };
    
    // Initial ping after server starts (after 2 minutes)
    setTimeout(pingServer, 120000);
    
    // Set up interval for self-ping (every 14 minutes)
    setInterval(pingServer, 14 * 60 * 1000);
    
    // Also ping on server startup
    console.log(`🌐 Server URL: ${externalUrl}`);
    console.log(`⏰ Self-ping scheduled every 14 minutes`);
    
} else {
    console.log('⚠️ RENDER_EXTERNAL_URL not set - auto-ping disabled');
    console.log('📝 For local development, server is running without auto-ping');
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).send('Something broke!');
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ZIKKY MANGA HUB running on port ${PORT}`);
    console.log(`📚 Server started at ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
