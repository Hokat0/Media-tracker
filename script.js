// --- КОНФИГУРАЦИЯ API-КЛЮЧЕЙ ---
// ⚠️ Вставьте сюда ваши API-ключи!

// 1. The Movie Database (TMDB) API Key
//    Получить здесь: https://www.themoviedb.org/settings/api
const TMDB_API_KEY = 'b7659762545ff689f8016048244c0d3a';

// 2. RAWG Video Games Database API Key
//    Получить здесь: https://rawg.io/apidocs
const RAWG_API_KEY = '41af4bcf6ae24a40a17192551ec7a2e1';


// --- Глобальные переменные и константы ---
const STATUSES = {
    watching: 'Смотрю',
    completed: 'Просмотрено',
    planned: 'Буду смотреть',
    dropped: 'Брошено'
};
let mediaList = []; // Основной массив для хранения всех медиа

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Элементы ---
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const mediaTypeSelect = document.getElementById('media-type-select');
    const searchResultsContainer = document.getElementById('search-results');
    const mediaListContainer = document.getElementById('media-list-container');
    const filterType = document.getElementById('filter-type');
    const filterStatus = document.getElementById('filter-status');
    const themeSwitcher = document.getElementById('theme-switcher');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');

    // --- Обработчики событий ---
    searchForm.addEventListener('submit', handleSearch);
    filterType.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    themeSwitcher.addEventListener('click', toggleTheme);
    exportBtn.addEventListener('click', handleExport);
    importFile.addEventListener('change', handleImport);
    
    // Делегирование событий для динамически создаваемых элементов
    document.body.addEventListener('click', handleDynamicClicks);
    document.body.addEventListener('change', handleDynamicChanges);

    // --- Инициализация приложения ---
    loadFromLocalStorage();
    renderMediaList();
    loadTheme();

    // --- Основная логика ---

    /**
     * Обрабатывает отправку формы поиска
     */
    async function handleSearch(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        const type = mediaTypeSelect.value;
        if (!query) return;

        searchResultsContainer.innerHTML = '<p>Идет поиск...</p>';

        try {
            let results = [];
            switch (type) {
                case 'movie':
                case 'series':
                    results = await searchTMDB(query, type);
                    break;
                case 'anime':
                    results = await searchJikan(query);
                    break;
                case 'game':
                    results = await searchRAWG(query);
                    break;
            }
            displaySearchResults(results);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            searchResultsContainer.innerHTML = '<p>Ошибка при поиске. Проверьте консоль.</p>';
        }
    }
    
    /**
     * Обрабатывает клики на динамических элементах (кнопки "Добавить", "Заметки")
     */
    function handleDynamicClicks(e) {
        if (e.target.classList.contains('add-btn')) {
            const mediaData = JSON.parse(e.target.dataset.media);
            addMediaToList(mediaData);
        }
        if (e.target.classList.contains('notes-btn')) {
            const id = e.target.dataset.id;
            handleNotes(id);
        }
    }
    
    /**
     * Обрабатывает изменения в динамических элементах (смена статуса, оценки)
     */
    function handleDynamicChanges(e) {
        const target = e.target;
        if (target.classList.contains('status-select')) {
            updateStatus(target.dataset.id, target.value);
        }
        if (target.classList.contains('rating-select')) {
            updateRating(target.dataset.id, parseInt(target.value));
        }
    }

    // --- Функции для работы с API ---

    /**
     * Поиск фильмов и сериалов через TMDB API
     * Обновлено для получения трейлера
     */
    async function searchTMDB(query, type) {
        if (!TMDB_API_KEY || TMDB_API_KEY === 'ВАШ_TMDB_API_КЛЮЧ') {
            alert('Пожалуйста, укажите ваш API ключ для TMDB в файле script.js');
            return [];
        }
        const searchType = type === 'movie' ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ru-RU`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Используем map с async/await для получения трейлеров для каждого результата
        const resultsWithTrailers = await Promise.all(data.results.slice(0, 5).map(async (item) => {
            let trailerKey = null;
            try {
                const videoUrl = `https://api.themoviedb.org/3/${searchType}/${item.id}/videos?api_key=${TMDB_API_KEY}&language=ru-RU`;
                const videoResponse = await fetch(videoUrl);
                if (videoResponse.ok) {
                    const videoData = await videoResponse.json();
                    // Найти первый YouTube трейлер
                    const trailer = videoData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
                    if (trailer) {
                        trailerKey = trailer.key;
                    }
                }
            } catch (err) {
                console.error(`Не удалось загрузить видео для ${item.id}:`, err);
                // Можно продолжить, trailerKey останется null
            }

            return {
                apiId: item.id,
                type: type,
                title: item.title || item.name,
                year: (item.release_date || item.first_air_date)?.split('-')[0] || 'N/A',
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image',
                description: item.overview,
                genres: item.genre_ids ? ['...'] : [], // Жанры можно получить отдельно, оставим для простоты
                trailerKey: trailerKey // Добавляем ключ трейлера
            };
        }));

        return resultsWithTrailers;
    }

    /**
     * Поиск аниме через Jikan API
     */
    async function searchJikan(query) {
        const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        return data.data.map(item => ({
            apiId: item.mal_id,
            type: 'anime',
            title: item.title,
            year: item.year || 'N/A',
            poster: item.images.jpg.image_url || 'https://via.placeholder.com/200x300.png?text=No+Image',
            description: item.synopsis,
            genres: item.genres.map(g => g.name)
        }));
    }

    /**
     * Поиск игр через RAWG API
     * Обновлено для получения клипа
     */
    async function searchRAWG(query) {
        if (!RAWG_API_KEY || RAWG_API_KEY === 'ВАШ_RAWG_API_КЛЮЧ') {
             alert('Пожалуйста, укажите ваш API ключ для RAWG в файле script.js');
            return [];
        }
        // RAWG API может возвращать клип напрямую в результатах поиска
        const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=5`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        return data.results.map(item => ({
            apiId: item.id,
            type: 'game',
            title: item.name,
            year: item.released?.split('-')[0] || 'N/A',
            poster: item.background_image || 'https://via.placeholder.com/200x300.png?text=No+Image',
            description: item.description_raw ? item.description_raw.substring(0, 200) + '...' : `Рейтинг: ${item.rating || 'N/A'}`, // Более полное описание
            genres: item.genres.map(g => g.name),
            clip: item.clip || null // Добавляем клип, если он есть
        }));
    }

        /**
     * Отображение результатов поиска
     */
    function displaySearchResults(results) {
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p>Ничего не найдено.</p>';
            return;
        }
        searchResultsContainer.innerHTML = results.map(item => `
            <div class="search-result-item">
                <img src="${item.poster}" alt="Постер">
                <div class="info">
                    <strong>${item.title}</strong>
                    <p>${item.year}</p>
                </div>
                <button class="add-btn" data-media='${JSON.stringify(item)}'>Добавить</button>
            </div>
        `).join('');
    }

    // --- Функции для работы со списком ---

    /**
     * Добавление элемента в список
     */
    function addMediaToList(mediaData) {
        const uniqueId = `${mediaData.type}-${mediaData.apiId}`;
        if (mediaList.some(item => item.id === uniqueId)) {
            alert('Этот элемент уже в вашем списке!');
            return;
        }
        
        const newItem = {
            ...mediaData,
            id: uniqueId,
            status: 'planned', // Статус по умолчанию
            rating: 0, // 0 = нет оценки
            notes: "" // Пустые заметки
        };

        mediaList.push(newItem);
        saveToLocalStorage();
        renderMediaList();
        searchResultsContainer.innerHTML = '';
        searchInput.value = '';
    }
    
    /**
     * Обновление статуса медиа
     */
    function updateStatus(id, newStatus) {
        const item = mediaList.find(item => item.id === id);
        if (item) {
            item.status = newStatus;
            saveToLocalStorage();
            applyFilters();
        }
    }

    /**
     * Обновление оценки
     */
    function updateRating(id, newRating) {
        const item = mediaList.find(item => item.id === id);
        if (item) {
            item.rating = newRating;
            saveToLocalStorage();
        }
    }
    
    /**
     * Обработка и обновление заметок
     */
    function handleNotes(id) {
        const item = mediaList.find(item => item.id === id);
        if (!item) return;

        const newNotes = prompt(`Ваши заметки для "${item.title}":`, item.notes);
        
        if (newNotes !== null) {
            item.notes = newNotes.trim();
            saveToLocalStorage();
        }
    }

    /**
     * Рендеринг всего списка медиа
     */
    function renderMediaList(items = mediaList) {
        if (items.length === 0) {
            mediaListContainer.innerHTML = '<p>Ваша коллекция пуста. Добавьте что-нибудь!</p>';
            return;
        }
        mediaListContainer.innerHTML = items.map(createMediaCard).join('');
    }

        /**
     * Создание HTML-кода для одной карточки
     */
    function createMediaCard(item) {
        const statusOptions = Object.keys(STATUSES).map(key => 
            `<option value="${key}" ${item.status === key ? 'selected' : ''}>${STATUSES[key]}</option>`
        ).join('');
        let ratingOptions = '<option value="0">Оценка</option>';
        for (let i = 1; i <= 10; i++) {
            ratingOptions += `<option value="${i}" ${item.rating === i ? 'selected' : ''}>⭐ ${i}/10</option>`;
        }
        return `
            <div class="media-card" data-id="${item.id}">
                <!-- Обернем содержимое в ссылку -->
                <a href="details.html?id=${item.id}" style="text-decoration: none; color: inherit;">
                    <img src="${item.poster}" alt="Постер для ${item.title}" class="poster">
                    <div class="card-content">
                        <h3 class="title">${item.title}</h3>
                        <p class="year">${item.year}</p>
                        <p class="genres">${item.genres.join(', ')}</p>
                    </div>
                </a>
                <!-- Вынесем селекты и кнопки заметок вне ссылки, чтобы они работали отдельно -->
                <div class="card-footer">
                    <select class="status-select" data-id="${item.id}">${statusOptions}</select>
                    <div class="rating-notes-container">
                        <select class="rating-select" data-id="${item.id}">${ratingOptions}</select>
                        <button class="notes-btn" data-id="${item.id}">Заметки</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Применение фильтров
     */
    function applyFilters() {
        const type = filterType.value;
        const status = filterStatus.value;
        
        let filteredList = mediaList;
        
        if (type !== 'all') {
            filteredList = filteredList.filter(item => item.type === type);
        }
        
        if (status !== 'all') {
            filteredList = filteredList.filter(item => item.status === status);
        }
        
        renderMediaList(filteredList);
    }
    
    // --- Функции Экспорта и Импорта ---

    /**
     * Экспортирует текущий список медиа в JSON файл
     */
    function handleExport() {
        if (mediaList.length === 0) {
            alert('Ваша коллекция пуста. Нечего экспортировать.');
            return;
        }
        const dataStr = JSON.stringify(mediaList, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `media-collection-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Импортирует список медиа из выбранного JSON файла
     */
    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData)) {
                    throw new Error('Файл импорта должен содержать массив данных.');
                }
                const confirmed = confirm('Вы уверены, что хотите заменить текущую коллекцию? Это действие необратимо.');
                if (confirmed) {
                    mediaList = importedData;
                    saveToLocalStorage();
                    applyFilters();
                    alert(`Успешно импортировано ${importedData.length} элементов.`);
                }
            } catch (error) {
                alert(`Ошибка при импорте файла: ${error.message}`);
            } finally {
                event.target.value = null;
            }
        };
        reader.readAsText(file);
    }

    // --- Функции для localStorage и темы ---

    /**
     * Сохранение списка в localStorage
     */
    function saveToLocalStorage() {
        localStorage.setItem('mediaTrackerList', JSON.stringify(mediaList));
    }

    /**
     * Загрузка списка из localStorage
     */
    function loadFromLocalStorage() {
        const savedList = localStorage.getItem('mediaTrackerList');
        if (savedList) {
            mediaList = JSON.parse(savedList);
        }
    }
    
    /**
     * Переключение темы
     */
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('mediaTrackerTheme', theme);
    }

    /**
     * Загрузка сохраненной темы
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem('mediaTrackerTheme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
    }
});
