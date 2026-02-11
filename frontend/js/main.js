// ========================================
// CONFIGURACIÓN DE LA API
// ========================================
const API_BASE_URL = 'https://streanime-2.vercel.app/api';
// Para desarrollo local: const API_BASE_URL = 'http://localhost:3000/api';

// Variables de paginación
const CONTENT_PER_PAGE = 32;
let currentPage = 1;
let isInitialLoad = true;
let hasMoreContent = true;
let allAnimes = [];
let allContent = [];
let filteredContent = [];
let currentFilter = 'all';
let searchTerm = '';
let currentAnime = null;
let currentDayFilter = 'all';
let currentContentType = 'finished';

// DOM Elements
const contentGrid = document.getElementById('contentGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const totalContentSpan = document.getElementById('totalContent');
const showingContentSpan = document.getElementById('showingContent');
const homeLogo = document.getElementById('homeLogo');
const backToTop = document.getElementById('backToTop');
const mainContent = document.getElementById('mainContent');
const animeDetailSection = document.getElementById('animeDetailSection');
const breadcrumb = document.getElementById('breadcrumb');
const backToAnimeList = document.getElementById('backToAnimeList');
const finishedBtn = document.getElementById('finishedBtn');
const airingBtn = document.getElementById('airingBtn');
const daysSection = document.getElementById('daysSection');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================
function generateRedColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 20);
    const saturation = 70 + Math.abs(hash % 20);
    const lightness = 20 + Math.abs(hash % 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getInitials(name) {
    const words = name.split(' ');
    if (words.length >= 2) {
        return words[0].charAt(0) + words[1].charAt(0);
    } else if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
    } else {
        return name.charAt(0).toUpperCase() + 'X';
    }
}

// ========================================
// CARGAR ANIMES DESDE LA API
// ========================================
async function loadAnimesFromAPI(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/animes/${type}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.success && Array.isArray(data.animes)) {
            return data.animes;
        } else {
            console.error('Estructura de datos incorrecta:', data);
            return [];
        }
    } catch (error) {
        console.error('Error al cargar animes desde API:', error);
        alert(`Error al cargar los animes: ${error.message}\nVerifica la consola para más detalles.`);
        return [];
    }
}

// ========================================
// CARGAR CONTENIDO POR TIPO
// ========================================
async function loadContentByType(type) {
    currentContentType = type;
    const isAiring = type === 'airing';

    // Actualizar UI
    document.body.classList.remove('airing-mode', 'finished-mode');
    document.body.classList.add(isAiring ? 'airing-mode' : 'finished-mode');
    
    if (daysSection) {
        daysSection.style.display = isAiring ? 'block' : 'none';
    }
    
    const yearFilterControls = document.getElementById('yearFilterControls');
    if (yearFilterControls) {
        yearFilterControls.style.display = isAiring ? 'none' : 'flex';
    }
    
    const contentTypeLabel = document.getElementById('contentTypeLabel');
    if (contentTypeLabel) {
        contentTypeLabel.textContent = isAiring ? 'Animes en Emisión' : 'Animes Finalizados';
    }

    // Mostrar loading
    if (isInitialLoad) {
        contentGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando animes...</p>
            </div>
        `;
    }

    try {
        // Cargar datos desde API
        const animes = await loadAnimesFromAPI(type);
        allAnimes = animes;

        if (allAnimes.length === 0) {
            contentGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-red); margin-bottom: 20px;"></i>
                    <h3>No hay animes disponibles</h3>
                    <p>${isAiring ? 'No hay animes en emisión actualmente' : 'No hay animes finalizados en la base de datos'}</p>
                </div>
            `;
            totalContentSpan.textContent = '0';
            showingContentSpan.textContent = '0';
            return;
        }

        // Convertir a formato de contenido básico
        allContent = allAnimes.map(anime => ({
            id: anime.id,
            originalName: anime.name,
            cleanName: anime.name,
            year: parseInt(anime.year) || 0,
            day: anime.day || null,
            type: 'animes',
            index: anime.id,
            isAiring: isAiring
        }));

        // Ordenar
        allAnimes.sort((a, b) => a.name.localeCompare(b.name));
        allContent.sort((a, b) => a.cleanName.localeCompare(b.cleanName));

        // Actualizar estadísticas
        totalContentSpan.textContent = allAnimes.length;
        showingContentSpan.textContent = allContent.length;

        // Actualizar filtros de año (solo finalizados)
        if (!isAiring) {
            updateYearFilters(allAnimes);
        }

        // Resetear filtros
        currentFilter = 'all';
        currentPage = 1;
        isInitialLoad = true;
        hasMoreContent = true;
        
        if (isAiring) {
            currentDayFilter = 'all';
            document.querySelectorAll('.day-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-day') === 'all');
            });
        }

        applyFilter('all');
        renderContent(1);
        
    } catch (error) {
        console.error('Error fatal en loadContentByType:', error);
        contentGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6666;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3>Error al cargar los animes</h3>
                <p>${error.message || 'Verifica la consola del navegador para más detalles'}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--danger-red); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// ========================================
// FILTROS Y RENDERIZADO (igual que antes)
// ========================================
function updateYearFilters(animes) {
    const yearFilterControls = document.getElementById('yearFilterControls');
    if (!yearFilterControls) return;

    const years = new Set();
    animes.forEach(anime => {
        if (anime.year && !isNaN(anime.year)) {
            years.add(parseInt(anime.year));
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    let filterHTML = '<button class="filter-btn active" data-filter="all">Todos</button>';
    
    sortedYears.forEach(year => {
        filterHTML += `<button class="filter-btn" data-filter="${year}">${year}</button>`;
    });

    yearFilterControls.innerHTML = filterHTML;
    setupYearFilterListeners();
}

function setupYearFilterListeners() {
    document.querySelectorAll('#yearFilterControls .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#yearFilterControls .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            currentPage = 1;
            isInitialLoad = true;
            applyFilter(currentFilter);
            renderContent(1);
        });
    });
}

function applyFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    hasMoreContent = true;
    let filtered = [...allContent];

    // Filtro por año
    if (filter !== 'all' && !isNaN(parseInt(filter))) {
        const year = parseInt(filter);
        filtered = filtered.filter(item => item.year === year);
    }

    // Filtro por día (solo emisión)
    if (currentDayFilter !== 'all' && currentContentType === 'airing') {
        filtered = filtered.filter(item => {
            const anime = allAnimes.find(a => a.id === item.id);
            return anime && anime.day === currentDayFilter;
        });
    }

    // Búsqueda
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
            item.cleanName.toLowerCase().includes(term) ||
            item.originalName.toLowerCase().includes(term)
        );
    }

    filteredContent = filtered;
    filteredContent.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
    updateDayStats();
}

function updateDayStats() {
    const contentTypeLabel = document.getElementById('contentTypeLabel');
    if (!contentTypeLabel) return;

    if (currentDayFilter !== 'all' && currentContentType === 'airing') {
        contentTypeLabel.textContent = `Animes del ${currentDayFilter}`;
    } else {
        contentTypeLabel.textContent = currentContentType === 'airing' 
            ? 'Animes en Emisión' 
            : 'Animes Finalizados';
    }
}

function getContentForPage(page = 1) {
    const startIndex = (page - 1) * CONTENT_PER_PAGE;
    const endIndex = startIndex + CONTENT_PER_PAGE;
    hasMoreContent = endIndex < filteredContent.length;
    return filteredContent.slice(startIndex, endIndex);
}

function renderContent(page = 1, append = false) {
    const contentToShow = getContentForPage(page);
    
    if (!append) {
        contentGrid.innerHTML = '';
        if (contentToShow.length === 0 && !isInitialLoad) {
            contentGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--danger-red); margin-bottom: 20px;"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otro término de búsqueda o filtro</p>
                </div>
            `;
            showingContentSpan.textContent = '0';
            updateLoadMoreButton();
            return;
        }
    }

    const totalShowing = append 
        ? document.querySelectorAll('.content-card').length + contentToShow.length 
        : contentToShow.length;
    
    showingContentSpan.textContent = totalShowing;

    contentToShow.forEach(item => {
        const bgColor = generateRedColorFromString(item.cleanName);
        const initials = getInitials(item.cleanName);
        const anime = allAnimes.find(a => a.id === item.id);
        if (!anime) return;

        const seasonCount = anime.seasons?.length || 0;
        const episodeCount = anime.seasons?.reduce((sum, s) => sum + (s.episodes?.length || 0), 0) || 0;
        const isAiringItem = anime.isAiring || false;

        const contentCard = document.createElement('div');
        contentCard.className = 'content-card';
        contentCard.dataset.type = 'animes';
        contentCard.dataset.id = item.id;
        contentCard.dataset.animeName = anime.name;

        contentCard.innerHTML = `
            <div class="content-poster" style="background-color: ${bgColor};">
                ${isAiringItem 
                    ? '<div class="airing-badge">EN EMISIÓN</div>' 
                    : '<div class="finished-badge">FINALIZADO</div>'
                }
                ${isAiringItem && anime.day ? `<div class="day-badge">${anime.day}</div>` : ''}
                <div class="poster-placeholder" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 3rem; font-weight: bold; color: white;">
                    ${initials}
                </div>
            </div>
            <div class="content-info">
                <span class="content-type ${isAiringItem ? 'airing' : 'finished'}">
                    <i class="fas ${isAiringItem ? 'fa-broadcast-tower' : 'fa-flag-checkered'}"></i>
                    ${isAiringItem ? 'En Emisión' : 'Finalizado'}
                </span>
                <h3 class="content-title">${item.cleanName}</h3>
                <div class="content-meta">
                    ${seasonCount > 0 ? `<span><i class="fas fa-layer-group"></i> ${seasonCount} Temporada${seasonCount !== 1 ? 's' : ''}</span>` : ''}
                    ${episodeCount > 0 ? `<span><i class="fas fa-play-circle"></i> ${episodeCount} Episodio${episodeCount !== 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
        `;

        contentCard.addEventListener('click', () => {
            showAnimeDetail(item.id);
        });

        contentGrid.appendChild(contentCard);
    });

    isInitialLoad = false;
    updateLoadMoreButton();

    if (page === 1 && !append) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========================================
// DETALLE DE ANIME Y OTRAS FUNCIONES
// ========================================
// (Las funciones showAnimeDetail, renderSeasons, renderEpisodes, etc. se mantienen igual que en tu código anterior)
// Para ahorrar espacio, aquí solo incluyo las críticas. Las demás funciones deben mantenerse.

function showAnimeDetail(animeId) {
    const anime = allAnimes.find(a => a.id === animeId);
    if (!anime) {
        alert('Anime no encontrado');
        return;
    }
    // ... resto de la función (igual que tu código anterior)
    currentAnime = anime;
    // ... actualizar UI
    renderSeasons(anime);
}

function renderSeasons(anime) {
    const seasonsContainer = document.getElementById('seasonsContainer');
    seasonsContainer.innerHTML = '';
    
    if (!anime.seasons || anime.seasons.length === 0) {
        seasonsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ff6666">No hay episodios disponibles</div>`;
        return;
    }
    
    anime.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    anime.seasons.forEach((season, idx) => {
        const seasonId = `season-${anime.id}-${idx + 1}`;
        const seasonCard = document.createElement('div');
        seasonCard.className = 'season-card';
        seasonCard.innerHTML = `
            <div class="season-header">
                <h3 class="season-title">Temporada ${season.seasonNumber}</h3>
                <span class="episode-count">${season.episodes?.length || 0} Episodios</span>
            </div>
            <div class="episodes-grid" id="${seasonId}"></div>
        `;
        seasonsContainer.appendChild(seasonCard);
        renderEpisodes(season, seasonId, anime);
    });
}

function renderEpisodes(season, seasonId, anime) {
    const episodesGrid = document.getElementById(seasonId);
    if (!episodesGrid || !season.episodes) return;
    
    season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    season.episodes.forEach(episode => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'episode-card';
        episodeCard.dataset.animeName = anime.name;
        episodeCard.dataset.episodeNum = episode.episodeNumber;
        episodeCard.dataset.seasonNum = season.seasonNumber;
        episodeCard.dataset.animeId = anime.id;
        episodeCard.dataset.episodeId = `${anime.id}-${season.seasonNumber}-${episode.episodeNumber}`;
        
        episodeCard.innerHTML = `
            <div class="episode-poster">
                <div class="episode-number">${episode.episodeNumber}</div>
                <div class="episode-play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="episode-info">
                <div class="episode-title-full">${anime.name} - Episodio ${episode.episodeNumber}</div>
                <div class="episode-meta">
                    <span class="episode-duration"><i class="far fa-clock"></i> 24 min</span>
                    <span class="episode-file">${episode.fileName || 'archivo.mp4'}</span>
                </div>
            </div>
        `;
        episodesGrid.appendChild(episodeCard);
    });
}

function backToAnimes() {
    document.body.classList.remove('detail-page');
    mainContent.style.display = 'block';
    animeDetailSection.style.display = 'none';
    breadcrumb.style.display = 'none';
    currentAnime = null;
    history.replaceState({ page: 'main' }, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateLoadMoreButton() {
    if (!loadMoreBtn || !document.getElementById('paginationContainer')) return;
    
    if (hasMoreContent) {
        loadMoreBtn.style.display = 'flex';
        document.getElementById('paginationContainer').style.display = 'block';
        const remaining = filteredContent.length - (currentPage * CONTENT_PER_PAGE);
        loadMoreBtn.innerHTML = `
            <i class="fas fa-plus"></i>
            Ver ${Math.min(CONTENT_PER_PAGE, remaining)} más
            (${remaining} restantes)
        `;
    } else {
        loadMoreBtn.style.display = 'none';
        if (filteredContent.length > CONTENT_PER_PAGE) {
            document.getElementById('paginationContainer').innerHTML = `
                <div style="color: var(--danger-red); padding: 15px; border-radius: 10px; background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2); text-align: center;">
                    <i class="fas fa-check-circle"></i>
                    <p>¡Has visto todos los animes! (${filteredContent.length} en total)</p>
                </div>
            `;
        }
    }
}

function loadMoreContent() {
    if (!hasMoreContent || !loadMoreBtn) return;
    currentPage++;
    const originalHTML = loadMoreBtn.innerHTML;
    loadMoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Cargando...`;
    loadMoreBtn.disabled = true;
    
    setTimeout(() => {
        renderContent(currentPage, true);
        loadMoreBtn.innerHTML = originalHTML;
        loadMoreBtn.disabled = false;
    }, 300);
}

// ========================================
// INICIALIZACIÓN
// ========================================
function setupEventListeners() {
    // Botones de tipo
    if (finishedBtn && airingBtn) {
        finishedBtn.addEventListener('click', () => {
            if (currentContentType === 'finished') return;
            finishedBtn.className = 'type-selector-btn active finished';
            airingBtn.className = 'type-selector-btn finished';
            loadContentByType('finished');
        });
        airingBtn.addEventListener('click', () => {
            if (currentContentType === 'airing') return;
            airingBtn.className = 'type-selector-btn active airing';
            finishedBtn.className = 'type-selector-btn airing';
            loadContentByType('airing');
        });
    }
    
    // Búsqueda
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            searchTerm = searchInput.value.trim();
            currentPage = 1;
            isInitialLoad = true;
            applyFilter(currentFilter);
            renderContent(1);
        });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchTerm = searchInput.value.trim();
                currentPage = 1;
                isInitialLoad = true;
                applyFilter(currentFilter);
                renderContent(1);
            }
        });
    }
    
    // Botones de día
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentContentType !== 'airing') return;
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDayFilter = btn.getAttribute('data-day');
            currentPage = 1;
            isInitialLoad = true;
            applyFilter(currentFilter);
            renderContent(1);
        });
    });
    
    // Botón "Ver más"
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreContent);
    }
    
    // Logo y breadcrumb
    if (homeLogo) {
        homeLogo.addEventListener('click', () => {
            if (currentAnime) backToAnimes();
            else resetToHome();
        });
    }
    if (backToAnimeList) {
        backToAnimeList.addEventListener('click', backToAnimes);
    }
    const breadcrumbHome = document.getElementById('breadcrumbHome');
    if (breadcrumbHome) {
        breadcrumbHome.addEventListener('click', (e) => {
            e.preventDefault();
            resetToHome();
        });
    }
    
    // Delegación de eventos para episodios
    document.addEventListener('click', (e) => {
        const episodeCard = e.target.closest('.episode-card');
        if (episodeCard) {
            e.preventDefault();
            const animeName = episodeCard.dataset.animeName;
            const episodeNum = episodeCard.dataset.episodeNum;
            const seasonNum = episodeCard.dataset.seasonNum;
            const animeId = episodeCard.dataset.animeId;
            openSecurePlayer(animeName, episodeNum, seasonNum, animeId);
        }
    });
}

function resetToHome() {
    searchInput.value = '';
    searchTerm = '';
    currentPage = 1;
    currentFilter = 'all';
    isInitialLoad = true;
    hasMoreContent = true;
    if (currentAnime) backToAnimes();
    loadContentByType(currentContentType);
    history.replaceState({ page: 'main' }, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupBackToTop() {
    window.addEventListener('scroll', () => {
        backToTop?.classList.toggle('show', window.scrollY > 300);
    });
    backToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function init() {
    console.log("🚀 Inicializando aplicación...");
    setupEventListeners();
    setupBackToTop();
    setupYearFilterListeners();
    loadContentByType('finished'); // Cargar finalizados por defecto
    console.log("✅ Aplicación inicializada correctamente");
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
