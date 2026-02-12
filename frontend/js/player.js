// ========================================
// CONFIGURACIÓN DE LA API
// ========================================
const API_BASE_URL = 'https://streanime-2.vercel.app/api';
// Para desarrollo local: const API_BASE_URL = 'http://localhost:3000/api';

// Bandera para evitar bucles infinitos en el historial
let isHandlingPopState = false;
let playerModalOpen = false;

// ========================================
// ABRIR REPRODUCTOR SEGURO CON GESTIÓN DE HISTORIAL
// ========================================
async function openSecurePlayer(animeName, episodeNum, seasonNum, animeId) {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    const playerTitle = document.getElementById('playerTitle');
    
    // Mostrar modal
    playerModal.style.display = 'flex';
    playerTitle.textContent = `${animeName} - Episodio ${episodeNum}`;
    playerModalOpen = true;
    
    try {
        // 1. Obtener token de streaming
        const episodeId = `${animeId}_${seasonNum}_${episodeNum}`;
        
        const tokenRes = await fetch(`${API_BASE_URL}/stream/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId })
        });
        
        if (!tokenRes.ok) {
            throw new Error('No se pudo obtener el token');
        }
        
        const { token } = await tokenRes.json();
        
        // 2. ABRIR IFRAME Y AGREGAR ESTADO AL HISTORIAL
        const iframeUrl = `/player.html?token=${encodeURIComponent(token)}&eid=${encodeURIComponent(episodeId)}&title=${encodeURIComponent(`${animeName} - Episodio ${episodeNum}`)}`;
        playerIframe.src = iframeUrl;
        
        // 3. PUSH AL HISTORIAL PARA PODER CERRAR CON BOTÓN ATRÁS
        if (!window.history.state || window.history.state.page !== 'player') {
            history.pushState(
                { 
                    page: 'player', 
                    animeId, 
                    seasonNum, 
                    episodeNum,
                    title: `${animeName} - Episodio ${episodeNum}`
                }, 
                '', 
                `#player-${animeId}-${seasonNum}-${episodeNum}`
            );
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar la reproducción.');
        closePlayer();
    }
}

// ========================================
// CERRAR REPRODUCTOR (SIN AFFECTAR HISTORIAL)
// ========================================
function closePlayer() {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    
    playerIframe.src = '';
    playerModal.style.display = 'none';
    playerModalOpen = false;
    
    // Eliminar el estado del player del historial SIN navegar
    if (window.history.state && window.history.state.page === 'player') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}

// ========================================
// MANEJAR EVENTO DE HISTORIAL (BOTÓN ATRÁS)
// ========================================
function setupPlayerHistory() {
    window.addEventListener('popstate', function(event) {
        // Evitar bucles infinitos
        if (isHandlingPopState) return;
        
        // Si el estado actual es 'player', cerrar el modal
        if (event.state && event.state.page === 'player') {
            isHandlingPopState = true;
            closePlayer();
            setTimeout(() => { isHandlingPopState = false; }, 100);
            return;
        }
        
        // Si estamos en el modal pero el estado no es 'player', cerrarlo
        if (playerModalOpen && (!event.state || event.state.page !== 'player')) {
            isHandlingPopState = true;
            closePlayer();
            setTimeout(() => { isHandlingPopState = false; }, 100);
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && playerModalOpen) {
            closePlayer();
        }
    });
}

// ========================================
// MANEJAR CLICKS EN EPISODIOS
// ========================================
function setupEpisodeClicks() {
    document.addEventListener('click', async (e) => {
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

// ========================================
// INICIALIZAR
// ========================================
setupEpisodeClicks();
setupPlayerHistory();

// Cerrar modal si se hace clic fuera del contenedor
document.getElementById('playerModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePlayer();
    }
});
