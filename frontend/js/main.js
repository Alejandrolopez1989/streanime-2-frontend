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
let currentContentType = 'airing'; // 'finished' o 'airing'

// ========================================
// DOM Elements
// ========================================
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

// Generar color rojo basado en un string
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

// Obtener iniciales para la portada
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

// Cargar animes desde la API
async function loadAnimesFromAPI(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/animes/${type}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        // El backend devuelve 'processed' en lugar de 'animes'
        if (data.success && Array.isArray(data.processed)) {
            return data.processed;
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

// Cargar contenido según el tipo seleccionado
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
// FILTROS Y RENDERIZADO
// ========================================

// Actualizar filtros de año dinámicamente
function updateYearFilters(animes) {
    const yearFilterControls = document.getElementById('yearFilterControls');
    if (!yearFilterControls) return;

    // Obtener todos los años únicos
    const years = new Set();
    animes.forEach(anime => {
        if (anime.year && !isNaN(anime.year)) {
            years.add(parseInt(anime.year));
        }
    });

    // Ordenar descendente
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Crear botones de filtro
    let filterHTML = '<button class="filter-btn active" data-filter="all">Todos</button>';
    
    sortedYears.forEach(year => {
        filterHTML += `<button class="filter-btn" data-filter="${year}">${year}</button>`;
    });

    yearFilterControls.innerHTML = filterHTML;
    setupYearFilterListeners();
}

// Configurar event listeners para filtros de año
function setupYearFilterListeners() {
    const filterBtns = document.querySelectorAll('#yearFilterControls .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            currentPage = 1;
            isInitialLoad = true;
            applyFilter(filter);
            renderContent(1);
        });
    });
}

// Aplicar filtro al contenido
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

// Actualizar estadísticas con filtro de día
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

// Obtener contenido para la página actual
function getContentForPage(page = 1) {
    const startIndex = (page - 1) * CONTENT_PER_PAGE;
    const endIndex = startIndex + CONTENT_PER_PAGE;
    hasMoreContent = endIndex < filteredContent.length;
    return filteredContent.slice(startIndex, endIndex);
}

// Renderizar contenido en el grid
function renderContent(page = 1, append = false) {
    const contentToShow = getContentForPage(page);
    
    if (!append) {
        contentGrid.innerHTML = '';
        if (isInitialLoad && contentToShow.length === 0) {
            contentGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando animes...</p>
                </div>
            `;
            return;
        }
    }

    if (contentToShow.length === 0 && !append) {
        contentGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-tv" style="font-size: 3rem; color: var(--danger-red); margin-bottom: 20px;"></i>
                <h3>No se encontraron animes</h3>
                <p>${currentDayFilter !== 'all' && currentContentType === 'airing' ? `No hay animes que se emitan los ${currentDayFilter}` : 'Intenta con otro término de búsqueda o filtro'}</p>
            </div>
        `;
        showingContentSpan.textContent = '0';
        updateLoadMoreButton();
        return;
    }

    const totalShowing = append
        ? document.querySelectorAll('.content-card').length + contentToShow.length
        : contentToShow.length;
    showingContentSpan.textContent = totalShowing;

    contentToShow.forEach(item => {
        const anime = allAnimes.find(a => a.id === item.id);
        if (!anime) return;
        
        const seasonCount = anime.seasons?.length || 0;
        const episodeCount = anime.seasons?.reduce((sum, s) => sum + (s.episodes?.length || 0), 0) || 0;
        const isAiringItem = anime.isAiring || false;
        const hasImage = anime.image || anime.thumbnail;

        const contentCard = document.createElement('div');
        contentCard.className = 'content-card';
        contentCard.dataset.type = 'animes';
        contentCard.dataset.id = item.id;
        contentCard.dataset.animeName = anime.name;

        // Usar imagen de Jikan si está disponible, sino usar iniciales
        let posterContent = '';
        if (hasImage) {
            posterContent = `<img src="${anime.image || anime.thumbnail}" alt="${anime.name}" class="poster-image" onerror="this.style.display='none'; this.parentElement.querySelector('.poster-placeholder').style.display='flex'">`;
        } else {
            const bgColor = generateRedColorFromString(item.cleanName);
            const initials = getInitials(item.cleanName);
            posterContent = `
                <div class="poster-placeholder" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 3rem; font-weight: bold; color: white; background-color: ${bgColor};">
                    ${initials}
                </div>
            `;
        }

        contentCard.innerHTML = `
            <div class="content-poster">
                ${isAiringItem ?
                    '<div class="airing-badge">EN EMISIÓN</div>' :
                    '<div class="finished-badge">FINALIZADO</div>'
                }
                ${isAiringItem && anime.day ? `<div class="day-badge">${anime.day}</div>` : ''}
                ${posterContent}
            </div>
            <div class="content-info">
                <span class="content-type ${isAiringItem ? 'airing' : 'finished'}">
                    <i class="fas ${isAiringItem ? 'fa-broadcast-tower' : 'fa-flag-checkered'}"></i>
                    ${isAiringItem ? 'En Emisión' : 'Finalizado'}
                </span>
                <h3 class="content-title">${item.cleanName}</h3>
                <div class="content-meta">
                    ${anime.score > 0 ? `<span><i class="fas fa-star"></i> ${anime.score.toFixed(1)}</span>` : ''}
                    ${seasonCount > 0 ? `<span><i class="fas fa-layer-group"></i> ${seasonCount}T</span>` : ''}
                    ${episodeCount > 0 ? `<span><i class="fas fa-play-circle"></i> ${episodeCount}E</span>` : ''}
                </div>
                ${anime.genres && anime.genres.length > 0 ? `
                    <div class="content-genres">
                        ${anime.genres.slice(0, 3).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        contentCard.addEventListener('click', () => {
            console.log('🔍 Clic en tarjeta:', item.id);
            showAnimeDetail(item.id);
        });

        contentGrid.appendChild(contentCard);
    });

    isInitialLoad = false;
    updateLoadMoreButton();

    // CONFIGURAR EVENTOS DE CLIC PARA LAS TARJETAS NUEVAS
    setupCardClickEvents();

    if (page === 1 && !append) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Configurar eventos de clic para las tarjetas de anime
function setupCardClickEvents() {
    // Remover eventos anteriores para evitar duplicados
    const cards = document.querySelectorAll('.content-card');
    cards.forEach(card => {
        // Remover el evento anterior si existe
        const clone = card.cloneNode(true);
        card.parentNode.replaceChild(clone, card);
    });

    // Agregar nuevos eventos
    document.querySelectorAll('.content-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const animeId = card.dataset.id;
            if (animeId) {
                console.log('🔍 Clic en tarjeta:', animeId);
                showAnimeDetail(animeId);
            }
        });
    });
}

// Actualizar botón de cargar más
function updateLoadMoreButton() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!loadMoreBtn || !paginationContainer) return;

    if (hasMoreContent) {
        loadMoreBtn.style.display = 'flex';
        paginationContainer.style.display = 'block';
        const remaining = filteredContent.length - (currentPage * CONTENT_PER_PAGE);
        loadMoreBtn.innerHTML = `
            <i class="fas fa-plus"></i>
            Ver ${Math.min(CONTENT_PER_PAGE, remaining)} más
            (${remaining} restantes)
        `;
    } else {
        loadMoreBtn.style.display = 'none';
        if (filteredContent.length > CONTENT_PER_PAGE) {
            paginationContainer.innerHTML = `
                <div style="color: var(--danger-red); padding: 15px; border-radius: 10px; background-color: rgba(255, 0, 0, 0.1); border: 1px solid rgba(255, 0, 0, 0.2);">
                    <i class="fas fa-check-circle"></i>
                    <p>¡Has visto todos los animes! (${filteredContent.length} animes en total)</p>
                </div>
            `;
        }
    }
}

// ========================================
// DETALLE DE ANIME
// ========================================

// Mostrar detalle de anime
async function showAnimeDetail(animeId) {
    console.log('🔍 Mostrando detalle del anime:', animeId);
    
    const anime = allAnimes.find(a => a.id === animeId);
    if (!anime) {
        console.error('❌ Anime no encontrado:', animeId);
        alert('Error: No se pudo cargar la información del anime.');
        return;
    }
    
    console.log('✅ Anime encontrado:', anime.name);
    
    currentAnime = anime;
    history.pushState({ page: 'detail', animeId: animeId }, '', `#anime-${animeId}`);

    // Cambiar a modo detalle
    document.body.classList.add('detail-page');
    mainContent.style.display = 'none';
    animeDetailSection.style.display = 'block';
    breadcrumb.style.display = 'block';

    // Actualizar breadcrumb
    document.getElementById('breadcrumbAnimeTitle').textContent = anime.name;

    // Actualizar información del anime
    document.getElementById('animeDetailTitle').textContent = anime.name;
    document.getElementById('animeDetailYear').textContent = anime.year || 'Año no disponible';
    
    if (anime.isAiring && anime.day) {
        document.getElementById('animeDetailYear').textContent += ` • ${anime.day}`;
    }

    const totalEpisodes = anime.seasons.reduce((total, season) => 
        total + (season.episodes ? season.episodes.length : 0), 0);
    document.getElementById('animeDetailSeasons').textContent = 
        `${anime.seasons.length} Temporada${anime.seasons.length > 1 ? 's' : ''}`;
    document.getElementById('animeDetailEpisodes').textContent = 
        `${totalEpisodes} Episodio${totalEpisodes > 1 ? 's' : ''}`;

    // Mostrar información de Jikan si está disponible
    let description = anime.synopsis || `${anime.name} es ${anime.isAiring ? 'un anime actualmente en emisión' : 'un anime que ha finalizado su emisión'}. Disfruta de todos los episodios disponibles en nuestra plataforma.`;

    if (anime.genres && anime.genres.length > 0) {
        description += `\n\n<strong>Géneros:</strong> ${anime.genres.join(', ')}`;
    }

    if (anime.score > 0) {
        description += `\n<strong>Puntuación:</strong> ${anime.score.toFixed(1)}/10 ⭐`;
    }

    if (anime.status) {
        description += `\n<strong>Estado:</strong> ${anime.status}`;
    }

    if (anime.rating && anime.rating !== 'N/A') {
        description += `\n<strong>Clasificación:</strong> ${anime.rating}`;
    }

    document.getElementById('animeDetailDescription').innerHTML = description.replace(/\n/g, '<br>');

    // Renderizar temporadas
    renderSeasons(anime);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Renderizar temporadas
function renderSeasons(anime) {
    const seasonsContainer = document.getElementById('seasonsContainer');
    seasonsContainer.innerHTML = '';

    if (!anime.seasons || anime.seasons.length === 0) {
        seasonsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff9999; background-color: rgba(26, 0, 0, 0.5); border-radius: 10px; border: 1px solid rgba(255, 51, 51, 0.3);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 20px; color: var(--danger-red);"></i>
                <h3 style="margin-bottom: 10px;">No hay episodios disponibles</h3>
                <p>Próximamente se agregarán los episodios de este anime.</p>
            </div>
        `;
        return;
    }

    anime.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    let seasonCounter = 0;

    anime.seasons.forEach(season => {
        seasonCounter++;
        const seasonId = `season-${anime.id}-${seasonCounter}`;
        const seasonCard = document.createElement('div');
        seasonCard.className = 'season-card';
        seasonCard.innerHTML = `
            <div class="season-header">
                <h3 class="season-title">Temporada ${season.seasonNumber}</h3>
                <span class="episode-count">${season.episodes.length} Episodio${season.episodes.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="episodes-grid" id="${seasonId}">
                <!-- Los episodios se cargarán aquí -->
            </div>
        `;
        seasonsContainer.appendChild(seasonCard);
        renderEpisodes(season, seasonId, anime);
    });
}

// Renderizar episodios
function renderEpisodes(season, seasonId, anime) {
    const episodesGrid = document.getElementById(seasonId);
    if (!episodesGrid) return;

    if (!season.episodes || season.episodes.length === 0) {
        episodesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #ff9999; font-style: italic;">
                <i class="fas fa-info-circle"></i> No hay episodios disponibles para esta temporada
            </div>
        `;
        return;
    }

    season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    season.episodes.forEach(episode => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'episode-card';
        episodeCard.dataset.animeName = anime.name;
        episodeCard.dataset.episodeNum = episode.episodeNumber;
        episodeCard.dataset.seasonNum = season.seasonNumber;
        episodeCard.dataset.animeId = anime.id;
        episodeCard.dataset.episodeId = `${anime.id}_${season.seasonNumber}_${episode.episodeNumber}`;

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
                    <span class="episode-file">${episode.fileName}</span>
                </div>
            </div>
        `;

        episodesGrid.appendChild(episodeCard);
    });
}

// Volver al listado
function backToAnimes() {
    document.body.classList.remove('detail-page');
    mainContent.style.display = 'block';
    animeDetailSection.style.display = 'none';
    breadcrumb.style.display = 'none';
    currentAnime = null;
    history.replaceState({ page: 'main' }, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// BOTÓN CARGAR MÁS
// ========================================

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
// EVENT LISTENERS
// ========================================

// Configurar botones de días
function setupDaysEvents() {
    const dayBtns = document.querySelectorAll('.day-btn');
    dayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentContentType !== 'airing') return;
            dayBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const day = btn.getAttribute('data-day');
            currentDayFilter = day;
            currentPage = 1;
            isInitialLoad = true;
            applyFilter(currentFilter);
            renderContent(1);
        });
    });
}

// Configurar botón de "Ver más"
function setupLoadMoreButton() {
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreContent);
    }
}

// Configurar selector de tipo
function setupTypeSelector() {
    if (finishedBtn && airingBtn) {
        finishedBtn.addEventListener('click', () => {
            if (currentContentType === 'finished') return;
            finishedBtn.classList.remove('active');
            finishedBtn.classList.add('finished');
            airingBtn.classList.remove('airing');
            airingBtn.classList.add('active', 'airing');
            loadContentByType('finished');
        });
        airingBtn.addEventListener('click', () => {
            if (currentContentType === 'airing') return;
            airingBtn.classList.remove('active');
            airingBtn.classList.add('airing');
            finishedBtn.classList.remove('finished');
            finishedBtn.classList.add('active', 'finished');
            loadContentByType('airing');
        });
    }
}

// Configurar búsqueda
function setupSearch() {
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
}

// Configurar logo de inicio
function setupHomeLogo() {
    if (homeLogo) {
        homeLogo.addEventListener('click', () => {
            resetToHome();
        });
        homeLogo.addEventListener('dblclick', () => {
            resetToHome();
            homeLogo.style.transform = 'scale(1.1)';
            setTimeout(() => {
                homeLogo.style.transform = 'scale(1)';
            }, 300);
        });
    }
}

// Configurar botón volver a animes
function setupBackButton() {
    if (backToAnimeList) {
        backToAnimeList.addEventListener('click', backToAnimes);
    }
}

// Configurar breadcrumb
function setupBreadcrumb() {
    const breadcrumbHome = document.getElementById('breadcrumbHome');
    if (breadcrumbHome) {
        breadcrumbHome.addEventListener('click', (e) => {
            e.preventDefault();
            resetToHome();
        });
    }
}

// Resetear a inicio
function resetToHome() {
    searchInput.value = '';
    searchTerm = '';
    currentPage = 1;
    currentFilter = 'all';
    isInitialLoad = true;
    hasMoreContent = true;

    if (currentAnime) {
        backToAnimes();
    }

    loadContentByType(currentContentType);
    history.replaceState({ page: 'main' }, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Configurar botón de volver arriba
function setupBackToTop() {
    if (!backToTop) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Configurar manejo del historial
function setupHistoryManagement() {
    window.addEventListener('popstate', function(event) {
        if (document.body.classList.contains('detail-page')) {
            backToAnimes();
        }
    });

    if (window.location.hash && window.location.hash.startsWith('#anime-')) {
        const animeId = window.location.hash.replace('#anime-', '');
        setTimeout(() => {
            const anime = allAnimes.find(a => a.id === animeId);
            if (anime) {
                history.replaceState({ page: 'detail', animeId: animeId }, '', `#anime-${animeId}`);
                showAnimeDetail(animeId);
            }
        }, 500);
    }

    history.replaceState({ page: 'main' }, '', window.location.pathname);
}

// ========================================
// INICIALIZACIÓN
// ========================================

function init() {
    console.log("🚀 Inicializando aplicación...");
    
    // Cargar contenido inicial (EN EMISIÓN por defecto)
    loadContentByType('airing');
    
    // Configurar eventos
    setupDaysEvents();
    setupLoadMoreButton();
    setupTypeSelector();
    setupSearch();
    setupHomeLogo();
    setupBackButton();
    setupBreadcrumb();
    setupBackToTop();
    setupHistoryManagement();

    console.log("✅ Aplicación inicializada correctamente");
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', init);
