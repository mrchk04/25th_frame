// films-manager.js - Модуль для роботи з фільмами

class FilmsManager {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 хвилин
    }

    // Кешування запитів
    getCacheKey(url, params = {}) {
        const paramsString = Object.keys(params).length ? 
            '?' + new URLSearchParams(params).toString() : '';
        return url + paramsString;
    }

    async fetchWithCache(url, params = {}, options = {}) {
        const cacheKey = this.getCacheKey(url, params);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const queryString = Object.keys(params).length ? 
                '?' + new URLSearchParams(params).toString() : '';
            
            const response = await fetch(url + queryString, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Кешуємо результат
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`Помилка запиту до ${url}:`, error);
            throw error;
        }
    }

    // Отримати рекомендовані фільми
    async getFeaturedFilms() {
        return await this.fetchWithCache(`${this.baseURL}/api/films/featured`);
    }

    // Отримати випадкові фільми
    async getRandomFilms(count = 6) {
        return await this.fetchWithCache(`${this.baseURL}/api/films/random`, { count });
    }

    // Пошук фільмів
    async searchFilms(params = {}) {
        const {
            q = '',
            status = '',
            genre = '',
            limit = 20,
            offset = 0
        } = params;

        return await this.fetchWithCache(`${this.baseURL}/api/films/search`, {
            q, status, genre, limit, offset
        });
    }

    // Отримати фільми за жанром
    async getFilmsByGenre(genre, limit = 10) {
        return await this.fetchWithCache(`${this.baseURL}/api/films/genre/${genre}`, { limit });
    }

    // Отримати деталі фільму
    async getFilmDetails(filmId) {
        return await this.fetchWithCache(`${this.baseURL}/api/films/${filmId}/details`);
    }

    // Отримати всі жанри
    async getGenres() {
        return await this.fetchWithCache(`${this.baseURL}/api/films/genres`);
    }

    // Отримати статистику фільмів
    async getFilmsStats() {
        return await this.fetchWithCache(`${this.baseURL}/api/films/stats`);
    }

    // Відображення фільмів в сітці
    renderFilmsGrid(films, container, options = {}) {
        if (!container) {
            console.error('Контейнер для відображення фільмів не знайдено');
            return;
        }

        const {
            showRating = true,
            showStatus = true,
            clickable = true,
            showDescription = false
        } = options;

        container.innerHTML = '';

        if (!films || films.length === 0) {
            container.innerHTML = '<p class="no-films-message">Фільми не знайдені</p>';
            return;
        }

        films.forEach(film => {
            const movieCard = this.createMovieCard(film, {
                showRating,
                showStatus,
                clickable,
                showDescription
            });
            container.appendChild(movieCard);
        });
    }

    // Створення картки фільму
    createMovieCard(film, options = {}) {
        const {
            showRating = true,
            showStatus = true,
            clickable = true,
            showDescription = false
        } = options;

        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.dataset.filmId = film.id;

        if (clickable) {
            movieCard.style.cursor = 'pointer';
            movieCard.addEventListener('click', () => {
                this.showFilmDetails(film.id);
            });
        }

        // Постер фільму з fallback
        const posterImg = document.createElement('img');
        posterImg.className = 'movie-poster';
        posterImg.alt = film.title;
        posterImg.loading = 'lazy';
        
        // Обробка помилок завантаження зображення
        posterImg.onerror = () => {
            posterImg.src = './assets/images/no-poster.jpg';
        };
        
        if (film.poster_url) {
            posterImg.src = film.poster_url;
        } else {
            posterImg.src = './assets/images/no-poster.jpg';
        }

        movieCard.appendChild(posterImg);

        // Інформація про фільм
        if (showDescription || showRating || showStatus) {
            const movieInfo = document.createElement('div');
            movieInfo.className = 'movie-info';

            // Назва фільму
            const movieTitle = document.createElement('h3');
            movieTitle.className = 'movie-title';
            movieTitle.textContent = film.title;
            movieInfo.appendChild(movieTitle);

            // Режисер
            if (film.director) {
                const movieDirector = document.createElement('p');
                movieDirector.className = 'movie-director';
                movieDirector.textContent = film.director;
                movieInfo.appendChild(movieDirector);
            }

            // Рейтинг
            if (showRating && film.rating) {
                const movieRating = document.createElement('div');
                movieRating.className = 'movie-rating';
                movieRating.innerHTML = `
                    <span class="rating-stars">${this.generateStars(film.rating)}</span>
                    <span class="rating-number">${film.rating}</span>
                `;
                movieInfo.appendChild(movieRating);
            }

            // Статус
            if (showStatus) {
                const movieStatus = document.createElement('span');
                movieStatus.className = `movie-status status-${film.status}`;
                movieStatus.textContent = this.getStatusText(film.status);
                movieInfo.appendChild(movieStatus);
            }

            // Опис (якщо потрібен)
            if (showDescription && film.description) {
                const movieDescription = document.createElement('p');
                movieDescription.className = 'movie-description';
                movieDescription.textContent = film.description.length > 100 ? 
                    film.description.substring(0, 100) + '...' : film.description;
                movieInfo.appendChild(movieDescription);
            }

            // Жанри
            if (film.genres) {
                const movieGenres = document.createElement('div');
                movieGenres.className = 'movie-genres';
                const genres = film.genres.split(',').map(g => g.trim()).slice(0, 3);
                genres.forEach(genre => {
                    const genreTag = document.createElement('span');
                    genreTag.className = 'genre-tag';
                    genreTag.textContent = genre;
                    movieGenres.appendChild(genreTag);
                });
                movieInfo.appendChild(movieGenres);
            }

            movieCard.appendChild(movieInfo);
        }

        return movieCard;
    }

    // Генерація зірок для рейтингу
    generateStars(rating) {
        const fullStars = Math.floor(rating / 2);
        const halfStar = (rating % 2) >= 1;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '★';
        if (halfStar) stars += '☆';
        for (let i = 0; i < emptyStars; i++) stars += '☆';
        
        return stars;
    }

    // Отримання тексту статусу
    getStatusText(status) {
        const statusMap = {
            'active': 'У прокаті',
            'upcoming': 'Скоро',
            'inactive': 'Завершено'
        };
        return statusMap[status] || status;
    }

    // Показ деталей фільму в модальному вікні
    async showFilmDetails(filmId) {
        try {
            this.showLoadingModal();
            const data = await this.getFilmDetails(filmId);
            this.hideLoadingModal();
            this.renderFilmDetailsModal(data);
        } catch (error) {
            this.hideLoadingModal();
            this.showErrorModal('Помилка завантаження деталей фільму');
            console.error('Помилка завантаження деталей фільму:', error);
        }
    }

    // Рендер модального вікна з деталями фільму
    renderFilmDetailsModal(data) {
        const { film, screenings, similarFilms } = data;
        
        const modal = document.createElement('div');
        modal.className = 'modal film-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content film-details-content">
                <button class="modal-close" onclick="filmsManager.closeModal()">&times;</button>
                
                <div class="film-details-header">
                    <div class="film-poster-large">
                        <img src="${film.poster_url || './assets/images/no-poster.jpg'}" 
                             alt="${film.title}" 
                             onerror="this.src='./assets/images/no-poster.jpg'">
                    </div>
                    
                    <div class="film-main-info">
                        <h1 class="film-title">${film.title}</h1>
                        ${film.director ? `<p class="film-director">Режисер: ${film.director}</p>` : ''}
                        
                        <div class="film-meta">
                            ${film.rating ? `
                                <div class="film-rating">
                                    <span class="rating-stars">${this.generateStars(film.rating)}</span>
                                    <span class="rating-number">${film.rating}/10</span>
                                </div>
                            ` : ''}
                            
                            ${film.duration ? `<span class="film-duration">${film.duration} хв</span>` : ''}
                            ${film.age_rating ? `<span class="film-age-rating">${film.age_rating}</span>` : ''}
                            
                            <span class="film-status status-${film.status}">${this.getStatusText(film.status)}</span>
                        </div>
                        
                        ${film.genres ? `
                            <div class="film-genres">
                                ${film.genres.split(',').map(g => 
                                    `<span class="genre-tag">${g.trim()}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                        
                        ${film.description ? `
                            <div class="film-description">
                                <p>${film.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${screenings.length > 0 ? `
                    <div class="film-screenings">
                        <h3>Найближчі сеанси</h3>
                        <div class="screenings-grid">
                            ${screenings.map(screening => {
                                const date = new Date(screening.screening_time);
                                return `
                                    <div class="screening-item">
                                        <div class="screening-date">
                                            ${date.toLocaleDateString('uk-UA')}
                                        </div>
                                        <div class="screening-time">
                                            ${date.toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'})}
                                        </div>
                                        <div class="screening-info">
                                            Зал ${screening.hall_number} • ${screening.price}₴
                                        </div>
                                        <div class="screening-seats">
                                            ${screening.available_seats} місць
                                        </div>
                                        <button class="btn-book-screening" 
                                                onclick="filmsManager.bookScreening(${screening.id})">
                                            Забронювати
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : '<p class="no-screenings">Наразі немає доступних сеансів</p>'}
                
                ${similarFilms.length > 0 ? `
                    <div class="similar-films">
                        <h3>Схожі фільми</h3>
                        <div class="similar-films-grid">
                            ${similarFilms.map(similar => `
                                <div class="similar-film-card" onclick="filmsManager.showFilmDetails(${similar.id})">
                                    <img src="${similar.poster_url || './assets/images/no-poster.jpg'}" 
                                         alt="${similar.title}"
                                         onerror="this.src='./assets/images/no-poster.jpg'">
                                    <p class="similar-film-title">${similar.title}</p>
                                    ${similar.rating ? `<span class="similar-film-rating">${similar.rating}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Закриття модального вікна при кліку поза ним
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // Бронювання сеансу
    bookScreening(screeningId) {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            this.closeModal();
            this.showAuthRequiredModal(`booking.html?screening=${screeningId}`);
            return;
        }
        
        window.location.href = `booking.html?screening=${screeningId}`;
    }

    // Фільтрація фільмів
    async filterFilms(filters = {}) {
        try {
            const data = await this.searchFilms(filters);
            return data;
        } catch (error) {
            console.error('Помилка фільтрації фільмів:', error);
            throw error;
        }
    }

    // Створення фільтрів для сторінки фільмів
    createFiltersPanel(container, onFilterChange) {
        if (!container) return;

        const filtersPanel = document.createElement('div');
        filtersPanel.className = 'filters-panel';
        
        filtersPanel.innerHTML = `
            <div class="filters-row">
                <div class="filter-group">
                    <label for="search-input">Пошук:</label>
                    <input type="text" id="search-input" class="filter-input" placeholder="Назва, режисер, жанр...">
                </div>
                
                <div class="filter-group">
                    <label for="status-filter">Статус:</label>
                    <select id="status-filter" class="filter-select">
                        <option value="">Всі фільми</option>
                        <option value="active">У прокаті</option>
                        <option value="upcoming">Скоро</option>
                        <option value="inactive">Завершені</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="genre-filter">Жанр:</label>
                    <select id="genre-filter" class="filter-select">
                        <option value="">Всі жанри</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <button id="reset-filters" class="btn-reset-filters">Скинути</button>
                </div>
            </div>
        `;

        container.appendChild(filtersPanel);

        // Завантажуємо жанри
        this.loadGenresForFilter();

        // Налаштовуємо обробники подій
        this.setupFilterEvents(onFilterChange);
    }

    // Завантаження жанрів для фільтра
    async loadGenresForFilter() {
        try {
            const data = await this.getGenres();
            const genreSelect = document.getElementById('genre-filter');
            
            if (genreSelect && data.genres) {
                data.genres.forEach(genre => {
                    const option = document.createElement('option');
                    option.value = genre;
                    option.textContent = genre;
                    genreSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Помилка завантаження жанрів:', error);
        }
    }

    // Налаштування обробників подій для фільтрів
    setupFilterEvents(onFilterChange) {
        let searchTimeout;

        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const genreFilter = document.getElementById('genre-filter');
        const resetButton = document.getElementById('reset-filters');

        // Пошук з затримкою
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters(onFilterChange);
                }, 500);
            });
        }

        // Миттєва фільтрація для селектів
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters(onFilterChange);
            });
        }

        if (genreFilter) {
            genreFilter.addEventListener('change', () => {
                this.applyFilters(onFilterChange);
            });
        }

        // Скидання фільтрів
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = '';
                if (genreFilter) genreFilter.value = '';
                this.applyFilters(onFilterChange);
            });
        }
    }

    // Застосування фільтрів
    applyFilters(onFilterChange) {
        const filters = {
            q: document.getElementById('search-input')?.value || '',
            status: document.getElementById('status-filter')?.value || '',
            genre: document.getElementById('genre-filter')?.value || '',
            limit: 20,
            offset: 0
        };

        if (onFilterChange) {
            onFilterChange(filters);
        }
    }

    // Модальні вікна
    showLoadingModal() {
        const modal = document.createElement('div');
        modal.className = 'modal loading-modal';
        modal.id = 'loading-modal';
        modal.innerHTML = `
            <div class="modal-content loading-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Завантаження...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    hideLoadingModal() {
        const modal = document.getElementById('loading-modal');
        if (modal) {
            modal.remove();
        }
    }

    showErrorModal(message) {
        const modal = document.createElement('div');
        modal.className = 'modal error-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header error">
                    <h3>Помилка</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button" onclick="filmsManager.closeModal()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showAuthRequiredModal(returnUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal auth-required-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Необхідна авторизація</h3>
                </div>
                <div class="modal-body">
                    <p>Для бронювання квитків необхідно увійти в систему.</p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button cancel" onclick="filmsManager.closeModal()">Скасувати</button>
                    <button class="modal-button primary" onclick="filmsManager.goToLogin('${returnUrl}')">Увійти</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    goToLogin(returnUrl) {
        localStorage.setItem('returnUrl', returnUrl);
        window.location.href = 'login.html';
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
    }

    // Очищення кешу
    clearCache() {
        this.cache.clear();
    }

    // Отримання розміру кешу
    getCacheSize() {
        return this.cache.size;
    }
}

// Ініціалізація глобального екземпляра
let filmsManager;

document.addEventListener('DOMContentLoaded', function() {
    filmsManager = new FilmsManager();
    
    // Додаємо CSS стилі
    const styles = document.createElement('style');
    styles.textContent = `
        .movie-card {
            background: rgba(30, 30, 30, 0.8);
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
            margin-bottom: 20px;
        }
        
        .movie-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .movie-poster {
            width: 100%;
            height: 300px;
            object-fit: cover;
        }
        
        .movie-info {
            padding: 15px;
        }
        
        .movie-title {
            font-size: 16px;
            margin: 0 0 8px 0;
            color: #fff;
        }
        
        .movie-director {
            font-size: 14px;
            color: #ccc;
            margin: 0 0 10px 0;
        }
        
        .movie-rating {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .rating-stars {
            color: #ffd700;
            font-size: 14px;
        }
        
        .rating-number {
            color: #fff;
            font-size: 14px;
            font-weight: bold;
        }
        
        .movie-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .status-active {
            background: rgba(0, 128, 0, 0.3);
            color: #8aff8a;
        }
        
        .status-upcoming {
            background: rgba(0, 0, 128, 0.3);
            color: #8a8aff;
        }
        
        .status-inactive {
            background: rgba(128, 128, 128, 0.3);
            color: #cccccc;
        }
        
        .movie-genres {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .genre-tag {
            background: rgba(120, 0, 0, 0.3);
            color: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }
        
        .movie-description {
            color: #ccc;
            font-size: 13px;
            line-height: 1.4;
            margin-top: 8px;
        }
        
        .no-films-message {
            text-align: center;
            color: #ccc;
            font-style: italic;
            padding: 40px 20px;
            grid-column: 1 / -1;
        }
        
        /* Стилі для модального вікна деталей фільму */
        .film-details-modal .modal-content {
            max-width: 900px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .film-details-content {
            background: #1e1e1e;
            color: #fff;
            border-radius: 10px;
            position: relative;
        }
        
        .modal-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.5);
            color: #fff;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            z-index: 10;
        }
        
        .film-details-header {
            display: flex;
            gap: 30px;
            padding: 30px;
        }
        
        .film-poster-large img {
            width: 250px;
            height: auto;
            border-radius: 10px;
        }
        
        .film-main-info {
            flex: 1;
        }
        
        .film-title {
            font-size: 28px;
            margin-bottom: 15px;
        }
        
        .film-director {
            font-size: 16px;
            color: #ccc;
            margin-bottom: 15px;
        }
        
        .film-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 15px;
            align-items: center;
        }
        
        .film-duration, .film-age-rating {
            background: rgba(120, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .film-description {
            line-height: 1.6;
            margin-top: 15px;
        }
        
        .film-screenings {
            padding: 0 30px 20px;
        }
        
        .screenings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .screening-item {
            background: rgba(30, 30, 30, 0.8);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .screening-date {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .screening-time {
            font-size: 18px;
            color: #ffd700;
            margin-bottom: 8px;
        }
        
        .screening-info {
            color: #ccc;
            margin-bottom: 8px;
        }
        
        .screening-seats {
            color: #8aff8a;
            margin-bottom: 15px;
        }
        
        .btn-book-screening {
            background: #780000;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .btn-book-screening:hover {
            background: #c1121f;
        }
        
        .similar-films {
            padding: 0 30px 30px;
        }
        
        .similar-films-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .similar-film-card {
            text-align: center;
            cursor: pointer;
            transition: transform 0.3s;
        }
        
        .similar-film-card:hover {
            transform: scale(1.05);
        }
        
        .similar-film-card img {
            width: 100%;
            height: 160px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        .similar-film-title {
            font-size: 12px;
            margin: 8px 0 4px;
        }
        
        .similar-film-rating {
            color: #ffd700;
            font-size: 12px;
        }
        
        /* Фільтри */
        .filters-panel {
            background: rgba(30, 30, 30, 0.8);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .filters-row {
            display: flex;
            gap: 20px;
            align-items: end;
            flex-wrap: wrap;
        }
        
        .filter-group {
            display: flex;
            flex-direction: column;
            min-width: 150px;
        }
        
        .filter-group label {
            color: #fff;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .filter-input, .filter-select {
            padding: 8px 12px;
            border: 1px solid #424242;
            border-radius: 4px;
            background: rgba(30, 30, 30, 0.8);
            color: #fff;
            font-size: 14px;
        }
        
        .filter-input:focus, .filter-select:focus {
            outline: none;
            border-color: #780000;
        }
        
        .btn-reset-filters {
            background: #424242;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .btn-reset-filters:hover {
            background: #666;
        }
        
        @media (max-width: 768px) {
            .film-details-header {
                flex-direction: column;
                text-align: center;
            }
            
            .film-poster-large img {
                width: 200px;
            }
            
            .screenings-grid {
                grid-template-columns: 1fr;
            }
            
            .filters-row {
                flex-direction: column;
                align-items: stretch;
            }
            
            .filter-group {
                min-width: auto;
            }
        }
    `;
    document.head.appendChild(styles);
});

// Глобальна змінна
window.filmsManager = filmsManager;