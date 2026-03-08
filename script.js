// Consumet API Configuration
const BASE_URL = "https://api.consumet.org/manga/mangahere";
const PROXY_URL = "https://api.consumet.org/manga/mangahere/proxy";

// Add required headers
const FETCH_HEADERS = {
    'Accept': 'application/json'
};

// State Management
let currentPage = 1;
let isLoading = false;
let hasNextPage = true;
let currentQuery = "";
let currentGenre = "all";
let currentType = "trending"; // trending, recent, hot, ranking
let selectedManga = null;
let selectedChapter = null;
let currentChapters = [];
let downloadedChapters = JSON.parse(localStorage.getItem('downloadedChapters')) || [];
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];

// DOM Elements
let mainContainer, detailsPage, readerPage, resultsContainer, loadingIndicator, endResults;
let searchInput, searchBtn, menuToggle, themeToggle, backToTop, refreshBtn, toastContainer;
let backFromDetails, backFromReader, prevChapterBtn, nextChapterBtn, downloadCurrentBtn;
let downloadOptionsModal, closeModalBtns, startDownloadBtn;
let trendingBtn, recentBtn, hotBtn, rankingBtn, bookmarksBtn, downloadsBtn;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    initializeApp();
});

function initializeDOMElements() {
    mainContainer = document.getElementById('mainContainer');
    detailsPage = document.getElementById('detailsPage');
    readerPage = document.getElementById('readerPage');
    resultsContainer = document.getElementById('results');
    loadingIndicator = document.getElementById('loading');
    endResults = document.getElementById('endResults');
    toastContainer = document.getElementById('toastContainer');
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    menuToggle = document.getElementById('menuToggle');
    themeToggle = document.getElementById('themeToggle');
    backToTop = document.getElementById('backToTop');
    backFromDetails = document.getElementById('backFromDetails');
    backFromReader = document.getElementById('backFromReader');
    prevChapterBtn = document.getElementById('prevChapterBtn');
    nextChapterBtn = document.getElementById('nextChapterBtn');
    downloadCurrentBtn = document.getElementById('downloadCurrentBtn');
    downloadOptionsModal = document.getElementById('downloadOptionsModal');
    closeModalBtns = document.querySelectorAll('.close-modal');
    startDownloadBtn = document.getElementById('startDownloadBtn');
    
    trendingBtn = document.querySelector('a[href="#trending"]');
    recentBtn = document.querySelector('a[href="#recent"]');
    hotBtn = document.querySelector('a[href="#hot"]');
    rankingBtn = document.querySelector('a[href="#ranking"]');
    bookmarksBtn = document.querySelector('a[href="#bookmarks"]');
    downloadsBtn = document.querySelector('a[href="#downloads"]');
    
    // Create refresh button
    createRefreshButton();
    
    if (mainContainer) mainContainer.style.display = 'block';
}

// Create Refresh Button (Bottom Left)
function createRefreshButton() {
    if (document.getElementById('refreshBtn')) return;
    
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshBtn';
    refreshBtn.className = 'refresh-button';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshBtn.title = 'Refresh Manga';
    refreshBtn.addEventListener('click', refreshManga);
    document.body.appendChild(refreshBtn);
    
    const style = document.createElement('style');
    style.textContent = `
        .refresh-button {
            position: fixed;
            bottom: 30px;
            left: 30px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-smooth);
            z-index: 1000;
            box-shadow: var(--neon-shadow);
            animation: pulse 2s infinite;
        }
        
        .refresh-button:hover {
            transform: rotate(180deg) scale(1.1);
            box-shadow: 0 5px 25px var(--primary-glow);
        }
        
        .refresh-button:active {
            transform: rotate(180deg) scale(0.95);
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @media (max-width: 768px) {
            .refresh-button {
                bottom: 20px;
                left: 20px;
                width: 45px;
                height: 45px;
                font-size: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
}

// Refresh Manga
function refreshManga() {
    currentPage = 1;
    hasNextPage = true;
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
    showToast('Refreshing...', 'info');
    loadManga();
    
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 500);
    }
}

function initializeApp() {
    loadManga();
    setupEventListeners();
    createParticles();
    
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) {
            themeToggle.querySelector('i').className = 'fas fa-sun';
        }
    }
}

function setupEventListeners() {
    if (searchBtn) {
        searchBtn.addEventListener('click', startSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startSearch();
        });
    }

    if (trendingBtn) {
        trendingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentType = "trending";
            currentQuery = "";
            resetPagination();
            loadManga();
            updateActiveNav(trendingBtn);
        });
    }
    
    if (recentBtn) {
        recentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentType = "recent";
            currentQuery = "";
            resetPagination();
            loadManga();
            updateActiveNav(recentBtn);
        });
    }
    
    if (hotBtn) {
        hotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentType = "hot";
            currentQuery = "";
            resetPagination();
            loadManga();
            updateActiveNav(hotBtn);
        });
    }
    
    if (rankingBtn) {
        rankingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentType = "ranking";
            currentQuery = "";
            resetPagination();
            loadManga();
            updateActiveNav(rankingBtn);
        });
    }
    
    if (bookmarksBtn) {
        bookmarksBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showBookmarks();
        });
    }
    
    if (downloadsBtn) {
        downloadsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showDownloads();
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (backFromDetails) {
        backFromDetails.addEventListener('click', () => {
            if (detailsPage) detailsPage.style.display = 'none';
            if (mainContainer) mainContainer.style.display = 'block';
            document.body.style.overflow = 'auto';
        });
    }

    if (backFromReader) {
        backFromReader.addEventListener('click', () => {
            if (readerPage) readerPage.style.display = 'none';
            if (detailsPage) detailsPage.style.display = 'block';
            document.body.style.overflow = 'auto';
        });
    }

    if (prevChapterBtn) {
        prevChapterBtn.addEventListener('click', () => navigateChapter('prev'));
    }
    
    if (nextChapterBtn) {
        nextChapterBtn.addEventListener('click', () => navigateChapter('next'));
    }
    
    if (downloadCurrentBtn) {
        downloadCurrentBtn.addEventListener('click', () => {
            if (selectedChapter && selectedManga) {
                if (readerPage) readerPage.style.display = 'none';
                showDownloadOptions(selectedChapter.index);
            }
        });
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (downloadOptionsModal) downloadOptionsModal.style.display = 'none';
        });
    });

    if (startDownloadBtn) {
        startDownloadBtn.addEventListener('click', startDownload);
    }

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function updateActiveNav(activeBtn) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

function resetPagination() {
    currentPage = 1;
    hasNextPage = true;
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
}

// ============== NAVIGATION FUNCTIONS ==============

function showBookmarks() {
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        
        if (bookmarks.length === 0) {
            resultsContainer.innerHTML = '<div class="no-items-message">No bookmarks yet. Start adding some!</div>';
            if (endResults) endResults.style.display = 'none';
            return;
        }
        
        bookmarks.forEach(bookmark => {
            displayMangaCard({
                id: bookmark.id,
                title: bookmark.title,
                image: bookmark.image || 'https://via.placeholder.com/200x280?text=No+Cover',
                headerForImage: bookmark.headerForImage
            });
        });
    }
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    updateActiveNav(bookmarksBtn);
}

function showDownloads() {
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        
        if (downloadedChapters.length === 0) {
            resultsContainer.innerHTML = '<div class="no-items-message">No downloads yet. Download some chapters!</div>';
            if (endResults) endResults.style.display = 'none';
            return;
        }
        
        const downloadsByManga = {};
        downloadedChapters.forEach(download => {
            if (!downloadsByManga[download.mangaTitle]) {
                downloadsByManga[download.mangaTitle] = [];
            }
            downloadsByManga[download.mangaTitle].push(download);
        });
        
        Object.keys(downloadsByManga).forEach(mangaTitle => {
            const mangaDiv = document.createElement('div');
            mangaDiv.className = 'downloads-section';
            mangaDiv.innerHTML = `
                <h3 class="downloads-manga-title">${mangaTitle}</h3>
                <div class="downloads-chapters">
                    ${downloadsByManga[mangaTitle].map(d => `
                        <div class="download-item" onclick="alert('Downloaded: Chapter ${d.chapterNumber} on ${new Date(d.downloadedAt).toLocaleDateString()}')">
                            <span>Chapter ${d.chapterNumber}</span>
                            <small>${new Date(d.downloadedAt).toLocaleDateString()}</small>
                        </div>
                    `).join('')}
                </div>
            `;
            resultsContainer.appendChild(mangaDiv);
        });
    }
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    updateActiveNav(downloadsBtn);
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = Math.random() * 3 + 'px';
        particle.style.height = particle.style.width;
        particle.style.animation = `float-particle ${Math.random() * 10 + 10}s linear infinite`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        particlesContainer.appendChild(particle);
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icon = themeToggle ? themeToggle.querySelector('i') : null;
    if (icon) {
        if (document.body.classList.contains('light-theme')) {
            icon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'light');
        } else {
            icon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'dark');
        }
    }
}

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// ============== LOAD MANGA FUNCTIONS ==============
async function loadManga() {
    if (isLoading || !hasNextPage) return;
    
    isLoading = true;
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        let url = `${BASE_URL}/${currentType}`;
        
        if (currentQuery) {
            url = `${BASE_URL}/search?query=${encodeURIComponent(currentQuery)}`;
            if (currentPage > 1) {
                url += `&page=${currentPage}`;
            }
        } else if (currentType === "recent" && currentPage > 1) {
            url += `?page=${currentPage}`;
        } else if (currentType === "ranking") {
            // For rankings, we need to specify a type (week, month, all)
            const rankingTypes = ['week', 'month', 'all'];
            const randomType = rankingTypes[Math.floor(Math.random() * rankingTypes.length)];
            url = `${BASE_URL}/rankings?type=${randomType}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, { 
            headers: FETCH_HEADERS,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        let mangaList = [];
        if (currentQuery) {
            mangaList = data.results || [];
            hasNextPage = data.hasNextPage || false;
            if (data.currentPage) currentPage = data.currentPage;
        } else if (currentType === "ranking") {
            mangaList = data.results || [];
            hasNextPage = false; // Rankings don't have pagination
        } else {
            mangaList = data.results || [];
            hasNextPage = data.hasNextPage || false;
            if (data.currentPage) currentPage = data.currentPage;
        }

        if (mangaList.length === 0) {
            hasNextPage = false;
            if (endResults) endResults.style.display = 'block';
            showToast('No more manga available', 'info');
            return;
        }

        displayMangaList(mangaList);
        
        if (currentQuery || currentType === "recent") {
            currentPage++;
        }
        
        if (!hasNextPage && endResults) {
            endResults.style.display = 'block';
        } else {
            if (endResults) endResults.style.display = 'none';
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Request timed out. Please try again.', 'error');
        } else {
            console.error('Error loading manga:', error);
            showToast('Failed to load manga. Please try again.', 'error');
        }
    } finally {
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function displayMangaList(mangaList) {
    if (!resultsContainer) return;
    
    mangaList.forEach(manga => {
        displayMangaCard(manga);
    });
}

function displayMangaCard(manga) {
    const card = document.createElement('div');
    card.className = 'manga-card';
    
    const imageUrl = manga.image || 'https://via.placeholder.com/200x280?text=No+Cover';
    const title = manga.title || 'Unknown Title';
    
    // Store header info for image loading if needed
    const headerForImage = manga.headerForImage || null;
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Cover'"
             data-header="${headerForImage ? JSON.stringify(headerForImage) : ''}">
        <div class="manga-info">
            <div class="manga-title">${title}</div>
            <div class="manga-stats">
                <span><i class="fas fa-book-open"></i> View</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openMangaDetails(manga.id, title, manga.image, manga.headerForImage));
    resultsContainer.appendChild(card);
}

// Open Manga Details Page
async function openMangaDetails(mangaId, title, image, headerForImage) {
    selectedManga = { 
        id: mangaId, 
        title, 
        image,
        headerForImage 
    };
    
    try {
        showToast('Loading manga details...', 'info');
        
        const response = await fetch(`${BASE_URL}/info?id=${encodeURIComponent(mangaId)}`, {
            headers: FETCH_HEADERS
        });
        
        if (!response.ok) throw new Error('Failed to fetch manga details');
        const data = await response.json();
        
        currentChapters = data.chapters || [];
        
        if (mainContainer) mainContainer.style.display = 'none';
        if (detailsPage) detailsPage.style.display = 'block';
        document.body.style.overflow = 'auto';
        
        displayMangaDetails(data);
    } catch (error) {
        console.error('Error opening manga:', error);
        showToast('Failed to load manga details: ' + error.message, 'error');
    }
}

// Display Manga Details
function displayMangaDetails(manga) {
    const wrapper = document.getElementById('mangaDetailsWrapper');
    if (!wrapper) return;
    
    const description = manga.description || 'No description available';
    const imageUrl = selectedManga.image || manga.image || 'https://via.placeholder.com/300x400?text=No+Cover';
    const genres = manga.genres || [];
    const altTitles = manga.altTitles || [];
    
    wrapper.innerHTML = `
        <div class="manga-details-grid">
            <div class="details-cover-container">
                <img src="${imageUrl}" alt="${selectedManga.title}" class="details-cover" 
                     onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
            </div>
            <div class="details-info">
                <h2 class="details-title">${selectedManga.title}</h2>
                
                ${altTitles.length > 0 ? `
                    <div class="alt-titles">
                        <small>Also known as: ${altTitles.join(', ')}</small>
                    </div>
                ` : ''}
                
                <div class="details-description">
                    ${description.replace(/\n/g, '<br>')}
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-list"></i> Chapters:</span>
                        <span class="info-value">${currentChapters.length}</span>
                    </div>
                </div>
                
                ${genres.length > 0 ? `
                    <div class="details-tags">
                        ${genres.map(genre => 
                            `<span class="tag">${genre}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                
                <div class="action-buttons">
                    <button class="action-btn primary" id="readFirstBtn">
                        <i class="fas fa-book-open"></i> Read First Chapter
                    </button>
                    <button class="action-btn secondary" id="bookmarkBtn">
                        <i class="far fa-bookmark"></i> Bookmark
                    </button>
                </div>
            </div>
        </div>
        
        <div class="chapters-section">
            <h3><i class="fas fa-list"></i> Chapters (${currentChapters.length})</h3>
            <div class="chapter-list" id="chapterList">
                ${currentChapters.length > 0 ? 
                    currentChapters.map((ch, index) => {
                        const chapterTitle = ch.title || `Chapter ${index + 1}`;
                        const releaseDate = ch.releaseDate ? new Date(ch.releaseDate).toLocaleDateString() : 'Unknown';
                        return `
                            <div class="chapter-item" data-chapter-index="${index}">
                                <div class="chapter-info">
                                    <span class="chapter-number">${chapterTitle}</span>
                                    <span class="chapter-date"><i class="far fa-calendar-alt"></i> ${releaseDate}</span>
                                </div>
                                <div class="chapter-actions">
                                    <button class="chapter-action-btn read-chapter" data-index="${index}" title="Read">
                                        <i class="fas fa-book-open"></i>
                                    </button>
                                    <button class="chapter-action-btn download-chapter" data-index="${index}" title="Download">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('') 
                    : '<div class="no-chapters">No chapters available</div>'
                }
            </div>
        </div>
    `;
    
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.chapter-actions')) {
                const index = item.dataset.chapterIndex;
                if (index !== undefined) openChapterReader(parseInt(index));
            }
        });
    });
    
    document.querySelectorAll('.read-chapter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = btn.dataset.index;
            if (index !== undefined) openChapterReader(parseInt(index));
        });
    });
    
    document.querySelectorAll('.download-chapter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = btn.dataset.index;
            if (index !== undefined) showDownloadOptions(parseInt(index));
        });
    });
    
    const readFirstBtn = document.getElementById('readFirstBtn');
    if (readFirstBtn) {
        readFirstBtn.addEventListener('click', () => {
            if (currentChapters.length > 0) {
                openChapterReader(0);
            } else {
                showToast('No chapters available', 'info');
            }
        });
    }
    
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', () => {
            toggleBookmark(selectedManga.id, selectedManga.title, selectedManga.image);
        });
    }
    
    updateBookmarkButton();
}

function toggleBookmark(id, title, image) {
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) {
        bookmarks.push({ id, title, image, addedAt: new Date().toISOString() });
        showToast('Bookmarked!', 'success');
    } else {
        bookmarks.splice(index, 1);
        showToast('Removed from bookmarks', 'info');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    updateBookmarkButton();
}

function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (!bookmarkBtn || !selectedManga) return;
    
    const isBookmarked = bookmarks.some(b => b.id === selectedManga.id);
    
    if (isBookmarked) {
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarked';
    } else {
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Bookmark';
    }
}

// Open Chapter Reader
async function openChapterReader(index) {
    if (index < 0 || index >= currentChapters.length) return;
    
    const chapter = currentChapters[index];
    selectedChapter = {
        index,
        id: chapter.id,
        number: index + 1,
        title: chapter.title || `Chapter ${index + 1}`
    };
    
    try {
        showToast('Loading chapter...', 'info');
        
        const response = await fetch(`${BASE_URL}/read?chapterId=${encodeURIComponent(chapter.id)}`, {
            headers: FETCH_HEADERS
        });
        
        if (!response.ok) throw new Error('Failed to load chapter');
        
        const pages = await response.json();
        
        if (detailsPage) detailsPage.style.display = 'none';
        if (readerPage) readerPage.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        displayReader(pages);
    } catch (error) {
        console.error('Error loading chapter:', error);
        showToast('Failed to load chapter', 'error');
    }
}

function displayReader(pages) {
    const readerBody = document.getElementById('readerBody');
    const readerTitle = document.getElementById('readerTitle');
    const chapterIndicator = document.getElementById('chapterIndicator');
    
    if (readerTitle) {
        readerTitle.textContent = selectedManga ? selectedManga.title : '';
    }
    
    if (chapterIndicator) {
        chapterIndicator.textContent = `Chapter ${selectedChapter.number}/${currentChapters.length}`;
    }
    
    if (readerBody) {
        readerBody.innerHTML = pages.map(page => {
            // Handle both formats: {page: number, img: url} or direct url string
            const imgUrl = page.img || page;
            const headerForImage = page.headerForImage || selectedManga?.headerForImage;
            
            return `<img src="${imgUrl}" alt="Page ${page.page || ''}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/800x1200?text=Error+Loading+Page'"
                         data-header="${headerForImage ? JSON.stringify(headerForImage) : ''}">`;
        }).join('');
    }
    
    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) readerContainer.scrollTop = 0;
}

function showDownloadOptions(index) {
    if (!selectedManga || !currentChapters[index]) return;
    
    const chapter = currentChapters[index];
    selectedChapter = {
        index,
        id: chapter.id,
        number: index + 1,
        title: chapter.title || `Chapter ${index + 1}`,
        mangaTitle: selectedManga.title
    };
    
    const downloadChapterInfo = document.getElementById('downloadChapterInfo');
    if (downloadChapterInfo) {
        downloadChapterInfo.innerHTML = `
            <h4>${selectedChapter.title}</h4>
            <p>${selectedManga.title}</p>
        `;
    }
    
    const downloadProgress = document.getElementById('downloadProgress');
    if (downloadProgress) downloadProgress.style.display = 'none';
    
    if (downloadOptionsModal) downloadOptionsModal.style.display = 'block';
}

// Download function
async function startDownload() {
    const quality = document.querySelector('input[name="quality"]:checked')?.value || 'original';
    
    if (downloadOptionsModal) downloadOptionsModal.style.display = 'none';
    
    try {
        showToast('Preparing download...', 'info');
        
        const response = await fetch(`${BASE_URL}/read?chapterId=${encodeURIComponent(selectedChapter.id)}`, {
            headers: FETCH_HEADERS
        });
        
        if (!response.ok) throw new Error('Failed to fetch chapter');
        
        const pages = await response.json();
        
        if (!pages || pages.length === 0) {
            throw new Error('No pages found for this chapter');
        }
        
        showToast(`Downloading ${pages.length} pages...`, 'info');
        
        await createChapterZip(pages, quality);
        
        showToast('Download complete!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed: ' + error.message, 'error');
    }
}

async function createChapterZip(pages, qualityType) {
    if (typeof JSZip === 'undefined') {
        showToast('JSZip library not loaded', 'error');
        return;
    }
    
    const zip = new JSZip();
    const safeTitle = (selectedChapter.mangaTitle || 'manga').replace(/[^a-z0-9]/gi, '_');
    const folderName = `${safeTitle}_Chapter_${selectedChapter.number}`;
    const folder = zip.folder(folderName);
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const imgUrl = page.img || page;
        
        try {
            // Use proxy for images if needed
            const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(imgUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('Empty image data');
            }
            
            const fileExt = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const pageName = `page_${String(i + 1).padStart(3, '0')}.${fileExt}`;
            folder.file(pageName, blob);
            
            const progress = ((i + 1) / pages.length) * 100;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
            
        } catch (error) {
            console.error(`Error downloading page ${i + 1}:`, error);
        }
    }
    
    const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    saveToDownloaded(pages.length);
}

function saveToDownloaded(pageCount) {
    const downloadItem = {
        id: `${selectedChapter.mangaTitle}_${selectedChapter.number}_${Date.now()}`,
        mangaId: selectedManga.id,
        mangaTitle: selectedChapter.mangaTitle,
        chapterNumber: selectedChapter.number,
        chapterId: selectedChapter.id,
        pageCount: pageCount,
        downloadedAt: new Date().toISOString()
    };
    
    downloadedChapters.push(downloadItem);
    localStorage.setItem('downloadedChapters', JSON.stringify(downloadedChapters));
}

function navigateChapter(direction) {
    if (!selectedChapter || !currentChapters.length) return;
    
    let newIndex = selectedChapter.index;
    
    if (direction === 'prev' && newIndex > 0) {
        newIndex--;
    } else if (direction === 'next' && newIndex < currentChapters.length - 1) {
        newIndex++;
    } else {
        showToast(direction === 'prev' ? 'This is the first chapter' : 'This is the last chapter', 'info');
        return;
    }
    
    openChapterReader(newIndex);
}

// ============== HANDLE SCROLL ==============
function handleScroll() {
    if (backToTop) {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
    
    if (mainContainer && mainContainer.style.display !== 'none' && !isLoading && hasNextPage) {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollY + windowHeight >= documentHeight - 300) {
            loadManga();
        }
    }
}

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function startSearch() {
    if (searchInput && searchInput.value.trim()) {
        currentQuery = searchInput.value.trim();
        currentType = "search";
        currentPage = 1;
        hasNextPage = true;
        if (resultsContainer) resultsContainer.innerHTML = '';
        if (endResults) endResults.style.display = 'none';
        loadManga();
        
        // Update active nav
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    }
}