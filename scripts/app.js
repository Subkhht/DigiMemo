document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sugerenciasDiv = document.getElementById('sugerencias');
    const errorDiv = document.getElementById('error');
    const card = document.getElementById('digimonCard');

    let debounceTimer;

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
        }, 300); // espera 300ms sin escribir para hacer la petición
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

        try {
            const response = await fetch(`https://digi-api.com/api/v1/digimon/${encodeURIComponent(nombre)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    mostrarError('Digimon no encontrado. ¿Está bien escrito el nombre?');
                } else {
                    mostrarError('Error al conectar con la API. Inténtalo más tarde.');
                }
                return;
            }

            const data = await response.json();
            mostrarDigimon(data);
        } catch (err) {
            console.error(err);
            mostrarError('Error inesperado. Revisa tu conexión.');
        }
    }

    async function mostrarDigimon(digimon) {
        document.getElementById('nombre').textContent = digimon.name || '—';
        document.getElementById('id').textContent = digimon.id || '—';
        document.getElementById('nivel').textContent = digimon.level?.name || '—';
        document.getElementById('tipo').textContent = digimon.types?.map(t => t.type).join(', ') || '—';
        document.getElementById('atributo').textContent = digimon.attribute?.name || '—';
        document.getElementById('descripcion').textContent = digimon.description || 'Sin descripción.';

        // Imagen principal del Digimon
        const img = document.getElementById('imagen');
        if (digimon.images && digimon.images.length > 0) {
            img.src = digimon.images[0].href;
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
                li.textContent = `${skill.skill} — ${skill.description || ''}`;
                habilidadesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Ninguna registrada.';
            habilidadesList.appendChild(li);
        }

        // === NUEVO: Renderizar campos con imágenes ===
        const camposContainer = document.getElementById('camposContainer');
        camposContainer.innerHTML = '';

        if (digimon.fields && digimon.fields.length > 0) {
            // Mapear promesas para obtener cada field con su imagen
            const fieldPromises = digimon.fields.map(async (fieldRef) => {
                try {
                    const res = await fetch(`https://digi-api.com/api/v1/field/${fieldRef.id}`);
                    if (res.ok) {
                        const fieldData = await res.json();
                        return fieldData;
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

                const nombre = document.createElement('span');
                nombre.textContent = field.name || '—';
                nombre.style.display = 'block';
                nombre.style.marginTop = '4px';
                nombre.style.textAlign = 'center';

                const imgField = document.createElement('img');
                imgField.src = field.image || '';
                imgField.alt = field.name || 'Campo';
                imgField.style.width = '60px';
                imgField.style.height = '60px';
                imgField.style.objectFit = 'contain';
                imgField.style.display = 'block';
                imgField.style.margin = '0 auto';

                // Si no hay imagen, mostramos un placeholder de texto
                if (!field.image) {
                    imgField.style.display = 'none';
                    nombre.textContent = `[${field.name || '—'}]`;
                }

                campoDiv.appendChild(imgField);
                campoDiv.appendChild(nombre);
                camposContainer.appendChild(campoDiv);
            });
        } else {
            camposContainer.innerHTML = '<span>Sin campo asignado.</span>';
        }

        card.classList.add('show');
    }

    function mostrarError(mensaje) {
        errorDiv.textContent = mensaje;
        card.classList.remove('show');
    }

    // Eventos
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