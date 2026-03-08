// ============================================
// ZIKKY MANGA HUB - CONSUMET API
// ============================================

// API Configuration
const CONSUMET_URL = "https://zikkymangahub-emg2.onrender.com"; // UPDATE THIS URL
const MANGA_PROVIDER = "mangahere";

// State Management
let currentPage = 1;
let isLoading = false;
let hasMoreResults = true;
let currentQuery = "";
let currentView = "popular";
let selectedManga = null;
let selectedChapter = null;
let currentChapters = [];
let downloadedChapters = JSON.parse(localStorage.getItem('downloadedChapters')) || [];
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];

// DOM Elements
let mainContainer, detailsPage, readerPage, resultsContainer, loadingIndicator, endResults;
let searchInput, searchBtn, menuToggle, themeToggle, backToTop, toastContainer;
let backFromDetails, backFromReader, prevChapterBtn, nextChapterBtn, downloadCurrentBtn;
let downloadOptionsModal, closeModalBtns, startDownloadBtn, downloadProgress, progressFill, progressText;
let homeBtn, popularBtn, trendingBtn, hotBtn, recentBtn, bookmarksBtn, downloadsBtn;
let genreFilters, mangaDetailsWrapper, readerBody, readerTitle, chapterIndicator;
let downloadChapterInfo;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    initializeApp();
});

function initializeDOMElements() {
    // Main containers
    mainContainer = document.getElementById('mainContainer');
    detailsPage = document.getElementById('detailsPage');
    readerPage = document.getElementById('readerPage');
    resultsContainer = document.getElementById('results');
    loadingIndicator = document.getElementById('loading');
    endResults = document.getElementById('endResults');
    toastContainer = document.getElementById('toastContainer');
    mangaDetailsWrapper = document.getElementById('mangaDetailsWrapper');
    readerBody = document.getElementById('readerBody');
    readerTitle = document.getElementById('readerTitle');
    chapterIndicator = document.getElementById('chapterIndicator');
    
    // Search elements
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    
    // UI Controls
    menuToggle = document.getElementById('menuToggle');
    themeToggle = document.getElementById('themeToggle');
    backToTop = document.getElementById('backToTop');
    genreFilters = document.querySelectorAll('.filter-btn');
    
    // Navigation buttons
    homeBtn = document.getElementById('homeBtn');
    popularBtn = document.getElementById('popularBtn');
    trendingBtn = document.getElementById('trendingBtn');
    hotBtn = document.getElementById('hotBtn');
    recentBtn = document.getElementById('recentBtn');
    bookmarksBtn = document.getElementById('bookmarksBtn');
    downloadsBtn = document.getElementById('downloadsBtn');
    
    // Back buttons
    backFromDetails = document.getElementById('backFromDetails');
    backFromReader = document.getElementById('backFromReader');
    
    // Reader controls
    prevChapterBtn = document.getElementById('prevChapterBtn');
    nextChapterBtn = document.getElementById('nextChapterBtn');
    downloadCurrentBtn = document.getElementById('downloadCurrentBtn');
    
    // Download modal
    downloadOptionsModal = document.getElementById('downloadOptionsModal');
    closeModalBtns = document.querySelectorAll('.close-modal');
    startDownloadBtn = document.getElementById('startDownloadBtn');
    downloadProgress = document.getElementById('downloadProgress');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    downloadChapterInfo = document.getElementById('downloadChapterInfo');
    
    if (mainContainer) mainContainer.style.display = 'block';
}

function initializeApp() {
    loadPopularManga();
    setupEventListeners();
    createParticles();
    loadTheme();
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) {
            themeToggle.querySelector('i').className = 'fas fa-sun';
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Search
    if (searchBtn) searchBtn.addEventListener('click', startSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startSearch();
        });
    }

    // Navigation
    if (homeBtn) homeBtn.addEventListener('click', (e) => { e.preventDefault(); loadHome(); });
    if (popularBtn) popularBtn.addEventListener('click', (e) => { e.preventDefault(); loadPopularManga(); });
    if (trendingBtn) trendingBtn.addEventListener('click', (e) => { e.preventDefault(); loadTrendingManga(); });
    if (hotBtn) hotBtn.addEventListener('click', (e) => { e.preventDefault(); loadHotManga(); });
    if (recentBtn) recentBtn.addEventListener('click', (e) => { e.preventDefault(); loadRecentManga(); });
    if (bookmarksBtn) bookmarksBtn.addEventListener('click', (e) => { e.preventDefault(); showBookmarks(); });
    if (downloadsBtn) downloadsBtn.addEventListener('click', (e) => { e.preventDefault(); showDownloads(); });

    // Genre filters
    genreFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            genreFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // You can implement genre filtering here if needed
        });
    });

    // UI Controls
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Page Navigation
    if (backFromDetails) {
        backFromDetails.addEventListener('click', () => {
            detailsPage.style.display = 'none';
            mainContainer.style.display = 'block';
            document.body.style.overflow = 'auto';
        });
    }

    if (backFromReader) {
        backFromReader.addEventListener('click', () => {
            readerPage.style.display = 'none';
            detailsPage.style.display = 'block';
            document.body.style.overflow = 'auto';
        });
    }

    // Chapter Navigation
    if (prevChapterBtn) prevChapterBtn.addEventListener('click', () => navigateChapter('prev'));
    if (nextChapterBtn) nextChapterBtn.addEventListener('click', () => navigateChapter('next'));
    if (downloadCurrentBtn) {
        downloadCurrentBtn.addEventListener('click', () => {
            if (selectedChapter && selectedManga) {
                readerPage.style.display = 'none';
                showDownloadOptions(selectedChapter.index);
            }
        });
    }

    // Modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            downloadOptionsModal.style.display = 'none';
        });
    });

    if (startDownloadBtn) startDownloadBtn.addEventListener('click', startDownload);

    // Scroll
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function loadHome() {
    currentView = "popular";
    currentQuery = "";
    resetPagination();
    updateActiveNav(homeBtn);
    fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/popular`);
}

function loadPopularManga() {
    currentView = "popular";
    currentQuery = "";
    resetPagination();
    updateActiveNav(popularBtn);
    fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/popular`);
    showToast('Loading popular manga...', 'info');
}

function loadTrendingManga() {
    currentView = "trending";
    currentQuery = "";
    resetPagination();
    updateActiveNav(trendingBtn);
    fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/trending`);
    showToast('Loading trending manga...', 'info');
}

function loadHotManga() {
    currentView = "hot";
    currentQuery = "";
    resetPagination();
    updateActiveNav(hotBtn);
    fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/hot`);
    showToast('Loading hot releases...', 'info');
}

function loadRecentManga() {
    currentView = "recent";
    currentQuery = "";
    resetPagination();
    updateActiveNav(recentBtn);
    fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/recent?page=${currentPage}`);
    showToast('Loading recent updates...', 'info');
}

function updateActiveNav(activeBtn) {
    const navButtons = [homeBtn, popularBtn, trendingBtn, hotBtn, recentBtn, bookmarksBtn, downloadsBtn];
    navButtons.forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
}

function resetPagination() {
    currentPage = 1;
    hasMoreResults = true;
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (endResults) endResults.style.display = 'none';
}

// ============================================
// API CALLS
// ============================================

async function fetchManga(baseUrl) {
    if (isLoading || !hasMoreResults || currentView === 'bookmarks' || currentView === 'downloads') return;
    
    isLoading = true;
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        let url;
        if (currentQuery) {
            url = `${CONSUMET_URL}/manga/${MANGA_PROVIDER}/${encodeURIComponent(currentQuery)}?page=${currentPage}`;
        } else if (currentView === 'recent') {
            url = `${CONSUMET_URL}/manga/${MANGA_PROVIDER}/recent?page=${currentPage}`;
        } else {
            url = baseUrl.includes('?') ? `${baseUrl}&page=${currentPage}` : `${baseUrl}?page=${currentPage}`;
        }

        console.log('Fetching:', url); // Debug log
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        let results = data.results || [];
        
        if (results.length === 0) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
            return;
        }

        displayManga(results);
        currentPage++;
        
        if (data.hasNextPage === false) {
            hasMoreResults = false;
            if (endResults) endResults.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading manga:', error);
        showToast('Failed to load manga. Please try again.', 'error');
    } finally {
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function displayManga(mangaList) {
    if (!resultsContainer) return;
    
    mangaList.forEach(manga => {
        const card = createMangaCard(manga);
        resultsContainer.appendChild(card);
    });
}

function createMangaCard(manga) {
    const title = manga.title || 'Unknown Title';
    const imageUrl = manga.image || 'https://via.placeholder.com/200x280?text=No+Cover';
    
    const card = document.createElement('div');
    card.className = 'manga-card';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=No+Cover'">
        <div class="manga-info">
            <div class="manga-title">${title}</div>
        </div>
    `;
    
    card.addEventListener('click', () => openMangaDetails(manga.id, title, manga));
    return card;
}

// ============================================
// MANGA DETAILS
// ============================================

async function openMangaDetails(mangaId, title, mangaData = null) {
    selectedManga = { id: mangaId, title, data: mangaData };
    
    try {
        showToast('Loading manga details...', 'info');
        
        const response = await fetch(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/info?id=${mangaId}`);
        if (!response.ok) throw new Error('Failed to fetch manga details');
        
        const data = await response.json();
        
        currentChapters = data.chapters || [];
        
        mainContainer.style.display = 'none';
        detailsPage.style.display = 'block';
        document.body.style.overflow = 'auto';
        
        renderMangaDetails(data);
    } catch (error) {
        console.error('Error opening manga:', error);
        showToast('Failed to load manga details: ' + error.message, 'error');
    }
}

function renderMangaDetails(manga) {
    if (!mangaDetailsWrapper) return;
    
    const title = manga.title || selectedManga.title;
    const image = manga.image || 'https://via.placeholder.com/300x400?text=No+Cover';
    const description = manga.description || 'No description available';
    const status = manga.status || 'Unknown';
    const genres = manga.genres || [];
    
    let chaptersHtml = '';
    if (currentChapters.length > 0) {
        chaptersHtml = currentChapters.map((ch, index) => {
            const chapterNum = ch.title || `Chapter ${index + 1}`;
            return `
                <div class="chapter-item" data-chapter-index="${index}">
                    <div class="chapter-info">
                        <span class="chapter-number">${chapterNum}</span>
                    </div>
                    <div class="chapter-actions">
                        <button class="chapter-action-btn read-chapter" data-index="${index}" data-id="${ch.id}" title="Read">
                            <i class="fas fa-book-open"></i>
                        </button>
                        <button class="chapter-action-btn download-chapter" data-index="${index}" data-id="${ch.id}" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        chaptersHtml = '<div class="no-chapters">No chapters available</div>';
    }
    
    mangaDetailsWrapper.innerHTML = `
        <div class="manga-details-grid">
            <div class="details-cover-container">
                <img src="${image}" alt="${title}" class="details-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
            </div>
            <div class="details-info">
                <h2 class="details-title">${title}</h2>
                
                <div class="details-description">
                    ${description.replace(/\n/g, '<br>')}
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-book"></i> Chapters:</span>
                        <span class="info-value">${currentChapters.length}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-globe"></i> Status:</span>
                        <span class="info-value">${status}</span>
                    </div>
                </div>
                
                ${genres.length > 0 ? `
                    <div class="details-tags">
                        ${genres.map(genre => `<span class="tag">${genre}</span>`).join('')}
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
                ${chaptersHtml}
            </div>
        </div>
    `;
    
    // Add chapter event listeners
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
            const chapterId = btn.dataset.id;
            if (index !== undefined) {
                const chapter = currentChapters[parseInt(index)];
                selectedChapter = {
                    index: parseInt(index),
                    id: chapterId,
                    number: chapter.title || (parseInt(index) + 1),
                    mangaTitle: selectedManga.title
                };
                showDownloadOptions(parseInt(index));
            }
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
            toggleBookmark(selectedManga.id, selectedManga.title, manga.image, status);
        });
    }
    
    updateBookmarkButton();
}

// ============================================
// BOOKMARKS
// ============================================

function toggleBookmark(id, title, image, status) {
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) {
        bookmarks.push({ 
            id, 
            title, 
            image,
            status,
            addedAt: new Date().toISOString() 
        });
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
    bookmarkBtn.innerHTML = isBookmarked ? 
        '<i class="fas fa-bookmark"></i> Bookmarked' : 
        '<i class="far fa-bookmark"></i> Bookmark';
}

function showBookmarks() {
    currentView = "bookmarks";
    updateActiveNav(bookmarksBtn);
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        
        if (bookmarks.length === 0) {
            resultsContainer.innerHTML = '<div class="no-items-message">No bookmarks yet. Start adding some!</div>';
            if (endResults) endResults.style.display = 'none';
            return;
        }
        
        bookmarks.forEach(bookmark => {
            const card = createMangaCard(bookmark);
            resultsContainer.appendChild(card);
        });
    }
    
    mainContainer.style.display = 'block';
    detailsPage.style.display = 'none';
    readerPage.style.display = 'none';
}

// ============================================
// CHAPTER READER
// ============================================

async function openChapterReader(index) {
    if (index < 0 || index >= currentChapters.length) return;
    
    const chapter = currentChapters[index];
    selectedChapter = {
        index,
        id: chapter.id,
        number: chapter.title || `Chapter ${index + 1}`,
        title: chapter.title || ''
    };
    
    try {
        showToast('Loading chapter...', 'info');
        
        const response = await fetch(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/read?chapterId=${selectedChapter.id}`);
        if (!response.ok) throw new Error('Failed to load chapter');
        
        const data = await response.json();
        
        let pages = [];
        if (Array.isArray(data)) {
            pages = data;
        } else if (data.pages) {
            pages = data.pages;
        } else if (data.images) {
            pages = data.images;
        }
        
        if (pages.length === 0) throw new Error('No pages found');
        
        detailsPage.style.display = 'none';
        readerPage.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        renderReader(pages);
    } catch (error) {
        console.error('Error loading chapter:', error);
        showToast('Failed to load chapter: ' + error.message, 'error');
    }
}

function renderReader(pages) {
    if (readerTitle) {
        readerTitle.textContent = selectedManga ? selectedManga.title : '';
    }
    
    if (chapterIndicator) {
        chapterIndicator.textContent = `${selectedChapter.number} | ${selectedChapter.index + 1}/${currentChapters.length}`;
    }
    
    if (readerBody) {
        readerBody.innerHTML = pages.map((page, i) => {
            const imgUrl = typeof page === 'string' ? page : (page.img || page.url || page);
            return `<img src="${imgUrl}" alt="Page ${i+1}" loading="lazy" onerror="this.src='https://via.placeholder.com/800x1200?text=Error+Loading+Page'">`;
        }).join('');
    }
    
    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) readerContainer.scrollTop = 0;
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

// ============================================
// DOWNLOADS
// ============================================

function showDownloadOptions(index) {
    if (!selectedManga || !currentChapters[index]) return;
    
    if (downloadChapterInfo) {
        downloadChapterInfo.innerHTML = `
            <h4>${selectedChapter.number}</h4>
            <p>${selectedManga.title}</p>
        `;
    }
    
    if (downloadProgress) downloadProgress.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    
    downloadOptionsModal.style.display = 'block';
}

async function startDownload() {
    downloadOptionsModal.style.display = 'none';
    if (downloadProgress) downloadProgress.style.display = 'block';
    
    try {
        showToast('Preparing download...', 'info');
        
        const response = await fetch(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/read?chapterId=${selectedChapter.id}`);
        if (!response.ok) throw new Error('Failed to fetch chapter');
        
        const data = await response.json();
        
        let pages = [];
        if (Array.isArray(data)) {
            pages = data;
        } else if (data.pages) {
            pages = data.pages;
        } else if (data.images) {
            pages = data.images;
        }
        
        if (pages.length === 0) throw new Error('No pages found');
        
        await createChapterZip(pages);
        showToast('Download complete!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed. Please try again.', 'error');
    } finally {
        if (downloadProgress) downloadProgress.style.display = 'none';
    }
}

async function createChapterZip(pages) {
    if (typeof JSZip === 'undefined') {
        showToast('JSZip library not loaded', 'error');
        return;
    }
    
    const zip = new JSZip();
    const safeTitle = (selectedManga.title || 'manga').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    const chapterNum = selectedChapter.number.toString().replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const folderName = `${safeTitle}_${chapterNum}`;
    const folder = zip.folder(folderName);
    
    showToast(`Downloading ${pages.length} pages...`, 'info');
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageUrl = typeof page === 'string' ? page : (page.img || page.url || page);
        
        try {
            const response = await fetch(pageUrl);
            if (!response.ok) throw new Error(`Failed to download page ${i + 1}`);
            
            const blob = await response.blob();
            const fileExt = pageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            folder.file(`page_${String(i + 1).padStart(3, '0')}.${fileExt}`, blob);
            
            const progress = ((i + 1) / pages.length) * 100;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
            
        } catch (error) {
            console.error(`Error downloading page ${i + 1}:`, error);
            showToast(`Error on page ${i + 1}, continuing...`, 'warning');
        }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
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
        id: `${selectedManga.title}_${selectedChapter.number}_${Date.now()}`,
        mangaId: selectedManga.id,
        mangaTitle: selectedManga.title,
        chapterNumber: selectedChapter.number,
        chapterIndex: selectedChapter.index,
        chapterId: selectedChapter.id,
        pageCount: pageCount,
        downloadedAt: new Date().toISOString()
    };
    
    downloadedChapters.push(downloadItem);
    localStorage.setItem('downloadedChapters', JSON.stringify(downloadedChapters));
}

function showDownloads() {
    currentView = "downloads";
    updateActiveNav(downloadsBtn);
    
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
                        <div class="download-item" onclick="openReaderFromDownload('${d.mangaId}', ${d.chapterIndex})">
                            <span>Chapter ${d.chapterNumber}</span>
                            <small>${new Date(d.downloadedAt).toLocaleDateString()}</small>
                        </div>
                    `).join('')}
                </div>
            `;
            resultsContainer.appendChild(mangaDiv);
        });
    }
    
    mainContainer.style.display = 'block';
    detailsPage.style.display = 'none';
    readerPage.style.display = 'none';
}

// Helper function to open reader from downloads
window.openReaderFromDownload = async function(mangaId, chapterIndex) {
    const bookmark = bookmarks.find(b => b.id === mangaId);
    if (bookmark) {
        await openMangaDetails(mangaId, bookmark.title, bookmark);
        setTimeout(() => openChapterReader(chapterIndex), 500);
    } else {
        showToast('Please load the manga first', 'info');
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function handleScroll() {
    if (backToTop) {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
    
    if (mainContainer && mainContainer.style.display !== 'none' && 
        currentView !== 'bookmarks' && currentView !== 'downloads') {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (currentView === 'popular') {
                fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/popular`);
            } else if (currentView === 'trending') {
                fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/trending`);
            } else if (currentView === 'hot') {
                fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/hot`);
            } else if (currentView === 'recent') {
                fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/recent`);
            } else if (currentView === 'search' && currentQuery) {
                fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/${encodeURIComponent(currentQuery)}`);
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
    if (searchInput && searchInput.value.trim()) {
        currentQuery = searchInput.value.trim();
        currentView = "search";
        resetPagination();
        updateActiveNav(null);
        fetchManga(`${CONSUMET_URL}/manga/${MANGA_PROVIDER}/${encodeURIComponent(currentQuery)}`);
    } else {
        showToast('Please enter a search term', 'warning');
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
    const icon = themeToggle.querySelector('i');
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
