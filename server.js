const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

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
            connectSrc: ["'self'", "https://api.consumet.org", "http://localhost:8080"]
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

// Proxy for Consumet API - FIXED VERSION
app.use('/api/consumet', createProxyMiddleware({
    target: 'https://api.consumet.org',
    changeOrigin: true,
    pathRewrite: {
        '^/api/consumet': '/manga/mangahere'
    },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('User-Agent', 'ZIKKY-MANGA-HUB/1.0');
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy error occurred', details: err.message });
    }
}));

// Proxy for images
app.use('/api/proxy-image', createProxyMiddleware({
    target: 'https://api.consumet.org',
    changeOrigin: true,
    pathRewrite: {
        '^/api/proxy-image': '/manga/mangahere/proxy'
    },
    onProxyReq: (proxyReq, req, res) => {
        if (req.query.url) {
            // Fix: Don't encode again if already encoded
            const url = req.query.url;
            proxyReq.path = `/manga/mangahere/proxy?url=${url}`;
        }
    },
    onError: (err, req, res) => {
        console.error('Image Proxy Error:', err);
        res.status(500).send('Image proxy error');
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', message: 'ZIKKY MANGA HUB API is running' });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ZIKKY MANGA HUB running on port ${PORT}`);
    console.log(`📚 Server started at ${new Date().toISOString()}`);
    console.log(`🔄 Using Consumet API proxy`);
});