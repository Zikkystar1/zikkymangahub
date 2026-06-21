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
// 📥 DOWNLOAD CHAPTER - DUAL MODE
// ============================================
app.get('/api/download/chapter/:chapterId', async (req, res) => {
    const { chapterId } = req.params;
    const quality = req.query.quality || 'data';
    const mode = req.query.mode || 'normal';
    const mangaTitle = req.query.title || 'manga';
    const chapterNumber = req.query.chapter || '1';
    
    try {
        console.log(`📥 Downloading chapter ${chapterId}`);
        console.log(`📦 Mode: ${mode}, Quality: ${quality}`);
        
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
        
// ============================================
// MODE 1: NORMAL - Download images one by one
// ============================================
if (mode === 'normal') {
    console.log(`📄 Normal mode: Sending ${pageFilenames.length} images individually`);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Downloading ${mangaTitle} - Chapter ${chapterNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0a0a12; 
                    color: #f0f0f0; 
                    padding: 20px; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center;
                    min-height: 100vh;
                }
                .container {
                    max-width: 900px;
                    width: 100%;
                    background: rgba(18,18,28,0.95);
                    border-radius: 20px;
                    padding: 30px;
                    border: 2px solid #8b17b6;
                    box-shadow: 0 0 40px rgba(139,23,182,0.2);
                }
                h1 { 
                    color: #8b17b6; 
                    text-align: center;
                    margin-bottom: 5px;
                    font-size: 1.8rem;
                }
                .subtitle {
                    text-align: center;
                    color: #a0a0a0;
                    margin-bottom: 25px;
                    font-size: 0.95rem;
                }
                .subtitle span { color: #00ffea; }
                .info-box {
                    text-align:center; 
                    margin:20px 0; 
                    padding:15px; 
                    background:rgba(0,255,136,0.05); 
                    border-radius:10px; 
                    border:1px solid rgba(0,255,136,0.15);
                }
                .info-box p { color: #00ff88; margin-bottom:5px; }
                .info-box small { color: var(--text-muted); font-size:0.85rem; }
                .btn {
                    display: inline-block;
                    padding: 12px 35px;
                    background: linear-gradient(135deg, #8b17b6, #ff2a6d);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(139,23,182,0.4);
                }
                .btn-download-all {
                    background: linear-gradient(135deg, #00ffea, #8b17b6);
                }
                .btn-download-all:hover {
                    box-shadow: 0 5px 20px rgba(0,255,234,0.3);
                }
                .btn-download-all:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                .download-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 8px;
                    margin: 15px 0;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 5px;
                }
                .download-grid::-webkit-scrollbar { width: 4px; }
                .download-grid::-webkit-scrollbar-thumb { background: #8b17b6; border-radius: 2px; }
                .download-item {
                    background: rgba(139,23,182,0.08);
                    border: 1px solid rgba(139,23,182,0.2);
                    border-radius: 8px;
                    padding: 10px 8px;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                .download-item:hover {
                    background: rgba(139,23,182,0.2);
                    transform: translateY(-2px);
                }
                .download-item.downloaded {
                    border-color: #00ff88;
                    background: rgba(0,255,136,0.1);
                }
                .download-item a {
                    color: #00ffea;
                    text-decoration: none;
                    font-size: 0.8rem;
                    display: block;
                }
                .download-item a:hover { color: #fff; }
                .download-item .page-number {
                    color: #666;
                    font-size: 0.6rem;
                    display: block;
                    margin-top: 2px;
                }
                .stats {
                    text-align: center;
                    color: #a0a0a0;
                    font-size: 0.9rem;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .footer-actions {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }
                .back-btn {
                    display: inline-block;
                    padding: 8px 25px;
                    background: transparent;
                    border: 2px solid #8b17b6;
                    color: #f0f0f0;
                    border-radius: 20px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }
                .back-btn:hover {
                    background: #8b17b6;
                    color: white;
                }
                .footer {
                    text-align: center;
                    color: #444;
                    font-size: 0.7rem;
                    margin-top: 20px;
                }
                .progress-text {
                    text-align: center;
                    margin-top: 10px;
                    color: #a0a0a0;
                    font-size: 0.9rem;
                }
                @media (max-width: 600px) {
                    .container { padding: 15px; }
                    h1 { font-size: 1.3rem; }
                    .download-grid { grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); }
                    .download-item { padding: 6px 4px; }
                    .download-item a { font-size: 0.65rem; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📥 ${mangaTitle}</h1>
                <p class="subtitle">Chapter <span>${chapterNumber}</span> • ${pageFilenames.length} pages • <span>Normal Mode</span></p>
                
                <div class="info-box">
                    <p>✅ Click any page below to download it individually</p>
                    <small>Or use "Download All" to get everything at once</small>
                </div>
                
                <div style="text-align:center; margin:15px 0;">
                    <button class="btn btn-download-all" id="downloadAllBtn" onclick="downloadAll()">
                        ⬇️ Download All Pages
                    </button>
                    <div class="progress-text" id="progressText" style="margin-top:10px;"></div>
                </div>
                
                <div class="download-grid" id="downloadGrid">
                    ${pageFilenames.map((filename, index) => {
                        const ext = filename.split('.').pop() || 'jpg';
                        const imageUrl = `${baseUrl}/${quality}/${chapterHash}/${filename}`;
                        return `
                            <div class="download-item" id="item-${index}">
                                <a href="${imageUrl}" download="page_${String(index + 1).padStart(3, '0')}.${ext}" class="page-link" data-index="${index}" target="_blank">
                                    Page ${index + 1}
                                </a>
                                <span class="page-number">${ext.toUpperCase()}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="stats">
                    📊 Total: ${pageFilenames.length} pages
                </div>
                
                <div class="footer-actions">
                    <a href="/" class="back-btn">← Back to Home</a>
                    <button class="back-btn" onclick="window.location.reload()" style="border-color:#00ffea; color:#00ffea;">
                        🔄 Refresh
                    </button>
                </div>
                
                <div class="footer">
                    ZIKKY MANGA HUB • Downloaded at ${new Date().toLocaleString()}
                </div>
            </div>
            
            <script>
                let downloadIndex = 0;
                let totalPages = ${pageFilenames.length};
                let isDownloading = false;
                
                const links = document.querySelectorAll('.page-link');
                const downloadBtn = document.getElementById('downloadAllBtn');
                const progressText = document.getElementById('progressText');
                
                function downloadAll() {
                    if (isDownloading) {
                        alert('⚠️ Download already in progress!');
                        return;
                    }
                    
                    if (totalPages === 0) {
                        alert('No pages to download!');
                        return;
                    }
                    
                    isDownloading = true;
                    downloadIndex = 0;
                    
                    downloadBtn.textContent = '⏳ Starting...';
                    downloadBtn.disabled = true;
                    progressText.textContent = 'Preparing downloads...';
                    
                    // Start downloading after a short delay
                    setTimeout(downloadNext, 500);
                }
                
                function downloadNext() {
                    if (downloadIndex >= links.length) {
                        isDownloading = false;
                        downloadBtn.textContent = '✅ All Downloaded!';
                        downloadBtn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
                        downloadBtn.disabled = false;
                        progressText.textContent = '🎉 All ' + totalPages + ' pages downloaded successfully!';
                        return;
                    }
                    
                    const link = links[downloadIndex];
                    
                    // ✅ Open each image in a new tab for download
                    // This prevents the current page from being replaced
                    window.open(link.href, '_blank');
                    
                    // Mark as downloaded visually
                    const item = document.getElementById('item-' + downloadIndex);
                    if (item) {
                        item.style.borderColor = '#00ff88';
                        item.style.background = 'rgba(0,255,136,0.1)';
                    }
                    
                    // Update progress
                    const percent = ((downloadIndex + 1) / totalPages * 100).toFixed(0);
                    downloadBtn.textContent = \`⏳ Downloading \${downloadIndex + 1}/\${totalPages} (\${percent}%)\`;
                    progressText.textContent = \`⬇️ Downloading page \${downloadIndex + 1} of \${totalPages}\`;
                    
                    downloadIndex++;
                    
                    // Download next with a slight delay (800ms between downloads)
                    setTimeout(downloadNext, 800);
                }
                
                // Individual download tracking
                document.querySelectorAll('.page-link').forEach((link, index) => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        // Open in new tab
                        window.open(this.href, '_blank');
                        // Mark as clicked
                        const item = document.getElementById('item-' + index);
                        if (item) {
                            item.style.borderColor = '#ffd700';
                            item.style.background = 'rgba(255,215,0,0.1)';
                        }
                    });
                });
                
                // Keyboard shortcut: Press 'A' to download all
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'a' || e.key === 'A') {
                        if (!e.ctrlKey && !e.metaKey) {
                            downloadAll();
                        }
                    }
                });
            </script>
        </body>
        </html>
    `);
    return;
}

        // ============================================
        // MODE 2: COMPRESSED - Download as ZIP
        // ============================================
        if (mode === 'compressed') {
            console.log(`📦 Compressed mode: Creating ZIP with ${pageFilenames.length} pages`);
            
            const zipFilename = `${safeTitle}_Chapter_${chapterNumber}.zip`;
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
            
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
        }
        
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
