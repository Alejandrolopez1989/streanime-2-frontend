// ========================================
// ABRIR REPRODUCTOR SEGURO
// ========================================
async function openSecurePlayer(animeName, episodeNum, seasonNum, animeId) {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    const playerTitle = document.getElementById('playerTitle');
    
    // Mostrar modal
    playerModal.style.display = 'flex';
    playerTitle.textContent = `${animeName} - Episodio ${episodeNum}`;
    playerModalOpen = true; // Usa variable global de main.js
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
        
        // 2. Abrir iframe con el token
        const iframeUrl = `/player.html?token=${encodeURIComponent(token)}&eid=${encodeURIComponent(episodeId)}&title=${encodeURIComponent(`${animeName} - Episodio ${episodeNum}`)}`;
        playerIframe.src = iframeUrl;
        
        // 3. Agregar hash al historial (solo si no existe)
        if (!window.location.hash.includes('#player-')) {
            history.pushState(
                { page: 'player' }, 
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
// CERRAR REPRODUCTOR
// ========================================
function closePlayer() {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    
    playerIframe.src = '';
    playerModal.style.display = 'none';
    
    // Eliminar hash del player SIN agregar nuevo estado
    if (window.location.hash.startsWith('#player-')) {
        // Reemplazar el estado actual para eliminar el hash
        history.replaceState(
            window.history.state || { page: 'detail' }, 
            '', 
            window.location.pathname + window.location.search
        );
    }
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
// CERRAR CON TECLA ESCAPE
// ========================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && document.getElementById('playerModal').style.display === 'flex') {
        closePlayer();
    }
});

// ========================================
// CERRAR AL HACER CLIC FUERA DEL MODAL
// ========================================
document.getElementById('playerModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePlayer();
    }
});

// ========================================
// INICIALIZAR
// ========================================
setupEpisodeClicks();
