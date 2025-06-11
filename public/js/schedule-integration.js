document.addEventListener('DOMContentLoaded', function() {
    loadScheduleData();
    setupScheduleEventListeners();
});

// Завантаження даних розкладу з сервера
async function loadScheduleData() {
    try {
        const response = await fetch('http://localhost:3000/api/screenings');
        
        if (response.ok) {
            const data = await response.json();
            renderScheduleTable(data.screenings);
        } else {
            console.error('Помилка завантаження розкладу');
            // Залишаємо статичні дані як заглушку
        }
    } catch (error) {
        console.error('Помилка з\'єднання з сервером:', error);
        // Залишаємо статичні дані як заглушку
    }
}

// Відображення таблиці розкладу
function renderScheduleTable(screenings) {
    if (!screenings || screenings.length === 0) return;
    
    // Групуємо сеанси за фільмами
    const groupedScreenings = groupScreeningsByFilm(screenings);
    
    // Оновлюємо десктопну версію
    updateDesktopSchedule(groupedScreenings);
    
    // Оновлюємо мобільну версію
    updateMobileSchedule(groupedScreenings);
}

// Групування сеансів за фільмами
function groupScreeningsByFilm(screenings) {
    return screenings.reduce((groups, screening) => {
        const filmTitle = screening.film_title;
        if (!groups[filmTitle]) {
            groups[filmTitle] = {
                title: filmTitle,
                screenings: []
            };
        }
        groups[filmTitle].screenings.push(screening);
        return groups;
    }, {});
}

// Оновлення десктопного розкладу
function updateDesktopSchedule(groupedScreenings) {
    const scheduleTable = document.querySelector('.schedule-table');
    if (!scheduleTable) return;
    
    scheduleTable.innerHTML = '';
    
    Object.values(groupedScreenings).forEach(filmData => {
        const movieRow = document.createElement('div');
        movieRow.className = 'movie-row';
        
        // Інформація про фільм
        const movieInfo = document.createElement('div');
        movieInfo.className = 'movie-info';
        movieInfo.innerHTML = `<img src="./assets/images/avatar.webp" alt="${filmData.title}" class="movie-poster">`;
        movieRow.appendChild(movieInfo);
        
        // Створюємо комірки для кожного дня тижня
        for (let day = 10; day <= 16; day++) {
            const showtimeCell = document.createElement('div');
            showtimeCell.className = 'showtime-cell';
            
            // Фільтруємо сеанси для поточного дня
            const dayScreenings = filmData.screenings.filter(screening => {
                const screeningDate = new Date(screening.screening_time);
                return screeningDate.getDate() === day;
            });
            
            // Додаємо посилання на сеанси
            dayScreenings.forEach(screening => {
                const screeningDate = new Date(screening.screening_time);
                const timeString = screeningDate.toLocaleTimeString('uk-UA', {
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                
                const showtimeLink = document.createElement('a');
                showtimeLink.href = `booking.html?screening=${screening.id}`;
                showtimeLink.className = 'showtime-link';
                showtimeLink.textContent = timeString;
                showtimeLink.title = `${filmData.title} - ${timeString}`;
                
                // Додаємо обробник для перевірки авторизації
                showtimeLink.addEventListener('click', handleBookingClick);
                
                showtimeCell.appendChild(showtimeLink);
            });
            
            movieRow.appendChild(showtimeCell);
        }
        
        scheduleTable.appendChild(movieRow);
    });
}

// Оновлення мобільного розкладу
function updateMobileSchedule(groupedScreenings) {
    const mobileCards = document.querySelector('.mobile-movie-cards');
    if (!mobileCards) return;
    
    mobileCards.innerHTML = '';
    
    Object.values(groupedScreenings).forEach(filmData => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        
        // Визначаємо дати, коли є сеанси
        const availableDates = [...new Set(filmData.screenings.map(screening => {
            return new Date(screening.screening_time).getDate();
        }))];
        
        movieCard.setAttribute('data-dates', availableDates.join(','));
        
        movieCard.innerHTML = `
            <div class="movie-card-header">
                <img src="./assets/images/avatar.webp" alt="${filmData.title}" class="movie-card-poster">
                <div class="movie-card-title">${filmData.title}</div>
            </div>
            <div class="movie-card-times">
                ${generateMobileScreeningTimes(filmData.screenings)}
            </div>
        `;
        
        mobileCards.appendChild(movieCard);
    });
    
    // Налаштовуємо обробники для мобільної версії
    setupMobileEventListeners();
}

// Генерація часів сеансів для мобільної версії
function generateMobileScreeningTimes(screenings) {
    const groupedByDate = screenings.reduce((groups, screening) => {
        const date = new Date(screening.screening_time);
        const dateKey = date.getDate();
        const dayName = getDayName(date);
        
        if (!groups[dateKey]) {
            groups[dateKey] = {
                dayName: dayName,
                screenings: []
            };
        }
        groups[dateKey].screenings.push(screening);
        return groups;
    }, {});
    
    return Object.entries(groupedByDate).map(([dateKey, dateData]) => {
        const screeningLinks = dateData.screenings.map(screening => {
            const timeString = new Date(screening.screening_time).toLocaleTimeString('uk-UA', {
                hour: '2-digit', 
                minute: '2-digit'
            });
            
            return `<a href="booking.html?screening=${screening.id}" class="showtime-link" onclick="handleBookingClick(event)">${timeString}</a>`;
        }).join('');
        
        return `
            <div class="day-label">${dateData.dayName}, ${dateKey}</div>
            ${screeningLinks}
        `;
    }).join('');
}

// Отримання назви дня тижня
function getDayName(date) {
    const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    return days[date.getDay()];
}

// Обробник кліку на сеанс
function handleBookingClick(event) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        event.preventDefault();
        
        // Показуємо модальне вікно з пропозицією авторизації
        showAuthRequiredModal(event.target.href);
        return false;
    }
    
    // Якщо користувач авторизований, дозволяємо перехід
    return true;
}

// Модальне вікно вимоги авторизації
function showAuthRequiredModal(bookingUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Необхідна авторизація</h2>
            </div>
            <div class="modal-body">
                <p>Для бронювання квитків необхідно увійти в систему або зареєструватися.</p>
                <p>Це займе лише кілька хвилин!</p>
            </div>
            <div class="modal-buttons">
                <button class="modal-button cancel" onclick="closeAuthModal()">Скасувати</button>
                <button class="modal-button" onclick="goToLogin('${bookingUrl}')">Увійти</button>
                <button class="modal-button confirm" onclick="goToRegister('${bookingUrl}')">Зареєструватися</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Закриття модального вікна авторизації
function closeAuthModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Перехід на сторінку входу
function goToLogin(returnUrl) {
    localStorage.setItem('returnUrl', returnUrl);
    window.location.href = 'login.html';
}

// Перехід на сторінку реєстрації
function goToRegister(returnUrl) {
    localStorage.setItem('returnUrl', returnUrl);
    window.location.href = 'login.html#register';
}

// Налаштування обробників подій для розкладу
function setupScheduleEventListeners() {
    // Навігація по тижнях (якщо потрібно)
    const navArrows = document.querySelectorAll('.nav-arrow');
    navArrows.forEach(arrow => {
        arrow.addEventListener('click', function() {
            // Тут можна додати логіку навігації по тижнях
            console.log('Navigation clicked');
        });
    });
    
    // Вибір дати в заголовку (для виділення активного дня)
    const dateHeaders = document.querySelectorAll('.date-header');
    dateHeaders.forEach(header => {
        header.addEventListener('click', function() {
            dateHeaders.forEach(h => h.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Налаштування мобільних обробників
function setupMobileEventListeners() {
    // Вибір дати для мобільної версії
    const dateSelectors = document.querySelectorAll('.date-selector-item');
    const movieCards = document.querySelectorAll('.movie-card');
    
    if (dateSelectors.length > 0) {
        dateSelectors.forEach(selector => {
            selector.addEventListener('click', function() {
                dateSelectors.forEach(sel => sel.classList.remove('active'));
                this.classList.add('active');
                
                const selectedDate = this.getAttribute('data-date');
                
                movieCards.forEach(card => {
                    const availableDates = card.getAttribute('data-dates').split(',');
                    if (availableDates.includes(selectedDate)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
        
        // Вибираємо перший день за замовчуванням
        dateSelectors[0].click();
    }
}

// Функція для оновлення статичних посилань до динамічних
function updateStaticLinks() {
    // Оновлюємо статичні посилання в HTML до динамічних
    const staticLinks = document.querySelectorAll('a[href="./booking.html"], a[href="#"]');
    
    staticLinks.forEach(link => {
        if (link.classList.contains('showtime-link')) {
            // Додаємо обробник для перевірки авторизації
            link.addEventListener('click', function(event) {
                const token = localStorage.getItem('authToken');
                
                if (!token) {
                    event.preventDefault();
                    showAuthRequiredModal(this.href || 'booking.html?screening=1');
                    return false;
                }
            });
        }
    });
}

// Додавання CSS стилів для модального вікна
function addModalStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: #1e1e1e;
            width: 90%;
            max-width: 400px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }
        
        .modal-header {
            background: #780000;
            color: white;
            padding: 15px 20px;
            text-align: center;
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 20px;
        }
        
        .modal-body {
            padding: 20px;
            color: white;
            text-align: center;
            line-height: 1.5;
        }
        
        .modal-buttons {
            display: flex;
            gap: 10px;
            padding: 0 20px 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .modal-button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            min-width: 80px;
        }
        
        .modal-button.cancel {
            background: #424242;
            color: white;
        }
        
        .modal-button.cancel:hover {
            background: #333;
        }
        
        .modal-button.confirm {
            background: #780000;
            color: white;
        }
        
        .modal-button.confirm:hover {
            background: #c1121f;
        }
        
        .modal-button:not(.cancel):not(.confirm) {
            background: #2196F3;
            color: white;
        }
        
        .modal-button:not(.cancel):not(.confirm):hover {
            background: #1976D2;
        }
        
        @media (max-width: 576px) {
            .modal-content {
                width: 95%;
                margin: 20px;
            }
            
            .modal-buttons {
                flex-direction: column;
            }
            
            .modal-button {
                width: 100%;
                margin-bottom: 10px;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    addModalStyles();
    updateStaticLinks();
    
    // Перевіряємо, чи є returnUrl після авторизації
    const returnUrl = localStorage.getItem('returnUrl');
    if (returnUrl && localStorage.getItem('authToken')) {
        localStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
    }
});

// Глобальні функції для використання в HTML
window.handleBookingClick = handleBookingClick;
window.closeAuthModal = closeAuthModal;
window.goToLogin = goToLogin;
window.goToRegister = goToRegister;