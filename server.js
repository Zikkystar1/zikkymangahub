const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
const archiver = require('archiver'); // ✅ Added for ZIP creation

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================
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

// ============================================
// PING ENDPOINT (for self-ping)
// ============================================
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'alive', 
        timestamp: new Date().toISOString() 
    });
});

// ============================================
// MANGA PROXY
// ============================================
app.get('/api/proxy/manga/*', async (req, res) => {
    try {
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

// ============================================
// IMAGE PROXY
// ============================================
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
        
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
        
    } catch (error) {
        console.error('❌ Image proxy error:', error.message);
        res.status(500).send('Image proxy error');
    }
});

// ============================================
// 📥 DOWNLOAD CHAPTER - ZIP ONLY (BEAUTIFUL)
// ============================================
app.get('/api/download/chapter/:chapterId', async (req, res) => {
    const { chapterId } = req.params;
    const quality = req.query.quality || 'data';
    const mangaTitle = req.query.title || 'manga';
    const chapterNumber = req.query.chapter || '1';
    
    try {
        console.log(`📥 Downloading chapter ${chapterId} as ZIP`);
        console.log(`📦 Quality: ${quality}`);
        
        // Fetch chapter data from MangaDex
        const response = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, {
            headers: {
                'User-Agent': 'ZIKKY-MANGA-HUB/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch chapter: ${response.status}`);
        }
        
        const data = await response.json();
        const baseUrl = data.baseUrl;
        const chapterHash = data.chapter.hash;
        
        // Get page filenames based on quality
        let pageFilenames = [];
        if (quality === 'dataSaver') {
            pageFilenames = data.chapter.dataSaver || [];
        } else {
            pageFilenames = data.chapter.data || [];
        }
        
        if (pageFilenames.length === 0) {
            throw new Error('No pages found in this chapter');
        }
        
        const safeTitle = mangaTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const zipFilename = `${safeTitle}_Chapter_${chapterNumber}.zip`;
        
        // Set response headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        
        // Create archiver instance
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        archive.on('error', (err) => {
            console.error('❌ Archiver error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create ZIP' });
            }
        });
        
        archive.on('progress', (progress) => {
            console.log(`📦 ZIP progress: ${progress.entries.processed}/${pageFilenames.length} pages`);
        });
        
        archive.pipe(res);
        
        // Download and add each page to the archive
        let successCount = 0;
        
        for (let i = 0; i < pageFilenames.length; i++) {
            const filename = pageFilenames[i];
            const pageUrl = `${baseUrl}/${quality}/${chapterHash}/${filename}`;
            
            try {
                const imageResponse = await fetch(pageUrl, {
                    headers: {
                        'User-Agent': 'ZIKKY-MANGA-HUB/1.0'
                    }
                });
                
                if (!imageResponse.ok) {
                    console.warn(`⚠️ Failed to fetch page ${i + 1}: ${imageResponse.status}`);
                    continue;
                }
                
                const buffer = await imageResponse.arrayBuffer();
                const ext = filename.split('.').pop() || 'jpg';
                const pageName = `page_${String(i + 1).padStart(3, '0')}.${ext}`;
                
                archive.append(Buffer.from(buffer), { name: pageName });
                successCount++;
                
                if ((i + 1) % 10 === 0) {
                    console.log(`📄 Downloaded ${i + 1}/${pageFilenames.length} pages`);
                }
                
            } catch (error) {
                console.warn(`⚠️ Error downloading page ${i + 1}:`, error.message);
            }
        }
        
        if (successCount === 0) {
            throw new Error('No pages could be downloaded');
        }
        
        await archive.finalize();
        
        console.log(`✅ ZIP created: ${zipFilename} (${archive.pointer()} bytes)`);
        console.log(`📊 Successfully packed ${successCount}/${pageFilenames.length} pages`);
        
    } catch (error) {
        console.error('❌ Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Download failed', 
                message: error.message 
            });
        }
    }
});

// ============================================
// SPA SUPPORT - Serve index.html for all routes
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// SELF-PING FOR RENDER (14 minutes)
// ============================================
if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🔄 Auto-ping enabled for Render at ${process.env.RENDER_EXTERNAL_URL}`);
    
    setTimeout(() => {
        axios.get(process.env.RENDER_EXTERNAL_URL + '/ping')
            .then(() => console.log('✅ Initial ping successful'))
            .catch(err => console.log('⚠️ Initial ping failed:', err.message));
    }, 60000);
    
    setInterval(() => {
        axios.get(process.env.RENDER_EXTERNAL_URL + '/ping', { timeout: 10000 })
            .then(() => console.log(`✅ Ping successful at ${new Date().toISOString()}`))
            .catch(err => console.log(`⚠️ Ping failed at ${new Date().toISOString()}:`, err.message));
    }, 14 * 60 * 1000);
} else {
    console.log('⚠️ RENDER_EXTERNAL_URL not set - auto-ping disabled');
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 ZIKKY MANGA HUB running on port ${PORT}`);
    console.log(`📚 Server started at ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Archiver: ${archiver ? '✅ Available' : '❌ Not available'}`);
});
