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
    
    try {
        // 1. Obtener token de streaming
        const episodeId = `${animeId}-${seasonNum}-${episodeNum}`;
        
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
