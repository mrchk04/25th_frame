// films-page.js - Логіка для сторінки фільмів з debug

class FilmsPage {
    constructor() {
        console.log('🎬 FilmsPage: Ініціалізація...');
        
        this.currentPage = 1;
        this.totalPages = 1;
        this.perPage = 12;
        this.currentFilters = {
            q: '',
            status: '',
            genre: '',
            limit: this.perPage,
            offset: 0
        };
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        console.log('🎬 FilmsPage: Початок ініціалізації');
        
        try {
            // Перевіряємо доступність filmsManager
            if (!window.filmsManager) {
                throw new Error('FilmsManager не доступний');
            }
            
            console.log('🎬 FilmsPage: FilmsManager знайдено');
            
            await this.setupPage();
            await this.loadInitialData();
            this.setupEventListeners();
            
            console.log('🎬 FilmsPage: Ініціалізація завершена успішно');
        } catch (error) {
            console.error('🎬 FilmsPage: Помилка ініціалізації:', error);
            this.showError('Помилка завантаження сторінки: ' + error.message);
        }
    }

    async setupPage() {
        console.log('🎬 FilmsPage: Налаштування сторінки');
        
        // Створюємо фільтри
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer && window.filmsManager) {
            console.log('🎬 FilmsPage: Створення фільтрів');
            window.filmsManager.createFiltersPanel(filtersContainer, (filters) => {
                console.log('🎬 FilmsPage: Застосування фільтрів:', filters);
                this.applyFilters(filters);
            });
        } else {
            console.warn('🎬 FilmsPage: Контейнер фільтрів не знайдено або FilmsManager недоступний');
        }

        // Показуємо статистику
        try {
            await this.loadAndShowStats();
        } catch (error) {
            console.warn('🎬 FilmsPage: Помилка завантаження статистики:', error);
        }
    }

    async loadInitialData() {
        console.log('🎬 FilmsPage: Завантаження початкових даних');
        await this.loadFilms();
    }

    async loadFilms(filters = this.currentFilters) {
        if (this.isLoading) {
            console.log('🎬 FilmsPage: Вже завантажуємо, пропускаємо');
            return;
        }
        
        console.log('🎬 FilmsPage: Початок завантаження фільмів з фільтрами:', filters);
        
        this.isLoading = true;
        this.showLoading();

        try {
            // Перевіряємо доступність API
            if (!window.filmsManager) {
                throw new Error('FilmsManager недоступний');
            }

            console.log('🎬 FilmsPage: Запит до API...');
            const data = await window.filmsManager.searchFilms(filters);
            
            console.log('🎬 FilmsPage: Отримані дані:', data);
            
            if (!data || !data.films) {
                throw new Error('Неправильний формат даних від сервера');
            }

            console.log(`🎬 FilmsPage: Знайдено ${data.films.length} фільмів`);
            
            this.renderFilms(data.films);
            this.updatePagination(data);
            this.hideNoResults();
            
            // Зберігаємо поточні фільтри
            this.currentFilters = { ...filters };
            
            console.log('🎬 FilmsPage: Фільми успішно завантажені');
            
        } catch (error) {
            console.error('🎬 FilmsPage: Помилка завантаження фільмів:', error);
            this.showError('Помилка завантаження фільмів: ' + error.message);
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    renderFilms(films) {
        console.log(`🎬 FilmsPage: Рендер ${films.length} фільмів`);
        
        const container = document.getElementById('movies-grid');
        if (!container) {
            console.error('🎬 FilmsPage: Контейнер movies-grid не знайдено');
            return;
        }

        if (!films || films.length === 0) {
            console.log('🎬 FilmsPage: Фільми не знайдені, показуємо повідомлення');
            this.showNoResults();
            this.hidePagination();
            return;
        }

        // Очищуємо контейнер
        container.innerHTML = '';

        // Відображаємо фільми з анімацією
        films.forEach((film, index) => {
            console.log(`🎬 FilmsPage: Рендер фільму ${index + 1}: ${film.title}`);
            
            if (!window.filmsManager.createMovieCard) {
                console.error('🎬 FilmsPage: Метод createMovieCard недоступний');
                return;
            }

            const movieCard = window.filmsManager.createMovieCard(film, {
                showRating: true,
                showStatus: true,
                clickable: true,
                showDescription: false
            });
            
            // Додаємо затримку для анімації
            movieCard.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(movieCard);
        });

        console.log('🎬 FilmsPage: Рендер завершено');
        this.showPagination();
    }

    async loadAndShowStats() {
        console.log('🎬 FilmsPage: Завантаження статистики');
        
        try {
            const data = await window.filmsManager.getFilmsStats();
            console.log('🎬 FilmsPage: Статистика отримана:', data);
            this.renderStats(data);
        } catch (error) {
            console.error('🎬 FilmsPage: Помилка завантаження статистики:', error);
        }
    }

    renderStats(data) {
        const statsContainer = document.getElementById('films-stats');
        if (!statsContainer) {
            console.warn('🎬 FilmsPage: Контейнер статистики не знайдено');
            return;
        }

        if (!data || !data.general) {
            console.warn('🎬 FilmsPage: Некоректні дані статистики');
            return;
        }

        console.log('🎬 FilmsPage: Відображення статистики');
        
        const totalElement = document.getElementById('total-films');
        const activeElement = document.getElementById('active-films');
        const upcomingElement = document.getElementById('upcoming-films');

        if (totalElement) totalElement.textContent = data.general.total_films || 0;
        if (activeElement) activeElement.textContent = data.general.active_films || 0;
        if (upcomingElement) upcomingElement.textContent = data.general.upcoming_films || 0;

        statsContainer.style.display = 'block';
    }

    updatePagination(data) {
        this.currentPage = data.page || 1;
        this.totalPages = data.totalPages || 1;

        console.log(`🎬 FilmsPage: Оновлення пагінації - сторінка ${this.currentPage} з ${this.totalPages}`);

        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (pageInfo) {
            pageInfo.textContent = `Сторінка ${this.currentPage} з ${this.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Показуємо пагінацію тільки якщо є більше однієї сторінки
        if (this.totalPages > 1) {
            this.showPagination();
        } else {
            this.hidePagination();
        }
    }

    async applyFilters(filters) {
        console.log('🎬 FilmsPage: Застосування фільтрів:', filters);
        
        // Скидаємо пагінацію при новому пошуку
        filters.offset = 0;
        filters.limit = this.perPage;
        
        this.currentPage = 1;
        await this.loadFilms(filters);
    }

    async changePage(direction) {
        const newPage = direction === 'next' ? this.currentPage + 1 : this.currentPage - 1;
        
        console.log(`🎬 FilmsPage: Зміна сторінки на ${newPage}`);
        
        if (newPage < 1 || newPage > this.totalPages) return;

        const filters = {
            ...this.currentFilters,
            offset: (newPage - 1) * this.perPage
        };

        await this.loadFilms(filters);
        
        // Прокручуємо до початку списку фільмів
        document.getElementById('movies-grid').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    async changePerPage(newPerPage) {
        console.log(`🎬 FilmsPage: Зміна кількості на сторінці: ${newPerPage}`);
        
        this.perPage = parseInt(newPerPage);
        
        const filters = {
            ...this.currentFilters,
            limit: this.perPage,
            offset: 0
        };

        this.currentPage = 1;
        await this.loadFilms(filters);
    }

    setupEventListeners() {
        console.log('🎬 FilmsPage: Налаштування обробників подій');
        
        // Пагінація
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const perPageSelect = document.getElementById('per-page');
        const resetSearchBtn = document.getElementById('reset-search');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.changePage('prev');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.changePage('next');
            });
        }

        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.changePerPage(e.target.value);
            });
        }

        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Обробка URL параметрів
        this.handleUrlParams();
        
        // Слухаємо зміни в URL
        window.addEventListener('popstate', () => {
            this.handleUrlParams();
        });
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const filters = {
            q: urlParams.get('search') || '',
            status: urlParams.get('status') || '',
            genre: urlParams.get('genre') || '',
            limit: this.perPage,
            offset: 0
        };

        console.log('🎬 FilmsPage: URL параметри:', filters);

        // Оновлюємо форму фільтрів
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const genreFilter = document.getElementById('genre-filter');

        if (searchInput) searchInput.value = filters.q;
        if (statusFilter) statusFilter.value = filters.status;
        if (genreFilter) genreFilter.value = filters.genre;

        // Завантажуємо фільми з новими фільтрами
        if (Object.values(filters).some(value => value !== '' && value !== this.perPage && value !== 0)) {
            this.applyFilters(filters);
        }
    }

    updateUrl(filters) {
        const params = new URLSearchParams();
        
        if (filters.q) params.set('search', filters.q);
        if (filters.status) params.set('status', filters.status);
        if (filters.genre) params.set('genre', filters.genre);
        if (this.currentPage > 1) params.set('page', this.currentPage);

        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.pushState({}, '', newUrl);
    }

    resetFilters() {
        console.log('🎬 FilmsPage: Скидання фільтрів');
        
        // Очищуємо форму
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const genreFilter = document.getElementById('genre-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (genreFilter) genreFilter.value = '';

        // Скидаємо фільтри
        const defaultFilters = {
            q: '',
            status: '',
            genre: '',
            limit: this.perPage,
            offset: 0
        };

        this.applyFilters(defaultFilters);
        
        // Очищуємо URL
        window.history.pushState({}, '', window.location.pathname);
    }

    // Методи показу/приховування елементів
    showLoading() {
        console.log('🎬 FilmsPage: Показ індикатора завантаження');
        const loading = document.getElementById('loading-indicator');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        console.log('🎬 FilmsPage: Приховування індикатора завантаження');
        const loading = document.getElementById('loading-indicator');
        if (loading) loading.style.display = 'none';
    }

    showNoResults() {
        console.log('🎬 FilmsPage: Показ повідомлення "не знайдено"');
        const noResults = document.getElementById('no-results');
        if (noResults) noResults.style.display = 'block';
    }

    hideNoResults() {
        const noResults = document.getElementById('no-results');
        if (noResults) noResults.style.display = 'none';
    }

    showPagination() {
        const pagination = document.getElementById('pagination-container');
        if (pagination) pagination.style.display = 'flex';
    }

    hidePagination() {
        const pagination = document.getElementById('pagination-container');
        if (pagination) pagination.style.display = 'none';
    }

    showError(message) {
        console.error('🎬 FilmsPage: Показ помилки:', message);
        
        // Створюємо повідомлення про помилку
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>⚠️ Помилка</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-retry">Спробувати знову</button>
            </div>
        `;

        const container = document.getElementById('movies-grid');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }

    // Метод для програмного встановлення фільтрів (для використання з інших сторінок)
    setFilters(filters) {
        Object.assign(this.currentFilters, filters);
        this.applyFilters(this.currentFilters);
        this.updateUrl(this.currentFilters);
    }

    // Отримання поточного стану сторінки
    getState() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            perPage: this.perPage,
            currentFilters: { ...this.currentFilters },
            isLoading: this.isLoading
        };
    }
}

// Ініціалізація сторінки фільмів
let filmsPage;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 DOM завантажений, ініціалізація FilmsPage');
    
    // Чекаємо поки завантажиться filmsManager
    const initFilmsPage = () => {
        if (window.filmsManager) {
            console.log('🎬 FilmsManager знайдено, створюємо FilmsPage');
            filmsPage = new FilmsPage();
            window.filmsPage = filmsPage; // Робимо доступним глобально
        } else {
            console.log('🎬 FilmsManager ще не готовий, чекаємо...');
            setTimeout(initFilmsPage, 100);
        }
    };
    
    initFilmsPage();
});

// Додаємо CSS стилі для помилок
document.addEventListener('DOMContentLoaded', function() {
    const styles = document.createElement('style');
    styles.textContent = `
        .error-message {
            text-align: center;
            padding: 50px 20px;
            grid-column: 1 / -1;
        }
        
        .error-content {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.3);
            border-radius: 10px;
            padding: 30px;
            max-width: 400px;
            margin: 0 auto;
            color: #fff;
        }
        
        .error-content h3 {
            color: #f44336;
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .error-content p {
            margin-bottom: 20px;
            color: #ccc;
        }
        
        .btn-retry {
            background: #f44336;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .btn-retry:hover {
            background: #d32f2f;
        }
    `;
    document.head.appendChild(styles);
});