// admin.js - Скрипт для адміністративної панелі кінотеатру

class AdminPanel {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.currentSection = 'dashboard';
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        
        this.init();
    }

    async init() {
        // Перевіряємо авторизацію
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        try {
            await this.checkAuth();
            this.setupEventListeners();
            this.loadDashboard();
        } catch (error) {
            console.error('Помилка ініціалізації:', error);
            this.redirectToLogin();
        }
    }

    // Перевірка авторизації та прав доступу
    async checkAuth() {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Unauthorized');

            const data = await response.json();
            this.currentUser = data.user;

            if (this.currentUser.role !== 'admin') {
                alert('У вас немає прав доступу до адмін-панелі!');
                window.location.href = 'index.html';
                return;
            }

            this.updateUserInfo();
        } catch (error) {
            throw new Error('Auth failed');
        }
    }

    // Оновлення інформації про користувача в інтерфейсі
    updateUserInfo() {
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        
        if (userNameElement) userNameElement.textContent = this.currentUser.name;
        if (userRoleElement) userRoleElement.textContent = 'Адміністратор';
    }

    // Перенаправлення на сторінку входу
    redirectToLogin() {
        alert('Необхідно авторизуватися!');
        window.location.href = 'login.html';
    }

    // Налаштування обробників подій
    setupEventListeners() {
        // Навігація по сайдбару
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e.target);
            });
        });

        // Кнопки в заголовку панелі
        const addMovieBtn = document.querySelector('.btn-primary');
        if (addMovieBtn) {
            addMovieBtn.addEventListener('click', () => this.showAddMovieModal());
        }

        // Кнопка виходу
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Обробники для форм
        this.setupFormHandlers();
    }

    // Навігація по розділах
    handleNavigation(target) {
        // Знімаємо активний клас з усіх пунктів меню
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Додаємо активний клас до обраного пункту
        target.classList.add('active');

        // Визначаємо розділ
        const text = target.textContent.trim();
        
        switch (text) {
            case 'Панель керування':
                this.currentSection = 'dashboard';
                this.loadDashboard();
                break;
            case 'Фільми':
                this.currentSection = 'films';
                this.loadFilmsSection();
                break;
            case 'Розклад сеансів':
                this.currentSection = 'screenings';
                this.loadScreeningsSection();
                break;
            case 'Квитки':
                this.currentSection = 'tickets';
                this.loadTicketsSection();
                break;
            case 'Користувачі':
                this.currentSection = 'users';
                this.loadUsersSection();
                break;
            case 'Статистика':
                this.currentSection = 'statistics';
                this.loadStatisticsSection();
                break;
            case 'Налаштування':
                this.currentSection = 'settings';
                this.loadSettingsSection();
                break;
        }
    }

    // Завантаження дашборду
    async loadDashboard() {
        this.updatePanelTitle('Панель керування');
        
        try {
            // Завантажуємо статистику
            const statsResponse = await fetch(`${this.baseURL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.updateStatsCards(statsData.stats);
            }

            // Завантажуємо список фільмів для таблиці
            const filmsResponse = await fetch(`${this.baseURL}/api/films`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (filmsResponse.ok) {
                const filmsData = await filmsResponse.json();
                this.updateMoviesTable(filmsData.films);
            }

        } catch (error) {
            console.error('Помилка завантаження дашборду:', error);
            this.showNotification('Помилка завантаження даних', 'error');
        }
    }

    // Оновлення карток статистики
    updateStatsCards(stats) {
        const cards = document.querySelectorAll('.stats-card');
        if (cards.length >= 4) {
            cards[0].querySelector('h3').textContent = stats.activeFilms;
            cards[1].querySelector('h3').textContent = stats.ticketsSold.toLocaleString();
            cards[2].querySelector('h3').textContent = stats.registeredUsers.toLocaleString();
            cards[3].querySelector('h3').textContent = `₴${stats.monthlyRevenue.toLocaleString()}`;
        }
    }

    // Оновлення таблиці фільмів
    updateMoviesTable(films) {
        const tbody = document.querySelector('.movies-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        films.slice(0, 10).forEach(film => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${film.title}</td>
                <td>${film.director || 'Не вказано'}</td>
                <td>${film.release_date ? new Date(film.release_date).toLocaleDateString('uk-UA') : 'Не вказано'}</td>
                <td>
                    <span class="status-badge status-${film.status}">
                        ${this.getStatusText(film.status)}
                    </span>
                </td>
                <td>
                    <div class="movie-actions">
                        <button class="action-btn edit-btn" data-id="${film.id}">
                            <img src="./assets/icons/Pencil.png" alt="Edit">
                        </button>
                        <button class="action-btn delete-btn" data-id="${film.id}">
                            <img src="./assets/icons/Wastebasket.png" alt="Delete">
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Додаємо обробники для кнопок редагування та видалення
        this.setupTableActions();
    }

    // Отримання тексту статусу українською
    getStatusText(status) {
        const statusMap = {
            'active': 'Активний',
            'upcoming': 'Незабаром',
            'inactive': 'Неактивний'
        };
        return statusMap[status] || status;
    }

    // Налаштування обробників для дій в таблиці
    setupTableActions() {
        // Кнопки редагування
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filmId = e.currentTarget.dataset.id;
                this.editMovie(filmId);
            });
        });

        // Кнопки видалення
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filmId = e.currentTarget.dataset.id;
                this.deleteMovie(filmId);
            });
        });
    }

    // Розділ управління фільмами
    async loadFilmsSection() {
        this.updatePanelTitle('Управління фільмами');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Управління фільмами</h1>
                <div class="panel-actions">
                    <button class="btn btn-primary" onclick="adminPanel.showAddMovieModal()">Додати фільм</button>
                </div>
            </div>
            
            <div class="section-controls">
                <input type="text" class="form-control search-input" placeholder="Пошук фільмів..." id="filmsSearch">
                <select class="form-control" id="statusFilter">
                    <option value="">Всі статуси</option>
                    <option value="active">Активні</option>
                    <option value="upcoming">Незабаром</option>
                    <option value="inactive">Неактивні</option>
                </select>
            </div>

            <table class="movies-table">
                <thead>
                    <tr>
                        <th>Постер</th>
                        <th>Назва фільму</th>
                        <th>Режисер</th>
                        <th>Дата прем'єри</th>
                        <th>Тривалість</th>
                        <th>Статус</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody id="filmsTableBody">
                    <tr><td colspan="7" class="text-center">Завантаження...</td></tr>
                </tbody>
            </table>
        `;

        // Завантажуємо фільми
        await this.loadFilmsData();
        
        // Налаштовуємо пошук та фільтрацію
        this.setupFilmsFilters();
    }

    // Завантаження даних фільмів
    async loadFilmsData() {
        try {
            const response = await fetch(`${this.baseURL}/api/films`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayFilmsData(data.films);
            } else {
                throw new Error('Failed to load films');
            }
        } catch (error) {
            console.error('Помилка завантаження фільмів:', error);
            document.getElementById('filmsTableBody').innerHTML = 
                '<tr><td colspan="7" class="text-center">Помилка завантаження даних</td></tr>';
        }
    }

    // Відображення даних фільмів
    displayFilmsData(films) {
        const tbody = document.getElementById('filmsTableBody');
        if (!tbody) return;

        if (films.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Фільми не знайдені</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        films.forEach(film => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="movie-poster">
                        <img src="${film.poster_url || './assets/images/no-poster.jpg'}" 
                             alt="${film.title}" style="width: 40px; height: 60px; object-fit: cover;">
                    </div>
                </td>
                <td>
                    <div class="movie-details">
                        <strong>${film.title}</strong>
                        <small>${film.genres || ''}</small>
                    </div>
                </td>
                <td>${film.director || 'Не вказано'}</td>
                <td>${film.release_date ? new Date(film.release_date).toLocaleDateString('uk-UA') : 'Не вказано'}</td>
                <td>${film.duration ? film.duration + ' хв' : 'Не вказано'}</td>
                <td>
                    <span class="status-badge status-${film.status}">
                        ${this.getStatusText(film.status)}
                    </span>
                </td>
                <td>
                    <div class="movie-actions">
                        <button class="action-btn edit-btn" data-id="${film.id}" title="Редагувати">
                            <img src="./assets/icons/Pencil.png" alt="Edit">
                        </button>
                        <button class="action-btn delete-btn" data-id="${film.id}" title="Видалити">
                            <img src="./assets/icons/Wastebasket.png" alt="Delete">
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.setupTableActions();
    }

    // Налаштування фільтрів для фільмів
    setupFilmsFilters() {
        const searchInput = document.getElementById('filmsSearch');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterFilms());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterFilms());
        }
    }

    // Фільтрація фільмів
    async filterFilms() {
        const searchTerm = document.getElementById('filmsSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        try {
            const response = await fetch(`${this.baseURL}/api/films`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                let filteredFilms = data.films;

                // Фільтрація за пошуковим запитом
                if (searchTerm) {
                    filteredFilms = filteredFilms.filter(film => 
                        film.title.toLowerCase().includes(searchTerm) ||
                        (film.director && film.director.toLowerCase().includes(searchTerm)) ||
                        (film.genres && film.genres.toLowerCase().includes(searchTerm))
                    );
                }

                // Фільтрація за статусом
                if (statusFilter) {
                    filteredFilms = filteredFilms.filter(film => film.status === statusFilter);
                }

                this.displayFilmsData(filteredFilms);
            }
        } catch (error) {
            console.error('Помилка фільтрації:', error);
        }
    }

    // Модальне вікно для додавання фільму
    showAddMovieModal() {
        this.showMovieModal();
    }

    // Редагування фільму
    async editMovie(filmId) {
        try {
            const response = await fetch(`${this.baseURL}/api/films/${filmId}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.showMovieModal(data.film);
            } else {
                throw new Error('Failed to load film data');
            }
        } catch (error) {
            console.error('Помилка завантаження фільму:', error);
            this.showNotification('Помилка завантаження даних фільму', 'error');
        }
    }

    // Універсальне модальне вікно для фільмів
    showMovieModal(film = null) {
        const isEdit = film !== null;
        const modalHTML = `
            <div class="modal" id="movieModal">
                <div class="modal-content" style="max-width: 600px;">
                    <h3>${isEdit ? 'Редагування фільму' : 'Додавання нового фільму'}</h3>
                    <form id="movieForm" enctype="multipart/form-data">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="movieTitle">Назва фільму *</label>
                                <input type="text" id="movieTitle" class="form-control" 
                                       value="${film?.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="movieDirector">Режисер</label>
                                <input type="text" id="movieDirector" class="form-control" 
                                       value="${film?.director || ''}">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="movieDescription">Опис</label>
                            <textarea id="movieDescription" class="form-control" rows="4">${film?.description || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="movieReleaseDate">Дата прем'єри</label>
                                <input type="date" id="movieReleaseDate" class="form-control" 
                                       value="${film?.release_date ? film.release_date.split('T')[0] : ''}">
                            </div>
                            <div class="form-group">
                                <label for="movieDuration">Тривалість (хв)</label>
                                <input type="number" id="movieDuration" class="form-control" 
                                       value="${film?.duration || ''}" min="1">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="movieGenres">Жанри</label>
                                <input type="text" id="movieGenres" class="form-control" 
                                       value="${film?.genres || ''}" placeholder="Наприклад: Бойовик, Комедія">
                            </div>
                            <div class="form-group">
                                <label for="movieStatus">Статус</label>
                                <select id="movieStatus" class="form-control">
                                    <option value="upcoming" ${film?.status === 'upcoming' ? 'selected' : ''}>Незабаром</option>
                                    <option value="active" ${film?.status === 'active' ? 'selected' : ''}>Активний</option>
                                    <option value="inactive" ${film?.status === 'inactive' ? 'selected' : ''}>Неактивний</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="moviePoster">Постер фільму</label>
                            <input type="file" id="moviePoster" class="form-control" accept="image/*">
                            ${film?.poster_url ? `<small>Поточний постер: ${film.poster_url}</small>` : ''}
                        </div>
                    </form>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="adminPanel.closeModal()">Скасувати</button>
                        <button type="button" class="btn btn-primary" onclick="adminPanel.saveMovie(${film?.id || null})">
                            ${isEdit ? 'Зберегти зміни' : 'Додати фільм'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Збереження фільму
    async saveMovie(filmId = null) {
        const formData = new FormData();
        const isEdit = filmId !== null;

        // Збираємо дані з форми
        const title = document.getElementById('movieTitle').value.trim();
        const director = document.getElementById('movieDirector').value.trim();
        const description = document.getElementById('movieDescription').value.trim();
        const releaseDate = document.getElementById('movieReleaseDate').value;
        const duration = document.getElementById('movieDuration').value.trim();
        const genres = document.getElementById('movieGenres').value.trim();
        const status = document.getElementById('movieStatus').value;

        // Валідація обов'язкових полів
        if (!title) {
            this.showNotification('Назва фільму обов\'язкова', 'warning');
            return;
        }

        // Додаємо дані до FormData
        formData.append('title', title);
        
        if (director) formData.append('director', director);
        if (description) formData.append('description', description);
        if (releaseDate) formData.append('release_date', releaseDate);
        if (duration && duration !== '' && !isNaN(parseInt(duration))) {
            formData.append('duration', parseInt(duration));
        }
        if (genres) formData.append('genres', genres);
        formData.append('status', status);

        const posterFile = document.getElementById('moviePoster').files[0];
        if (posterFile) {
            formData.append('poster', posterFile);
        }

        try {
            const url = isEdit ? `${this.baseURL}/api/films/${filmId}` : `${this.baseURL}/api/films`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            if (response.ok) {
                this.showNotification(
                    isEdit ? 'Фільм успішно оновлено!' : 'Фільм успішно додано!', 
                    'success'
                );
                this.closeModal();
                
                // Оновлюємо дані залежно від поточного розділу
                if (this.currentSection === 'films') {
                    await this.loadFilmsData();
                } else {
                    await this.loadDashboard();
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка збереження');
            }
        } catch (error) {
            console.error('Помилка збереження фільму:', error);
            this.showNotification('Помилка збереження фільму: ' + error.message, 'error');
        }
    }

    // Видалення фільму
    async deleteMovie(filmId) {
        if (!confirm('Ви впевнені, що хочете видалити цей фільм? Цю дію неможливо скасувати.')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/films/${filmId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                this.showNotification('Фільм успішно видалено!', 'success');
                
                // Оновлюємо дані
                if (this.currentSection === 'films') {
                    await this.loadFilmsData();
                } else {
                    await this.loadDashboard();
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка видалення');
            }
        } catch (error) {
            console.error('Помилка видалення фільму:', error);
            this.showNotification('Помилка видалення фільму: ' + error.message, 'error');
        }
    }

    // Розділ управління сеансами
    async loadScreeningsSection() {
        this.updatePanelTitle('Розклад сеансів');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Розклад сеансів</h1>
                <div class="panel-actions">
                    <button class="btn btn-primary" onclick="adminPanel.showAddScreeningModal()">Додати сеанс</button>
                </div>
            </div>

            <table class="movies-table">
                <thead>
                    <tr>
                        <th>Фільм</th>
                        <th>Дата та час</th>
                        <th>Зал</th>
                        <th>Ціна</th>
                        <th>Доступні місця</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody id="screeningsTableBody">
                    <tr><td colspan="6" class="text-center">Завантаження...</td></tr>
                </tbody>
            </table>
        `;

        await this.loadScreeningsData();
    }

    // Завантаження даних сеансів
    async loadScreeningsData() {
        try {
            const response = await fetch(`${this.baseURL}/api/screenings`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayScreeningsData(data.screenings);
            } else {
                throw new Error('Failed to load screenings');
            }
        } catch (error) {
            console.error('Помилка завантаження сеансів:', error);
            document.getElementById('screeningsTableBody').innerHTML = 
                '<tr><td colspan="6" class="text-center">Помилка завантаження даних</td></tr>';
        }
    }

    // Відображення даних сеансів
    displayScreeningsData(screenings) {
        const tbody = document.getElementById('screeningsTableBody');
        if (!tbody) return;

        if (screenings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Сеанси не знайдені</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        screenings.forEach(screening => {
            const row = document.createElement('tr');
            const screeningDate = new Date(screening.screening_time);
            
            row.innerHTML = `
                <td>${screening.film_title}</td>
                <td>${screeningDate.toLocaleDateString('uk-UA')} ${screeningDate.toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'})}</td>
                <td>Зал ${screening.hall_number}</td>
                <td>₴${screening.price}</td>
                <td>${screening.available_seats}</td>
                <td>
                    <div class="movie-actions">
                        <button class="action-btn delete-btn" data-id="${screening.id}" title="Видалити">
                            <img src="./assets/icons/Wastebasket.png" alt="Delete">
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Додаємо обробники для кнопок видалення сеансів
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screeningId = e.currentTarget.dataset.id;
                this.deleteScreening(screeningId);
            });
        });
    }

    // Модальне вікно для додавання сеансу
    async showAddScreeningModal() {
        // Спочатку завантажуємо список фільмів
        try {
            const response = await fetch(`${this.baseURL}/api/films`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load films');
            }

            const data = await response.json();
            const films = data.films.filter(film => film.status === 'active');

            if (films.length === 0) {
                this.showNotification('Немає активних фільмів для створення сеансу', 'warning');
                return;
            }

            const modalHTML = `
                <div class="modal" id="screeningModal">
                    <div class="modal-content">
                        <h3>Додавання нового сеансу</h3>
                        <form id="screeningForm">
                            <div class="form-group">
                                <label for="screeningFilm">Фільм *</label>
                                <select id="screeningFilm" class="form-control" required>
                                    <option value="">Оберіть фільм</option>
                                    ${films.map(film => `<option value="${film.id}">${film.title}</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="screeningDateTime">Дата та час *</label>
                                    <input type="datetime-local" id="screeningDateTime" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label for="screeningHall">Номер залу *</label>
                                    <input type="number" id="screeningHall" class="form-control" min="1" max="10" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="screeningPrice">Ціна квитка (₴) *</label>
                                    <input type="number" id="screeningPrice" class="form-control" min="0" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label for="screeningSeats">Кількість місць *</label>
                                    <input type="number" id="screeningSeats" class="form-control" min="1" max="200" required>
                                </div>
                            </div>
                        </form>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="adminPanel.closeModal()">Скасувати</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveScreening()">Додати сеанс</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Встановлюємо мінімальну дату (сьогодні)
            const now = new Date();
            const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('screeningDateTime').min = minDateTime;

        } catch (error) {
            console.error('Помилка завантаження фільмів:', error);
            this.showNotification('Помилка завантаження списку фільмів', 'error');
        }
    }

    // Збереження сеансу
    async saveScreening() {
        const filmId = document.getElementById('screeningFilm').value;
        const screeningTime = document.getElementById('screeningDateTime').value;
        const hallNumber = document.getElementById('screeningHall').value;
        const price = document.getElementById('screeningPrice').value;
        const availableSeats = document.getElementById('screeningSeats').value;

        if (!filmId || !screeningTime || !hallNumber || !price || !availableSeats) {
            this.showNotification('Будь ласка, заповніть всі обов\'язкові поля', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/screenings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    film_id: parseInt(filmId),
                    screening_time: screeningTime,
                    hall_number: parseInt(hallNumber),
                    price: parseFloat(price),
                    available_seats: parseInt(availableSeats)
                })
            });

            if (response.ok) {
                this.showNotification('Сеанс успішно додано!', 'success');
                this.closeModal();
                await this.loadScreeningsData();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка збереження');
            }
        } catch (error) {
            console.error('Помилка збереження сеансу:', error);
            this.showNotification('Помилка збереження сеансу: ' + error.message, 'error');
        }
    }

    // Видалення сеансу
    async deleteScreening(screeningId) {
        if (!confirm('Ви впевнені, що хочете видалити цей сеанс?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/screenings/${screeningId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                this.showNotification('Сеанс успішно видалено!', 'success');
                await this.loadScreeningsData();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка видалення');
            }
        } catch (error) {
            console.error('Помилка видалення сеансу:', error);
            this.showNotification('Помилка видалення сеансу: ' + error.message, 'error');
        }
    }

    // Розділ управління користувачами
    async loadUsersSection() {
        this.updatePanelTitle('Управління користувачами');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Управління користувачами</h1>
            </div>

            <table class="movies-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Ім'я</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Роль</th>
                        <th>Дата реєстрації</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <tr><td colspan="7" class="text-center">Завантаження...</td></tr>
                </tbody>
            </table>
        `;

        await this.loadUsersData();
    }

    // Завантаження даних користувачів
    async loadUsersData() {
        try {
            const response = await fetch(`${this.baseURL}/api/users`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayUsersData(data.users);
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Помилка завантаження користувачів:', error);
            document.getElementById('usersTableBody').innerHTML = 
                '<tr><td colspan="7" class="text-center">Помилка завантаження даних</td></tr>';
        }
    }

    // Відображення даних користувачів
    displayUsersData(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Користувачі не знайдені</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            const createdDate = new Date(user.created_at).toLocaleDateString('uk-UA');
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'Не вказано'}</td>
                <td>
                    <select class="form-control role-select" data-user-id="${user.id}" style="width: auto;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Користувач</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адміністратор</option>
                    </select>
                </td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="adminPanel.changeUserRole(${user.id})">
                        Змінити роль
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Зміна ролі користувача
    async changeUserRole(userId) {
        const selectElement = document.querySelector(`[data-user-id="${userId}"]`);
        const newRole = selectElement.value;

        if (!confirm(`Ви впевнені, що хочете змінити роль цього користувача на "${newRole === 'admin' ? 'Адміністратор' : 'Користувач'}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                this.showNotification('Роль користувача успішно змінено!', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка зміни ролі');
            }
        } catch (error) {
            console.error('Помилка зміни ролі:', error);
            this.showNotification('Помилка зміни ролі: ' + error.message, 'error');
            // Повертаємо попереднє значення
            await this.loadUsersData();
        }
    }

    // Розділ квитків
    async loadTicketsSection() {
        this.updatePanelTitle('Управління квитками');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Управління квитками</h1>
            </div>
            
            <div class="section-info">
                <p>Тут буде відображена інформація про продані квитки. Функціонал буде додано в наступних версіях.</p>
            </div>
        `;
    }

    // Розділ статистики
    async loadStatisticsSection() {
        this.updatePanelTitle('Статистика');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Детальна статистика</h1>
            </div>
            
            <div class="admin-cards" id="detailedStats">
                <div class="stats-card">
                    <div class="card-icon">
                        <img src="./assets/icons/Film Frames.png" alt="Movies">
                    </div>
                    <div class="card-info">
                        <h3 id="totalFilms">-</h3>
                        <p>Загалом фільмів</p>
                    </div>
                </div>
                <div class="stats-card">
                    <div class="card-icon">
                        <img src="./assets/icons/Calendar_e.png" alt="Screenings">
                    </div>
                    <div class="card-info">
                        <h3 id="totalScreenings">-</h3>
                        <p>Загалом сеансів</p>
                    </div>
                </div>
                <div class="stats-card">
                    <div class="card-icon">
                        <img src="./assets/icons/Admission Tickets.png" alt="Tickets">
                    </div>
                    <div class="card-info">
                        <h3 id="totalTickets">-</h3>
                        <p>Загалом квитків</p>
                    </div>
                </div>
                <div class="stats-card">
                    <div class="card-icon">
                        <img src="./assets/icons/Bar Chart.png" alt="Revenue">
                    </div>
                    <div class="card-info">
                        <h3 id="totalRevenue">-</h3>
                        <p>Загальний дохід</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadDetailedStatistics();
    }

    // Завантаження детальної статистики
    async loadDetailedStatistics() {
        try {
            // Завантажуємо статистику
            const statsResponse = await fetch(`${this.baseURL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            // Завантажуємо фільми
            const filmsResponse = await fetch(`${this.baseURL}/api/films`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            // Завантажуємо сеанси
            const screeningsResponse = await fetch(`${this.baseURL}/api/screenings`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (statsResponse.ok && filmsResponse.ok && screeningsResponse.ok) {
                const stats = await statsResponse.json();
                const films = await filmsResponse.json();
                const screenings = await screeningsResponse.json();

                // Оновлюємо статистику
                document.getElementById('totalFilms').textContent = films.films.length;
                document.getElementById('totalScreenings').textContent = screenings.screenings.length;
                document.getElementById('totalTickets').textContent = stats.stats.ticketsSold;
                document.getElementById('totalRevenue').textContent = `₴${stats.stats.monthlyRevenue.toLocaleString()}`;
            }
        } catch (error) {
            console.error('Помилка завантаження статистики:', error);
        }
    }

    // Розділ налаштувань
    async loadSettingsSection() {
        this.updatePanelTitle('Налаштування');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="panel-header">
                <h1 class="panel-title">Налаштування системи</h1>
            </div>
            
            <div class="edit-form">
                <h3>Інформація про профіль</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ім'я</label>
                        <input type="text" class="form-control" value="${this.currentUser?.name || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" class="form-control" value="${this.currentUser?.email || ''}" readonly>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Роль</label>
                        <input type="text" class="form-control" value="Адміністратор" readonly>
                    </div>
                    <div class="form-group">
                        <label>Телефон</label>
                        <input type="text" class="form-control" value="${this.currentUser?.phone || 'Не вказано'}" readonly>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.exportData()">Експортувати дані</button>
                    <button class="btn btn-danger" onclick="adminPanel.logout()">Вийти з системи</button>
                </div>
            </div>
        `;
    }

    // Експорт даних (заглушка)
    exportData() {
        this.showNotification('Функція експорту буде додана в наступних версіях', 'info');
    }

    // Вихід з системи
    logout() {
        if (confirm('Ви впевнені, що хочете вийти з системи?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    }

    // Налаштування обробників форм
    setupFormHandlers() {
        // Загальні обробники для форм будуть додані тут при необхідності
    }

    // Оновлення заголовка панелі
    updatePanelTitle(title) {
        const titleElement = document.querySelector('.panel-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    // Закриття модального вікна
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
    }

    // Відображення повідомлень
    showNotification(message, type = 'info') {
        // Видаляємо попередні повідомлення
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Встановлюємо колір залежно від типу
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FF9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Автоматично видаляємо через 5 секунд
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Додаємо можливість закрити клікуванням
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    // Показ завантаження
    showLoading() {
        const loadingHTML = `
            <div class="loading-overlay" id="loadingOverlay">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Завантаження...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    // Приховування завантаження
    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.remove();
        }
    }
}

// Ініціалізація адмін-панелі при завантаженні сторінки
let adminPanel;

document.addEventListener('DOMContentLoaded', function() {
    adminPanel = new AdminPanel();
});

// Глобальні функції для використання в HTML
window.adminPanel = adminPanel;