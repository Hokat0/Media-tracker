// --- КОНФИГУРАЦИЯ API-КЛЮЧЕЙ ---
// ⚠️ Вставьте сюда ваши API-ключи!
// 1. The Movie Database (TMDB) API Key
//    Получить здесь: https://www.themoviedb.org/settings/api
const TMDB_API_KEY = 'b7659762545ff689f8016048244c0d3a'; // Убедитесь, что ключ правильный
// 2. RAWG Video Games Database API Key
//    Получить здесь: https://rawg.io/apidocs
const RAWG_API_KEY = '41af4bcf6ae24a40a17192551ec7a2e1'; // Убедитесь, что ключ правильный

// --- Глобальные переменные и константы ---
const STATUSES = {
    watching: 'Смотрю',
    completed: 'Просмотрено',
    planned: 'Буду смотреть',
    dropped: 'Брошено'
};

let mediaItem = null; // Текущий элемент
let mediaList = []; // Полный список (для обновления)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Элементы ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const detailTitle = document.getElementById('detail-title');
    const detailYear = document.getElementById('detail-year');
    const detailType = document.getElementById('detail-type');
    const detailPosterImg = document.getElementById('detail-poster-img');
    const detailDescription = document.getElementById('detail-description');
    const detailGenres = document.getElementById('detail-genres');
    const detailStatusSelect = document.getElementById('detail-status-select');
    const detailRatingSelect = document.getElementById('detail-rating-select');
    const detailNotesBtn = document.getElementById('detail-notes-btn');
    const detailRemoveBtn = document.getElementById('detail-remove-btn');
    const videoContainer = document.getElementById('video-container');
    const videoTitle = document.getElementById('video-title');
    const videoPlayerPlaceholder = document.getElementById('video-player-placeholder');

    // --- Обработчики событий ---
    themeSwitcher.addEventListener('click', toggleTheme);
    detailStatusSelect.addEventListener('change', handleStatusChange);
    detailRatingSelect.addEventListener('change', handleRatingChange);
    detailNotesBtn.addEventListener('click', handleNotes);
    detailRemoveBtn.addEventListener('click', handleRemove);

    // Заполнение опций статуса
    Object.keys(STATUSES).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = STATUSES[key];
        detailStatusSelect.appendChild(option);
    });

    // Заполнение опций рейтинга
    for (let i = 1; i <= 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `⭐ ${i}/10`;
        detailRatingSelect.appendChild(option);
    }

    // --- Инициализация страницы ---
    loadTheme();
    loadMediaItem();
});

/**
 * Загружает данные элемента из URL или localStorage
 */
function loadMediaItem() {
    // Получаем ID из URL
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        showErrorMessage('Не указан ID элемента.');
        return;
    }

    // Загружаем список из localStorage
    const savedList = localStorage.getItem('mediaTrackerList');
    if (savedList) {
        mediaList = JSON.parse(savedList);
        mediaItem = mediaList.find(item => item.id === itemId);
    }

    if (!mediaItem) {
        showErrorMessage('Элемент не найден в коллекции.');
        return;
    }

    // Отображаем данные
    renderMediaItem();
    
    // Отображаем видео
    renderVideo();
}

/**
 * Отображает данные элемента на странице
 */
function renderMediaItem() {
    document.getElementById('detail-title').textContent = mediaItem.title;
    document.getElementById('detail-year').textContent = mediaItem.year;
    document.getElementById('detail-type').textContent = getTypeDisplayName(mediaItem.type);
    document.getElementById('detail-poster-img').src = mediaItem.poster;
    document.getElementById('detail-poster-img').alt = `Постер для ${mediaItem.title}`;
    document.getElementById('detail-description').textContent = mediaItem.description;
    
    // Отображение жанров
    const genresContainer = document.getElementById('detail-genres');
    genresContainer.innerHTML = '';
    if (mediaItem.genres && mediaItem.genres.length > 0) {
        mediaItem.genres.forEach(genre => {
            const genreSpan = document.createElement('span');
            genreSpan.textContent = genre;
            genresContainer.appendChild(genreSpan);
        });
    } else {
        genresContainer.textContent = 'Не указаны';
    }

    // Установка текущих значений статуса и рейтинга
    document.getElementById('detail-status-select').value = mediaItem.status || '';
    document.getElementById('detail-rating-select').value = mediaItem.rating || 0;
}

/**
 * Отображает видео (трейлер, клип) на странице
 */
function renderVideo() {
    const videoContainer = document.getElementById('video-container');
    const videoTitle = document.getElementById('video-title');
    const videoPlayerPlaceholder = document.getElementById('video-player-placeholder');
    videoPlayerPlaceholder.textContent = 'Видео не найдено'; // Сброс и установка сообщения по умолчанию

    // Очистка предыдущего плеера
    const existingPlayer = videoContainer.querySelector('iframe, video');
    if (existingPlayer) {
        existingPlayer.remove();
    }

    // Логика отображения видео в зависимости от типа и доступных данных
    if (mediaItem.type === 'movie' || mediaItem.type === 'series') {
        if (mediaItem.trailerKey) {
            videoTitle.textContent = 'Трейлер';
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${mediaItem.trailerKey}?rel=0`;
            iframe.allow = 'autoplay; encrypted-media';
            iframe.title = `Трейлер ${mediaItem.title}`;
            videoContainer.appendChild(iframe);
            videoPlayerPlaceholder.remove(); // Убираем placeholder если плеер добавлен
        } else {
            videoTitle.textContent = 'Видео';
            videoPlayerPlaceholder.textContent = 'Трейлер для этого фильма/сериала недоступен.';
        }
    } else if (mediaItem.type === 'anime') {
         // Предполагаем, что trailerKey уже был сохранен при добавлении через Jikan
        if (mediaItem.trailerKey) {
            videoTitle.textContent = 'Трейлер';
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${mediaItem.trailerKey}?rel=0`;
            iframe.allow = 'autoplay; encrypted-media';
            iframe.title = `Трейлер ${mediaItem.title}`;
            videoContainer.appendChild(iframe);
            videoPlayerPlaceholder.remove();
        } else {
            videoTitle.textContent = 'Видео';
            videoPlayerPlaceholder.textContent = 'Трейлер для этого аниме недоступен.';
        }
    } else if (mediaItem.type === 'game') {
        if (mediaItem.clip) {
            videoTitle.textContent = 'Игровой клип';
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = false; // Отключено для экономии трафика
            video.loop = false;
            const source = document.createElement('source');
            source.src = mediaItem.clip;
            source.type = 'video/mp4'; // Предполагаем MP4, можно проверить тип
            video.appendChild(source);
            video.textContent = 'Ваш браузер не поддерживает видео тег.';
            videoContainer.appendChild(video);
            videoPlayerPlaceholder.remove();
        } else {
             // Попробуем загрузить клип, если он не был сохранен (например, для старых записей)
             loadAndRenderGameClip();
        }
    } else {
        videoTitle.textContent = 'Видео';
        videoPlayerPlaceholder.textContent = 'Видео для этого типа медиа недоступно.';
    }
}

/**
 * Попытка загрузить клип для игры, если он не был сохранен
 */
async function loadAndRenderGameClip() {
    const videoContainer = document.getElementById('video-container');
    const videoTitle = document.getElementById('video-title');
    const videoPlayerPlaceholder = document.getElementById('video-player-placeholder');

    if (!RAWG_API_KEY || RAWG_API_KEY === 'ВАШ_RAWG_API_КЛЮЧ') {
        videoPlayerPlaceholder.textContent = 'API ключ для RAWG не указан.';
        return;
    }

    try {
        videoPlayerPlaceholder.textContent = 'Загрузка клипа...';
        const url = `https://api.rawg.io/api/games/${mediaItem.apiId}?key=${RAWG_API_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
            const gameData = await response.json();
            if (gameData.clip) {
                videoTitle.textContent = 'Игровой клип';
                const video = document.createElement('video');
                video.controls = true;
                video.autoplay = false;
                video.loop = false;
                const source = document.createElement('source');
                source.src = gameData.clip;
                source.type = 'video/mp4';
                video.appendChild(source);
                video.textContent = 'Ваш браузер не поддерживает видео тег.';
                // Заменяем placeholder на плеер
                videoPlayerPlaceholder.replaceWith(video);
            } else {
                videoPlayerPlaceholder.textContent = 'Игровой клип недоступен.';
            }
        } else {
             videoPlayerPlaceholder.textContent = 'Не удалось загрузить данные игры.';
        }
    } catch (err) {
        console.error('Ошибка при загрузке клипа для игры:', err);
        videoPlayerPlaceholder.textContent = 'Ошибка при загрузке клипа.';
    }
}


/**
 * Обработчик изменения статуса
 */
function handleStatusChange(e) {
    const newStatus = e.target.value;
    if (mediaItem) {
        mediaItem.status = newStatus;
        updateMediaList();
    }
}

/**
 * Обработчик изменения рейтинга
 */
function handleRatingChange(e) {
    const newRating = parseInt(e.target.value);
    if (mediaItem) {
        mediaItem.rating = newRating;
        updateMediaList();
    }
}

/**
 * Обработчик кнопки "Заметки"
 */
function handleNotes() {
    if (!mediaItem) return;
    
    const newNotes = prompt(`Ваши заметки для "${mediaItem.title}":`, mediaItem.notes || '');
    if (newNotes !== null) {
        mediaItem.notes = newNotes.trim();
        updateMediaList();
    }
}

/**
 * Обработчик кнопки "Удалить"
 */
function handleRemove() {
    if (!mediaItem) return;
    
    const confirmed = confirm(`Вы уверены, что хотите удалить "${mediaItem.title}" из коллекции?`);
    if (confirmed) {
        mediaList = mediaList.filter(item => item.id !== mediaItem.id);
        localStorage.setItem('mediaTrackerList', JSON.stringify(mediaList));
        window.location.href = 'index.html';
    }
}

/**
 * Обновляет элемент в списке и сохраняет в localStorage
 */
function updateMediaList() {
    const index = mediaList.findIndex(item => item.id === mediaItem.id);
    if (index !== -1) {
        mediaList[index] = mediaItem;
        localStorage.setItem('mediaTrackerList', JSON.stringify(mediaList));
    }
}

/**
 * Отображает сообщение об ошибке
 */
function showErrorMessage(message) {
    const detailContent = document.querySelector('.detail-content');
    if (detailContent) {
        detailContent.innerHTML = `
            <p style="color: red; text-align: center; width: 100%;">${message}</p>
            <a href="index.html" class="back-link">← Назад к коллекции</a>
        `;
    }
}

/**
 * Получает отображаемое имя типа
 */
function getTypeDisplayName(type) {
    const types = {
        'movie': 'Фильм',
        'series': 'Сериал',
        'anime': 'Аниме',
        'game': 'Игра'
    };
    return types[type] || type;
}

/**
 * Переключение темы
 */
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('mediaTrackerTheme', theme);
    // Сохраняем тему в localStorage, чтобы она применялась при перезагрузке
}

/**
 * Загрузка сохраненной темы
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('mediaTrackerTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        // Убедимся, что тема по умолчанию темная, если ничего не сохранено
        document.body.classList.remove('light-theme');
    }
}