document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sugerenciasDiv = document.getElementById('sugerencias');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const card = document.getElementById('digimonCard');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const favoritesList = document.getElementById('favoritesList');
    const historyList = document.getElementById('historyList');

    let debounceTimer;
    let currentDigimon = null;

    // Initialize app
    loadFavorites();
    loadHistory();

    // Mostrar sugerencias mientras se escribe
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearTimeout(debounceTimer);

        if (query.length === 0) {
            ocultarSugerencias();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`https://digi-api.com/api/v1/digimon?name=${encodeURIComponent(query)}&pageSize=5`);
                if (!response.ok) {
                    ocultarSugerencias();
                    return;
                }
                const data = await response.json();
                mostrarSugerencias(data.content || []);
            } catch (err) {
                console.error('Error al obtener sugerencias:', err);
                ocultarSugerencias();
            }
        }, 300);
    });

    function mostrarSugerencias(digimons) {
        if (digimons.length === 0) {
            ocultarSugerencias();
            return;
        }

        sugerenciasDiv.innerHTML = '';
        digimons.forEach(d => {
            const item = document.createElement('div');
            item.textContent = d.name;
            item.dataset.id = d.id;
            item.dataset.name = d.name;
            item.addEventListener('click', () => {
                searchInput.value = d.name;
                ocultarSugerencias();
                buscarDigimon(d.name);
            });
            sugerenciasDiv.appendChild(item);
        });
        sugerenciasDiv.classList.add('show');
    }

    function ocultarSugerencias() {
        sugerenciasDiv.classList.remove('show');
        sugerenciasDiv.innerHTML = '';
    }

    // Cerrar sugerencias si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !sugerenciasDiv.contains(e.target)) {
            ocultarSugerencias();
        }
    });

    // Función principal de búsqueda
    async function buscarDigimon(nombre) {
        if (!nombre.trim()) {
            mostrarError('Por favor, ingresa el nombre de un Digimon.');
            return;
        }

        errorDiv.textContent = '';
        card.classList.remove('show');
        mostrarLoading(true);

        try {
            const response = await fetch(`https://digi-api.com/api/v1/digimon/${encodeURIComponent(nombre)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    mostrarError('Digimon no encontrado. ¿Está bien escrito el nombre?');
                } else {
                    mostrarError('Error al conectar con la API. Inténtalo más tarde.');
                }
                mostrarLoading(false);
                return;
            }

            const data = await response.json();
            currentDigimon = data;
            addToHistory(data.name);
            mostrarDigimon(data);
        } catch (err) {
            console.error(err);
            mostrarError('Error inesperado. Revisa tu conexión.');
        } finally {
            mostrarLoading(false);
        }
    }

    async function mostrarDigimon(digimon) {
        document.getElementById('nombre').textContent = digimon.name || '—';
        document.getElementById('id').textContent = digimon.id || '—';
        document.getElementById('nivel').textContent = digimon.level?.name || '—';
        document.getElementById('tipo').textContent = digimon.types?.map(t => t.type).join(', ') || '—';
        document.getElementById('atributo').textContent = digimon.attribute?.name || '—';
        document.getElementById('descripcion').textContent = digimon.description || 'Sin descripción.';

        // Update favorite button
        updateFavoriteButton(digimon.name);

        // Imagen principal del Digimon
        const img = document.getElementById('imagen');
        if (digimon.images && digimon.images.length > 0) {
            img.src = digimon.images[0].href;
            img.alt = `Imagen de ${digimon.name}`;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }

        // Habilidades
        const habilidadesList = document.getElementById('habilidades');
        habilidadesList.innerHTML = '';
        if (digimon.skills && digimon.skills.length > 0) {
            digimon.skills.forEach(skill => {
                const li = document.createElement('li');
                li.textContent = `${skill.skill}${skill.description ? ' — ' + skill.description : ''}`;
                habilidadesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Ninguna registrada.';
            habilidadesList.appendChild(li);
        }

        // Renderizar campos con imágenes
        const camposContainer = document.getElementById('camposContainer');
        camposContainer.innerHTML = '';

        if (digimon.fields && digimon.fields.length > 0) {
            const fieldPromises = digimon.fields.map(async (fieldRef) => {
                try {
                    const res = await fetch(`https://digi-api.com/api/v1/field/${fieldRef.id}`);
                    if (res.ok) {
                        return await res.json();
                    }
                } catch (err) {
                    console.warn('Error al cargar field:', fieldRef.id, err);
                }
                return null;
            });

            const fieldsWithData = await Promise.all(fieldPromises);

            fieldsWithData.forEach(field => {
                if (!field) return;

                const campoDiv = document.createElement('div');
                campoDiv.className = 'campo-item';

                const imgField = document.createElement('img');
                imgField.src = field.image || '';
                imgField.alt = field.name || 'Campo';

                const nombre = document.createElement('span');
                nombre.textContent = field.name || '—';

                if (!field.image) {
                    imgField.style.display = 'none';
                }

                campoDiv.appendChild(imgField);
                campoDiv.appendChild(nombre);
                camposContainer.appendChild(campoDiv);
            });
        } else {
            camposContainer.innerHTML = '<span>Sin campo asignado.</span>';
        }

        card.classList.add('show');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function mostrarError(mensaje) {
        errorDiv.textContent = mensaje;
        card.classList.remove('show');
    }

    function mostrarLoading(show) {
        if (show) {
            loadingDiv.classList.add('show');
        } else {
            loadingDiv.classList.remove('show');
        }
    }

    // Favorites functionality
    function getFavorites() {
        const favorites = localStorage.getItem('digimon-favorites');
        return favorites ? JSON.parse(favorites) : [];
    }

    function saveFavorites(favorites) {
        localStorage.setItem('digimon-favorites', JSON.stringify(favorites));
    }

    function isFavorite(name) {
        const favorites = getFavorites();
        return favorites.some(fav => fav.name.toLowerCase() === name.toLowerCase());
    }

    function updateFavoriteButton(name) {
        if (isFavorite(name)) {
            favoriteBtn.classList.add('active');
            favoriteBtn.title = 'Quitar de favoritos';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.title = 'Agregar a favoritos';
        }
    }

    function toggleFavorite() {
        if (!currentDigimon) return;

        const favorites = getFavorites();
        const index = favorites.findIndex(fav => 
            fav.name.toLowerCase() === currentDigimon.name.toLowerCase()
        );

        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push({
                name: currentDigimon.name,
                id: currentDigimon.id,
                image: currentDigimon.images?.[0]?.href || ''
            });
        }

        saveFavorites(favorites);
        updateFavoriteButton(currentDigimon.name);
        loadFavorites();
    }

    function loadFavorites() {
        const favorites = getFavorites();
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p style="color: #55ff99; opacity: 0.7;">No tienes favoritos aún</p>';
            return;
        }

        favoritesList.innerHTML = '';
        favorites.forEach(fav => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.textContent = fav.name;
            item.onclick = () => {
                searchInput.value = fav.name;
                buscarDigimon(fav.name);
            };

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-favorite';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                const favorites = getFavorites();
                const newFavorites = favorites.filter(f => f.name !== fav.name);
                saveFavorites(newFavorites);
                loadFavorites();
                if (currentDigimon && currentDigimon.name === fav.name) {
                    updateFavoriteButton(currentDigimon.name);
                }
            };

            item.appendChild(removeBtn);
            favoritesList.appendChild(item);
        });
    }

    // History functionality
    function getHistory() {
        const history = localStorage.getItem('digimon-history');
        return history ? JSON.parse(history) : [];
    }

    function saveHistory(history) {
        localStorage.setItem('digimon-history', JSON.stringify(history));
    }

    function addToHistory(name) {
        let history = getHistory();
        
        // Remove if already exists
        history = history.filter(item => item.toLowerCase() !== name.toLowerCase());
        
        // Add to beginning
        history.unshift(name);
        
        // Keep only last 10
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        saveHistory(history);
        loadHistory();
    }

    function loadHistory() {
        const history = getHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = '<p style="color: #55ff99; opacity: 0.7;">Sin búsquedas recientes</p>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach(name => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = name;
            item.onclick = () => {
                searchInput.value = name;
                buscarDigimon(name);
            };
            historyList.appendChild(item);
        });
    }

    // Eventos
    favoriteBtn.addEventListener('click', toggleFavorite);
    searchBtn.addEventListener('click', () => {
        buscarDigimon(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            ocultarSugerencias();
            buscarDigimon(searchInput.value);
        }
    });
});