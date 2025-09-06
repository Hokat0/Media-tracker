// --- КОНФИГУРАЦИЯ API-КЛЮЧЕЙ ---
// ⚠️ Вставьте сюда ваши API-ключи!

// 1. The Movie Database (TMDB) API Key
//    Получить здесь: https://www.themoviedb.org/settings/api (зарегистрируйтесь и создайте приложение)
const TMDB_API_KEY = 'ВАШ_TMDB_API_КЛЮЧ';

// 2. RAWG Video Games Database API Key
//    Получить здесь: https://rawg.io/apidocs (зарегистрируйтесь, ключ будет в вашем профиле)
const RAWG_API_KEY = 'ВАШ_RAWG_API_КЛЮЧ';

// 3. Jikan API для аниме - ключ не требуется для базового использования.

// --- Глобальные переменные и константы ---
const STATUSES = {
    watching: 'Смотрю',
    completed: 'Просмотрено',
    planned: 'Буду смотреть',
    dropped: 'Брошено'
};
let mediaList = []; // Основной массив для хранения всех медиа

// --- DOM Элементы ---
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const mediaTypeSelect = document.getElementById('media-type-select');
    const searchResultsContainer = document.getElementById('search-results');
    const mediaListContainer = document.getElementById('media-list-container');
    const filterType = document.getElementById('filter-type');
    const filterStatus = document.getElementById('filter-status');
    const themeSwitcher = document.getElementById('theme-switcher');

    // --- Обработчики событий ---
    searchForm.addEventListener('submit', handleSearch);
    filterType.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    themeSwitcher.addEventListener('click', toggleTheme);
    
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
     * Обрабатывает клики на динамических элементах (кнопки "Добавить")
     */
    function handleDynamicClicks(e) {
        if (e.target.classList.contains('add-btn')) {
            const mediaData = JSON.parse(e.target.dataset.media);
            addMediaToList(mediaData);
        }
    }
    
    /**
     * Обрабатывает изменения в динамических элементах (смена статуса в карточке)
     */
    function handleDynamicChanges(e) {
        if (e.target.classList.contains('status-select')) {
            const id = e.target.dataset.id;
            const newStatus = e.target.value;
            updateStatus(id, newStatus);
        }
    }


    // --- Функции для работы с API ---

    /**
     * Поиск фильмов и сериалов через TMDB API
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

        // Преобразуем ответ API в наш унифицированный формат
        return data.results.slice(0, 5).map(item => ({
            apiId: item.id,
            type: type,
            title: item.title || item.name,
            year: (item.release_date || item.first_air_date)?.split('-')[0] || 'N/A',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image',
            description: item.overview,
            // Жанры для TMDB требуют отдельного запроса, для прототипа упростим
            genres: ['...'] 
        }));
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
     */
    async function searchRAWG(query) {
        if (!RAWG_API_KEY || RAWG_API_KEY === 'ВАШ_RAWG_API_КЛЮЧ') {
             alert('Пожалуйста, укажите ваш API ключ для RAWG в файле script.js');
            return [];
        }
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
            description: `Рейтинг: ${item.rating || 'N/A'}`,
            genres: item.genres.map(g => g.name)
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
        // Создаем уникальный ID для избежания дубликатов
        const uniqueId = `${mediaData.type}-${mediaData.apiId}`;
        
        if (mediaList.some(item => item.id === uniqueId)) {
            alert('Этот элемент уже в вашем списке!');
            return;
        }
        
        const newItem = {
            ...mediaData,
            id: uniqueId,
            status: 'planned' // Статус по умолчанию
        };

        mediaList.push(newItem);
        saveToLocalStorage();
        renderMediaList();
        searchResultsContainer.innerHTML = ''; // Очищаем результаты поиска
        searchInput.value = '';
    }
    
    /**
     * Обновление статуса медиа
     */
    function updateStatus(id, newStatus) {
        const itemIndex = mediaList.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            mediaList[itemIndex].status = newStatus;
            saveToLocalStorage();
            applyFilters(); // Перерисовываем с учетом фильтров
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

        return `
            <div class="media-card" data-id="${item.id}">
                <img src="${item.poster}" alt="Постер для ${item.title}" class="poster">
                <div class="card-content">
                    <h3 class="title">${item.title}</h3>
                    <p class="year">${item.year}</p>
                    <p class="genres">${item.genres.join(', ')}</p>
                    <select class="status-select" data-id="${item.id}">
                        ${statusOptions}
                    </select>
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
