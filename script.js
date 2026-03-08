// MangaDex API Configuration
const BASE_URL = "/api/proxy/manga";
const CDN_URL = "https://uploads.mangadex.org";

// Add required User-Agent header (MUST have per API rules)
const FETCH_HEADERS = {
    'User-Agent': 'ZIKKY-MANGA-HUB/1.0',
    'Accept': 'application/json'
};

// Allowed genres for homepage (fantasy, action, comedy, adventure)
const ALLOWED_GENRES = ['action', 'fantasy', 'comedy', 'adventure'];
const GENRE_IDS = {
    'action': '391b0423-d847-456f-aff0-8b0cfc03066b',
    'romance': '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
    'fantasy': 'cdc58593-87c6-4c3b-b4f6-b2c5c5f2e0d8',
    'comedy': '4d32cc48-9f00-4cca-9b5a-a839f0764984',
    'adventure': 'f4122d1c-3b44-44d0-9936-ff7502c39ad3',
    'horror': '0a39b5b1-b88e-4ec2-9d0c-f69aceaa7da9'
};

// State Management
let currentOffset = 0;
let isLoading = false;
let hasMoreResults = true;
let currentQuery = "";
let currentGenre = "all";
let currentSort = "followedCount";
let selectedManga = null;
let selectedChapter = null;
let currentChapters = [];
let downloadedChapters = JSON.parse(localStorage.getItem('downloadedChapters')) || [];
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let chapterRetryCount = 0;
const MAX_CHAPTER_RETRIES = 3;
let mangaStatsCache = new Map(); // Cache for manga statistics
let currentView = 'home'; // Track current view: home, popular, bookmarks, downloads

// DOM Elements
let mainContainer, detailsPage, readerPage, resultsContainer, loadingIndicator, endResults;
let searchInput, searchBtn, menuToggle, themeToggle, backToTop, refreshBtn, toastContainer;
let backFromDetails, backFromReader, prevChapterBtn, nextChapterBtn, downloadCurrentBtn;
let downloadOptionsModal, closeModalBtns, startDownloadBtn;
let popularBtn, bookmarksBtn, downloadsBtn, homeBtn;

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
    
    // Navigation buttons
    homeBtn = document.querySelector('a[href="#home"]');
    popularBtn = document.querySelector('a[href="#popular"]');
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
    refreshBtn.title = 'Refresh Random Manga';
    refreshBtn.addEventListener('click', refreshRandomManga);
    document.body.appendChild(refreshBtn);
}

function initializeApp() {
    // Set display count to 30-40 manga
    loadManga(35); // Start with 35
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

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGenre = btn.dataset.genre;
            resetSearch();
        });
    });

    // Home button
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHome();
        });
    }

    // Popular button
    if (popularBtn) {
        popularBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showPopularManga();
        });
    }
    
    // Bookmarks button
    if (bookmarksBtn) {
        bookmarksBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showBookmarks();
        });
    }
    
    // Downloads button
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
            
            // Refresh current view when coming back
            if (currentView === 'popular') {
                showPopularManga();
            } else if (currentView === 'bookmarks') {
                showBookmarks();
            } else if (currentView === 'downloads') {
                showDownloads();
            }
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

// ============== NAVIGATION FUNCTIONS ==============

function showHome() {
    currentView = 'home';
    currentSort = "followedCount";
    currentGenre = "all";
    currentQuery = "";
    currentOffset = 0;
    hasMoreResults = true;
    
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    // Update active nav link
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (homeBtn) homeBtn.classList.add('active');
    
    // Generate new random seed
    window.randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
    
    showToast('Loading home manga...', 'info');
    loadManga(35);
}

function showPopularManga() {
    currentView = 'popular';
    currentSort = "followedCount";
    currentGenre = "all";
    currentQuery = "";
    currentOffset = 0;
    hasMoreResults = true;
    
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (popularBtn) popularBtn.classList.add('active');
    
    showToast('Loading popular manga...', 'info');
    loadPopularManga();
}

async function loadPopularManga() {
    if (isLoading || !hasMoreResults) return;
    
    isLoading = true;
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        const limit = 35;
        
        if (currentOffset + limit > 10000) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
            return;
        }

        let url = `${BASE_URL}/manga?limit=${limit}&offset=${currentOffset}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&availableTranslatedLanguage[]=en&order[followedCount]=desc`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
            headers: FETCH_HEADERS,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
            return;
        }

        displayMangaFast(data.data);
        
        currentOffset += limit;
        
        if (data.data.length < limit) {
            hasMoreResults = false;
        }
        
        if (!hasMoreResults && endResults) {
            endResults.style.display = 'block';
        } else {
            if (endResults) endResults.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading popular manga:', error);
        showToast('Failed to load popular manga', 'error');
    } finally {
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function showBookmarks() {
    currentView = 'bookmarks';
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        
        if (bookmarks.length === 0) {
            resultsContainer.innerHTML = '<div class="no-items-message">No bookmarks yet. Start adding some!</div>';
            if (endResults) endResults.style.display = 'none';
        } else {
            loadBookmarks();
        }
    }
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (bookmarksBtn) bookmarksBtn.classList.add('active');
}

async function loadBookmarks() {
    if (!resultsContainer) return;
    
    showToast('Loading bookmarks...', 'info');
    
    for (const bookmark of bookmarks) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${bookmark.id}?includes[]=cover_art`, {
                headers: FETCH_HEADERS
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            // Fetch stats for this manga
            const statsResponse = await fetch(`${BASE_URL}/statistics/manga/${bookmark.id}`, {
                headers: FETCH_HEADERS
            });
            
            let stats = null;
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                stats = statsData.statistics?.[bookmark.id];
            }
            
            displaySingleManga(data.data, stats);
        } catch (error) {
            console.error('Error loading bookmark:', error);
        }
    }
}

function showDownloads() {
    currentView = 'downloads';
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        
        if (downloadedChapters.length === 0) {
            resultsContainer.innerHTML = '<div class="no-items-message">No downloads yet. Download some chapters!</div>';
            if (endResults) endResults.style.display = 'none';
        } else {
            displayDownloads();
        }
    }
    
    if (mainContainer) mainContainer.style.display = 'block';
    if (detailsPage) detailsPage.style.display = 'none';
    if (readerPage) readerPage.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (downloadsBtn) downloadsBtn.classList.add('active');
}

function displayDownloads() {
    if (!resultsContainer) return;
    
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
                    <div class="download-item" onclick="showDownloadDetails('${d.id}')">
                        <span>Chapter ${d.chapterNumber}</span>
                        <small>${new Date(d.downloadedAt).toLocaleDateString()} • ${d.pageCount || '?'} pages</small>
                    </div>
                `).join('')}
            </div>
        `;
        resultsContainer.appendChild(mangaDiv);
    });
}

// Global function for download details
window.showDownloadDetails = function(downloadId) {
    const download = downloadedChapters.find(d => d.id === downloadId);
    if (download) {
        showToast(`Chapter ${download.chapterNumber} downloaded on ${new Date(download.downloadedAt).toLocaleDateString()}`, 'info');
    }
};

function resetSearch() {
    currentOffset = 0;
    hasMoreResults = true;
    // Reset random seed for new randomization
    window.randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
    
    if (currentView === 'popular') {
        loadPopularManga();
    } else {
        loadManga(35);
    }
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

// Refresh Random Manga
function refreshRandomManga() {
    if (currentView !== 'home') {
        showHome();
        return;
    }
    
    // Reset everything
    currentOffset = 0;
    hasMoreResults = true;
    currentQuery = "";
    currentGenre = "all";
    
    // Generate completely new random seed
    window.randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
    
    // Clear results
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
    
    // Show toast
    showToast('Loading fresh random manga...', 'info');
    
    // Load new manga with increased count
    loadManga(35);
    
    // Animate button
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 500);
    }
}

// Get Genre ID
function getGenreId(genre) {
    return GENRE_IDS[genre];
}

// ============== LOAD MANGA WITH ALLOWED GENRES ==============
async function loadManga(limit = 35) {
    if (isLoading || !hasMoreResults || currentView !== 'home') return;
    
    isLoading = true;
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        const actualLimit = limit;
        
        if (currentOffset + actualLimit > 10000) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
            return;
        }

        if (!window.randomSeed) {
            window.randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
        }
        
        // Build URL with allowed genres for homepage
        let url = `${BASE_URL}/manga?limit=${actualLimit}&offset=${currentOffset}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&availableTranslatedLanguage[]=en`;
        
        // Add allowed genres (fantasy, action, comedy, adventure)
        const allowedGenreIds = ALLOWED_GENRES.map(g => GENRE_IDS[g]).filter(id => id);
        allowedGenreIds.forEach(genreId => {
            url += `&includedTags[]=${genreId}`;
        });
        url += `&includedTagsMode=OR`;
        
        // Add specific genre filter if selected
        if (currentGenre && currentGenre !== 'all') {
            const genreId = getGenreId(currentGenre);
            if (genreId) {
                url += `&includedTags[]=${genreId}`;
            }
        }
        
        // Randomize sort order for variety
        const sortOptions = ['followedCount', 'createdAt', 'updatedAt', 'rating'];
        const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
        const randomDirection = Math.random() > 0.5 ? 'desc' : 'asc';
        url += `&order[${randomSort}]=${randomDirection}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
            headers: FETCH_HEADERS,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
            showToast('No more manga available', 'info');
            return;
        }

        // Shuffle results based on seed
        let mangaToDisplay = [...data.data];
        for (let i = mangaToDisplay.length - 1; i > 0; i--) {
            const pseudoRandom = (Math.sin(i * window.randomSeed) * 10000) % 1;
            const j = Math.floor(Math.abs(pseudoRandom) * (i + 1));
            [mangaToDisplay[i], mangaToDisplay[j]] = [mangaToDisplay[j], mangaToDisplay[i]];
        }

        displayMangaFast(mangaToDisplay);
        
        currentOffset += actualLimit;
        
        if (data.data.length < actualLimit) {
            hasMoreResults = false;
        }
        
        if (!hasMoreResults && endResults) {
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

// FAST display function
function displayMangaFast(mangaList) {
    if (!resultsContainer) return;
    
    mangaList.forEach(manga => {
        const coverFileName = manga.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;
        const coverUrl = coverFileName ? `${CDN_URL}/covers/${manga.id}/${coverFileName}` : 'https://via.placeholder.com/200x280?text=No+Cover';
        
        const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
        
        let ratingDisplay = 'N/A';
        if (mangaStatsCache.has(manga.id)) {
            const stats = mangaStatsCache.get(manga.id);
            ratingDisplay = formatRating(stats);
        }
        
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.dataset.mangaId = manga.id;
        
        card.innerHTML = `
            <img src="${coverUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=No+Cover'">
            <div class="manga-info">
                <div class="manga-title">${title}</div>
                <div class="manga-stats">
                    <span class="rating-span"><i class="fas fa-star" style="color: #ffd700;"></i> ${ratingDisplay}</span>
                    <span><i class="fas fa-calendar"></i> ${manga.attributes.year || '?'}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => openMangaDetails(manga.id, title));
        resultsContainer.appendChild(card);
    });
    
    fetchStatsInBackground(mangaList);
}

// Format rating for display
function formatRating(stats) {
    if (!stats || !stats.rating) return 'N/A';
    
    const rating = stats.rating;
    if (rating.bayesian) {
        return rating.bayesian.toFixed(1);
    } else if (rating.average) {
        return rating.average.toFixed(1);
    }
    return 'N/A';
}

// Background stats fetching
async function fetchStatsInBackground(mangaList) {
    try {
        const mangaIds = mangaList.map(m => m.id).join(',');
        const statsResponse = await fetch(`${BASE_URL}/statistics/manga?manga=${mangaIds}`, {
            headers: FETCH_HEADERS
        });
        
        if (!statsResponse.ok) return;
        
        const stats = await statsResponse.json();
        const statsData = stats.statistics || {};
        
        // Update cache
        Object.entries(statsData).forEach(([id, data]) => {
            mangaStatsCache.set(id, data);
        });
        
        // Update cards
        const cards = resultsContainer.children;
        const startIndex = cards.length - mangaList.length;
        
        mangaList.forEach((manga, index) => {
            const mangaStats = statsData[manga.id];
            if (!mangaStats) return;
            
            const ratingDisplay = formatRating(mangaStats);
            
            const cardIndex = startIndex + index;
            if (cards[cardIndex]) {
                const ratingSpan = cards[cardIndex].querySelector('.rating-span');
                if (ratingSpan) {
                    ratingSpan.innerHTML = `<i class="fas fa-star" style="color: #ffd700;"></i> ${ratingDisplay}`;
                }
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Display Single Manga
function displaySingleManga(manga, stats = null) {
    if (!resultsContainer) return;
    
    const coverFileName = manga.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;
    const coverUrl = coverFileName ? `${CDN_URL}/covers/${manga.id}/${coverFileName}` : 'https://via.placeholder.com/200x280?text=No+Cover';
    
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Unknown Title';
    
    const ratingDisplay = stats ? formatRating(stats) : 'N/A';
    const follows = stats?.follows || 0;
    
    const card = document.createElement('div');
    card.className = 'manga-card';
    
    card.innerHTML = `
        <img src="${coverUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=No+Cover'">
        <div class="manga-info">
            <div class="manga-title">${title}</div>
            <div class="manga-stats">
                <span><i class="fas fa-star" style="color: #ffd700;"></i> ${ratingDisplay}</span>
                <span><i class="fas fa-heart"></i> ${follows}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openMangaDetails(manga.id, title));
    resultsContainer.appendChild(card);
}

// Open Manga Details Page
async function openMangaDetails(mangaId, title) {
    selectedManga = { id: mangaId, title };
    
    try {
        showToast('Loading manga details...', 'info');
        
        // Fetch manga details
        const response = await fetch(`${BASE_URL}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=tag`, {
            headers: FETCH_HEADERS
        });
        if (!response.ok) throw new Error('Failed to fetch manga details');
        const data = await response.json();
        
        // Fetch statistics
        const statsPromise = fetch(`${BASE_URL}/statistics/manga/${mangaId}`, {
            headers: FETCH_HEADERS
        }).then(res => res.ok ? res.json() : {});
        
        // Fetch chapters with retry
        currentChapters = await fetchAllChaptersWithRetry(mangaId);
        
        // Get stats
        const statsData = await statsPromise;
        
        if (mainContainer) mainContainer.style.display = 'none';
        if (detailsPage) detailsPage.style.display = 'block';
        document.body.style.overflow = 'auto';
        
        displayMangaDetails(data.data, statsData.statistics?.[mangaId]);
    } catch (error) {
        console.error('Error opening manga:', error);
        showToast('Failed to load manga details: ' + error.message, 'error');
    }
}

// Fetch chapters with retry
async function fetchAllChaptersWithRetry(mangaId, retryCount = 0) {
    try {
        return await fetchAllChapters(mangaId);
    } catch (error) {
        if (retryCount < MAX_CHAPTER_RETRIES) {
            showToast(`Retrying chapter fetch (${retryCount + 1}/${MAX_CHAPTER_RETRIES})...`, 'info');
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return fetchAllChaptersWithRetry(mangaId, retryCount + 1);
        }
        throw error;
    }
}

// Fetch ALL chapters
async function fetchAllChapters(mangaId) {
    let allChapters = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    try {
        while (hasMore) {
            try {
                const response = await fetch(
                    `${BASE_URL}/chapter?manga=${mangaId}&translatedLanguage[]=en&limit=${limit}&offset=${offset}&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
                    { headers: FETCH_HEADERS }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.data.length === 0) {
                    hasMore = false;
                    break;
                }
                
                // Include all chapters that have pages
                const validChapters = data.data.filter(ch => ch.attributes.pages > 0);
                allChapters = [...allChapters, ...validChapters];
                offset += limit;
                
                if (data.total && offset >= data.total) {
                    hasMore = false;
                }
                
                retryCount = 0; // Reset retry count on success
                
            } catch (error) {
                console.error(`Error fetching chapters at offset ${offset}:`, error);
                
                if (retryCount < maxRetries) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                } else {
                    hasMore = false;
                }
            }
        }
        
        // Sort chapters numerically
        allChapters.sort((a, b) => {
            const numA = a.attributes.chapter ? parseFloat(a.attributes.chapter) : 999999;
            const numB = b.attributes.chapter ? parseFloat(b.attributes.chapter) : 999999;
            return numA - numB;
        });
        
    } catch (error) {
        console.error('Error in fetchAllChapters:', error);
        throw error;
    }
    
    return allChapters;
}

// Display Manga Details
function displayMangaDetails(manga, stats) {
    const wrapper = document.getElementById('mangaDetailsWrapper');
    if (!wrapper) return;
    
    const description = manga.attributes.description.en || 'No description available';
    const coverFile = manga.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;
    const coverUrl = coverFile ? `${CDN_URL}/covers/${manga.id}/${coverFile}` : 'https://via.placeholder.com/300x400?text=No+Cover';
    
    const author = manga.relationships.find(r => r.type === 'author')?.attributes?.name || 'Unknown';
    const artist = manga.relationships.find(r => r.type === 'artist')?.attributes?.name || 'Unknown';
    
    const rating = stats?.rating || {};
    const follows = stats?.follows || 0;
    const comments = stats?.comments?.count || 0;
    
    let ratingValue = 'N/A';
    let voteCount = 0;
    
    if (rating.bayesian) {
        ratingValue = rating.bayesian.toFixed(1);
    } else if (rating.average) {
        ratingValue = rating.average.toFixed(1);
    }
    
    if (rating.distribution) {
        voteCount = Object.values(rating.distribution).reduce((a, b) => a + b, 0);
    }
    
    const starRating = ratingValue !== 'N/A' ? Math.round(parseFloat(ratingValue) / 2) : 0;
    const stars = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
    
    wrapper.innerHTML = `
        <div class="manga-details-grid">
            <div class="details-cover-container">
                <img src="${coverUrl}" alt="${selectedManga.title}" class="details-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
            </div>
            <div class="details-info">
                <h2 class="details-title">${selectedManga.title}</h2>
                
                <div class="rating-container">
                    <div class="rating-score">
                        <span class="rating-value">${ratingValue}</span>
                        <span class="rating-stars">${stars}</span>
                    </div>
                    <div class="rating-details">
                        <span><i class="fas fa-users"></i> ${follows.toLocaleString()} follows</span>
                        <span><i class="fas fa-vote-yea"></i> ${voteCount.toLocaleString()} votes</span>
                        <span><i class="fas fa-comments"></i> ${comments.toLocaleString()} comments</span>
                    </div>
                </div>
                
                <div class="details-description">
                    ${description.replace(/\n/g, '<br>')}
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-book"></i> Chapters:</span>
                        <span class="info-value">${currentChapters.length}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-calendar"></i> Year:</span>
                        <span class="info-value">${manga.attributes.year || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-pen"></i> Author:</span>
                        <span class="info-value">${author}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-paint-brush"></i> Artist:</span>
                        <span class="info-value">${artist}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-globe"></i> Status:</span>
                        <span class="info-value">${manga.attributes.status || 'Unknown'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-language"></i> Language:</span>
                        <span class="info-value">${manga.attributes.originalLanguage?.toUpperCase() || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="details-tags">
                    ${manga.attributes.tags.map(tag => 
                        `<span class="tag">${tag.attributes.name.en}</span>`
                    ).join('')}
                </div>
                
                <div class="action-buttons">
                    <button class="action-btn primary" id="readFirstBtn">
                        <i class="fas fa-book-open"></i> Read First Chapter
                    </button>
                    <button class="action-btn secondary" id="bookmarkBtn">
                        <i class="${isBookmarked(selectedManga.id) ? 'fas' : 'far'} fa-bookmark"></i> ${isBookmarked(selectedManga.id) ? 'Bookmarked' : 'Bookmark'}
                    </button>
                </div>
            </div>
        </div>
        
        <div class="chapters-section">
            <h3><i class="fas fa-list"></i> Chapters (${currentChapters.length})</h3>
            <div class="chapter-list" id="chapterList">
                ${currentChapters.length > 0 ? 
                    currentChapters.map((ch, index) => {
                        const chapterNum = ch.attributes.chapter || (index + 1);
                        const chapterTitle = ch.attributes.title || '';
                        const pages = ch.attributes.pages || 0;
                        const uploaded = ch.attributes.publishAt ? new Date(ch.attributes.publishAt).toLocaleDateString() : 'Unknown';
                        return `
                            <div class="chapter-item" data-chapter-index="${index}">
                                <div class="chapter-info">
                                    <span class="chapter-number">Chapter ${chapterNum}</span>
                                    ${chapterTitle ? `<span class="chapter-title">${chapterTitle}</span>` : ''}
                                    <span class="chapter-pages"><i class="far fa-file-image"></i> ${pages} pages</span>
                                    <span class="chapter-date"><i class="far fa-calendar-alt"></i> ${uploaded}</span>
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
    
    // Add event listeners
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
            toggleBookmark(selectedManga.id, selectedManga.title);
        });
    }
}

function isBookmarked(id) {
    return bookmarks.some(b => b.id === id);
}

function toggleBookmark(id, title) {
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) {
        bookmarks.push({ id, title, addedAt: new Date().toISOString() });
        showToast('Bookmarked!', 'success');
    } else {
        bookmarks.splice(index, 1);
        showToast('Removed from bookmarks', 'info');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    
    // Update button if it exists
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        bookmarkBtn.innerHTML = `<i class="${isBookmarked(id) ? 'fas' : 'far'} fa-bookmark"></i> ${isBookmarked(id) ? 'Bookmarked' : 'Bookmark'}`;
    }
}

// Open Chapter Reader
async function openChapterReader(index) {
    if (index < 0 || index >= currentChapters.length) return;
    
    selectedChapter = {
        index,
        id: currentChapters[index].id,
        number: currentChapters[index].attributes.chapter || (index + 1),
        title: currentChapters[index].attributes.title || ''
    };
    
    try {
        showToast('Loading chapter...', 'info');
        
        const response = await fetch(`${BASE_URL}/at-home/server/${selectedChapter.id}`, {
            headers: FETCH_HEADERS
        });
        if (!response.ok) throw new Error('Failed to load chapter');
        
        const data = await response.json();
        
        const baseUrl = data.baseUrl;
        const chapterHash = data.chapter.hash;
        const pages = data.chapter.data.map(page => 
            `${baseUrl}/data/${chapterHash}/${page}`
        );
        
        if (detailsPage) detailsPage.style.display = 'none';
        if (readerPage) readerPage.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        displayReader(pages);
    } catch (error) {
        console.error('Error loading chapter:', error);
        showToast('Failed to load chapter: ' + error.message, 'error');
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
        readerBody.innerHTML = pages.map(page => 
            `<img src="${page}" alt="Page" loading="lazy" onerror="this.src='https://via.placeholder.com/800x1200?text=Error+Loading+Page'">`
        ).join('');
    }
    
    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) readerContainer.scrollTop = 0;
}

function showDownloadOptions(index) {
    if (!selectedManga || !currentChapters[index]) return;
    
    selectedChapter = {
        index,
        id: currentChapters[index].id,
        number: currentChapters[index].attributes.chapter || (index + 1),
        mangaTitle: selectedManga.title,
        pages: currentChapters[index].attributes.pages || 0
    };
    
    const downloadChapterInfo = document.getElementById('downloadChapterInfo');
    if (downloadChapterInfo) {
        downloadChapterInfo.innerHTML = `
            <h4>Chapter ${selectedChapter.number}</h4>
            <p>${selectedManga.title}</p>
            <small>Pages: ${selectedChapter.pages}</small>
        `;
    }
    
    const downloadProgress = document.getElementById('downloadProgress');
    if (downloadProgress) downloadProgress.style.display = 'none';
    
    if (downloadOptionsModal) downloadOptionsModal.style.display = 'block';
}

// FIXED: Download function with proper error handling
async function startDownload() {
    const quality = document.querySelector('input[name="quality"]:checked')?.value || 'data';
    
    if (downloadOptionsModal) downloadOptionsModal.style.display = 'none';
    
    try {
        showToast('Preparing download...', 'info');
        
        // Show progress
        const downloadProgress = document.getElementById('downloadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (downloadProgress) downloadProgress.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        
        // Fetch chapter data
        const response = await fetch(`${BASE_URL}/at-home/server/${selectedChapter.id}`, {
            headers: FETCH_HEADERS
        });
        
        if (!response.ok) throw new Error('Failed to fetch chapter');
        
        const data = await response.json();
        
        // Determine quality type (MangaDex uses 'data' for original, 'dataSaver' for compressed)
        const qualityType = quality === 'data' ? 'data' : 'dataSaver';
        const pageFilenames = data.chapter[qualityType];
        const baseUrl = data.baseUrl;
        const chapterHash = data.chapter.hash;
        
        if (!pageFilenames || pageFilenames.length === 0) {
            throw new Error('No pages found for this chapter');
        }
        
        showToast(`Downloading ${pageFilenames.length} pages...`, 'info');
        
        // Create ZIP file
        await createChapterZip(baseUrl, chapterHash, pageFilenames, qualityType, progressFill, progressText);
        
        showToast('Download complete!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed: ' + error.message, 'error');
        
        // Hide progress
        const downloadProgress = document.getElementById('downloadProgress');
        if (downloadProgress) downloadProgress.style.display = 'none';
    }
}

// FIXED: ZIP creation with proper error handling
async function createChapterZip(baseUrl, chapterHash, pageFilenames, qualityType, progressFill, progressText) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded');
    }
    
    const zip = new JSZip();
    const safeTitle = (selectedChapter.mangaTitle || 'manga').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const folderName = `${safeTitle}_Chapter_${selectedChapter.number}`;
    const folder = zip.folder(folderName);
    
    let successfulDownloads = 0;
    const failedPages = [];
    
    for (let i = 0; i < pageFilenames.length; i++) {
        const filename = pageFilenames[i];
        const pageUrl = `${baseUrl}/${qualityType}/${chapterHash}/${filename}`;
        
        try {
            // Add timeout to fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(pageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('Empty image data');
            }
            
            const fileExt = filename.split('.').pop() || 'jpg';
            const pageName = `page_${String(i + 1).padStart(3, '0')}.${fileExt}`;
            folder.file(pageName, blob);
            
            successfulDownloads++;
            
            // Update progress
            const progress = ((i + 1) / pageFilenames.length) * 100;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
            
        } catch (error) {
            console.error(`Error downloading page ${i + 1}:`, error);
            failedPages.push(i + 1);
        }
    }
    
    if (successfulDownloads === 0) {
        throw new Error('No pages could be downloaded');
    }
    
    // Generate ZIP
    showToast(`Creating ZIP file with ${successfulDownloads} pages...`, 'info');
    
    const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    // Download ZIP
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Save to download history
    saveToDownloaded(successfulDownloads, failedPages);
    
    // Hide progress
    const downloadProgress = document.getElementById('downloadProgress');
    if (downloadProgress) downloadProgress.style.display = 'none';
}

function saveToDownloaded(pageCount, failedPages = []) {
    const downloadItem = {
        id: `${selectedChapter.mangaTitle}_${selectedChapter.number}_${Date.now()}`,
        mangaId: selectedManga.id,
        mangaTitle: selectedChapter.mangaTitle,
        chapterNumber: selectedChapter.number,
        chapterId: selectedChapter.id,
        pageCount: pageCount,
        failedPages: failedPages.length,
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

// Handle scroll for infinite loading
function handleScroll() {
    // Show/hide back to top button
    if (backToTop) {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
    
    // Infinite scroll - only on home or popular views
    if (mainContainer && mainContainer.style.display !== 'none' && !isLoading && hasMoreResults) {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollY + windowHeight >= documentHeight - 500) {
            if (currentView === 'popular') {
                loadPopularManga();
            } else if (currentView === 'home') {
                loadManga(35);
            }
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
    if (searchInput) {
        currentQuery = searchInput.value;
        currentView = 'home'; // Switch to home view for search results
        resetSearch();
    }
}