// booking.js - Повноцінна система бронювання квитків

class BookingSystem {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        this.screening = null;
        this.selectedSeats = [];
        this.occupiedSeats = [];
        this.timer = null;
        this.bookingTimeLimit = 15 * 60; // 15 минут в секундах
        this.remainingTime = this.bookingTimeLimit;
        
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
            await this.loadScreeningData();
            await this.loadOccupiedSeats();
            this.generateSeatingMap();
            this.setupEventListeners();
            this.startBookingTimer();
        } catch (error) {
            console.error('Помилка ініціалізації:', error);
            this.showNotification('Помилка завантаження даних', 'error');
        }
    }

    // Перевірка авторизації
    async checkAuth() {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Unauthorized');

            const data = await response.json();
            this.currentUser = data.user;
        } catch (error) {
            this.redirectToLogin();
            throw error;
        }
    }

    // Перенаправлення на сторінку входу
    redirectToLogin() {
        alert('Для бронювання квитків необхідно авторизуватися!');
        window.location.href = 'login.html';
    }

    // Завантаження даних сеансу
    async loadScreeningData() {
        const urlParams = new URLSearchParams(window.location.search);
        const screeningId = urlParams.get('screening') || 1; // Заглушка для демо

        try {
            const response = await fetch(`${this.baseURL}/api/screenings/${screeningId}`);
            
            if (!response.ok) {
                throw new Error('Сеанс не знайдено');
            }

            const data = await response.json();
            this.screening = data.screening;
            this.updateMovieInfo();
        } catch (error) {
            console.error('Помилка завантаження сеансу:', error);
            // Використовуємо заглушку для демо
            this.screening = {
                id: 1,
                film_title: 'Аватар',
                duration: 162,
                screening_time: '2025-04-14T15:30:00',
                hall_number: 4,
                price: 150,
                poster_url: './assets/images/avatar.webp'
            };
            this.updateMovieInfo();
        }
    }

    // Завантаження зайнятих місць
    async loadOccupiedSeats() {
        try {
            const response = await fetch(`${this.baseURL}/api/screenings/${this.screening.id}/seats`);
            
            if (response.ok) {
                const data = await response.json();
                this.occupiedSeats = data.occupiedSeats || [];
            } else {
                // Заглушка для демо
                this.occupiedSeats = ['1-1', '1-3', '1-5', '1-7', '1-9', '2-2', '2-4', '2-6', '2-8', 
                                   '3-3', '3-7', '4-2', '4-6', '4-8', '5-1', '5-3', '5-5', '5-7', '5-9'];
            }
        } catch (error) {
            console.error('Помилка завантаження зайнятих місць:', error);
            // Використовуємо заглушку
            this.occupiedSeats = ['1-1', '1-3', '1-5', '1-7', '1-9', '2-2', '2-4', '2-6', '2-8', 
                               '3-3', '3-7', '4-2', '4-6', '4-8', '5-1', '5-3', '5-5', '5-7', '5-9'];
        }
    }

    // Оновлення інформації про фільм
    updateMovieInfo() {
        document.querySelector('.movie-title').textContent = this.screening.film_title;
        
        const sessionDate = new Date(this.screening.screening_time);
        const endTime = new Date(sessionDate.getTime() + this.screening.duration * 60000);
        
        document.querySelector('.info-item:nth-child(1) .info-text').textContent = `Зал № ${this.screening.hall_number}`;
        document.querySelector('.info-item:nth-child(2) .info-text').innerHTML = 
            `${this.formatDate(sessionDate)}<br>${sessionDate.toLocaleDateString('uk-UA')}`;
        document.querySelector('.info-item:nth-child(3) .info-text').textContent = 
            `${this.formatTime(sessionDate)} - ${this.formatTime(endTime)}`;
        
        if (this.screening.poster_url) {
            document.querySelector('.poster-img').src = this.screening.poster_url;
        }

        document.querySelector('.duration-text').textContent = `${this.screening.duration} хв`;
    }

    // Генерація схеми залу
    generateSeatingMap() {
        const seatsMap = document.querySelector('.seats-map');
        seatsMap.innerHTML = '';
        
        const seatConfig = {
            rows: 6,
            seatsPerRow: 9
        };

        for (let i = 1; i <= seatConfig.rows; i++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';
            
            // Номер ряду
            const rowNumber = document.createElement('div');
            rowNumber.className = 'row-number';
            rowNumber.textContent = i;
            rowDiv.appendChild(rowNumber);
            
            for (let j = 1; j <= seatConfig.seatsPerRow; j++) {
                const seatId = `${i}-${j}`;
                const seatButton = document.createElement('button');
                seatButton.className = 'seat';
                seatButton.dataset.id = seatId;
                seatButton.textContent = j;
                
                if (this.occupiedSeats.includes(seatId)) {
                    seatButton.classList.add('seat-reserved');
                    seatButton.disabled = true;
                    seatButton.title = 'Місце вже заброньоване';
                } else {
                    seatButton.classList.add('seat-free');
                    seatButton.addEventListener('click', (e) => this.handleSeatSelection(e));
                    seatButton.title = 'Вільне місце. Натисніть для вибору';
                }
                
                rowDiv.appendChild(seatButton);
            }
            
            seatsMap.appendChild(rowDiv);
        }
    }

    // Обробка вибору місця
    handleSeatSelection(e) {
        const seat = e.target;
        const seatId = seat.dataset.id;
        const [row, number] = seatId.split('-');
        
        if (seat.classList.contains('seat-selected')) {
            // Скасування вибору
            seat.classList.remove('seat-selected');
            seat.classList.add('seat-free');
            seat.title = 'Вільне місце. Натисніть для вибору';
            
            const index = this.selectedSeats.findIndex(s => s.id === seatId);
            if (index !== -1) {
                this.selectedSeats.splice(index, 1);
            }
            
            this.showNotification(`Ви скасували вибір місця ${number} в ряду ${row}`);
        } else {
            // Вибір місця
            seat.classList.remove('seat-free');
            seat.classList.add('seat-selected');
            seat.title = 'Обране місце. Натисніть для скасування';
            
            this.selectedSeats.push({
                id: seatId,
                row: parseInt(row),
                seat: parseInt(number),
                price: parseFloat(this.screening.price)
            });
            
            this.showNotification(`Ви вибрали місце ${number} в ряду ${row}`);
        }
        
        this.updatePriceList();
    }

    // Оновлення списку цін
    updatePriceList() {
        const priceList = document.querySelector('.price-list');
        priceList.innerHTML = '';
        
        const totalPrice = this.selectedSeats.reduce((sum, seat) => {
            return sum + parseFloat(seat.price);
        }, 0);
        
        // Загальна інформація
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'price-item';
        
        if (this.selectedSeats.length > 0) {
            const ticketWord = this.getTicketWord(this.selectedSeats.length);
            summaryDiv.innerHTML = `<span class="price-text">${this.selectedSeats.length} ${ticketWord}, ${totalPrice} грн</span>`;
        } else {
            summaryDiv.innerHTML = `<span class="price-text">Квитки не вибрано</span>`;
        }
        
        priceList.appendChild(summaryDiv);
        
        // Інформація про кожне місце
        this.selectedSeats.forEach(seat => {
            const priceItem = document.createElement('div');
            priceItem.className = 'price-item';
            priceItem.innerHTML = `
                <span class="price-label">${seat.row} ряд ${seat.seat} місце</span>
                <span class="price-amount">${seat.price} грн</span>
            `;
            priceList.appendChild(priceItem);
        });
        
        // Активація кнопки "Продовжити"
        const continueBtn = document.querySelector('.btn-continue');
        continueBtn.disabled = this.selectedSeats.length === 0;
        continueBtn.classList.toggle('disabled', this.selectedSeats.length === 0);
    }

    // Правильна форма слова "квиток"
    getTicketWord(count) {
        if (count === 1) return "квиток";
        if (count >= 2 && count <= 4) return "квитки";
        return "квитків";
    }

    // Налаштування обробників подій
    setupEventListeners() {
        const continueBtn = document.querySelector('.btn-continue');
        continueBtn.addEventListener('click', () => this.handlePurchase());
        
        // Попередження при спробі покинути сторінку
        window.addEventListener('beforeunload', (e) => {
            if (this.selectedSeats.length > 0) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }

    // Таймер бронювання
    startBookingTimer() {
        const durationElement = document.querySelector('.duration-info');
        durationElement.innerHTML = `
            <img src="./assets/icons/timer.png" class="timer-icon">
            <span class="duration-text timer-active">${this.formatTime(this.remainingTime)}</span>
        `;
        
        const timerHint = document.createElement('div');
        timerHint.className = 'timer-hint';
        timerHint.textContent = 'Час на завершення бронювання';
        durationElement.appendChild(timerHint);
        
        this.timer = setInterval(() => {
            this.remainingTime--;
            
            const timerElement = document.querySelector('.duration-text');
            timerElement.textContent = this.formatTime(this.remainingTime);
            
            if (this.remainingTime <= 60) {
                timerElement.classList.add('timer-warning');
            }
            
            if (this.remainingTime <= 30) {
                timerElement.classList.add('timer-critical');
            }
            
            if (this.remainingTime <= 0) {
                clearInterval(this.timer);
                this.handleTimeExpired();
            }
        }, 1000);
    }

    // Обробка закінчення часу
    handleTimeExpired() {
        this.showTimeoutModal();
    }

    // Обробка купівлі квитків
    async handlePurchase() {
        if (this.selectedSeats.length === 0) {
            this.showNotification('Спочатку виберіть хоча б одне місце', 'warning');
            return;
        }
        
        this.showConfirmationModal();
    }

    // Підтвердження покупки
    async confirmPurchase() {
        const seatIds = this.selectedSeats.map(seat => seat.id);
        
        try {
            this.showLoading();
            
            const response = await fetch(`${this.baseURL}/api/tickets/book`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    screeningId: this.screening.id,
                    seats: seatIds
                })
            });

            this.hideLoading();

            if (response.ok) {
                const data = await response.json();
                this.showSuccessModal(data);
                clearInterval(this.timer);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Помилка бронювання');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Помилка купівлі квитків:', error);
            this.showNotification('Помилка купівлі квитків: ' + error.message, 'error');
        }
    }

    // Модальні вікна
    showConfirmationModal() {
        const modal = this.createModal('confirmation');
        const totalPrice = this.selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Підтвердження бронювання</h2>
                </div>
                <div class="modal-body">
                    <div class="modal-movie-info">
                        <p><strong>Фільм:</strong> ${this.screening.film_title}</p>
                        <p><strong>Зал:</strong> № ${this.screening.hall_number}</p>
                        <p><strong>Дата:</strong> ${new Date(this.screening.screening_time).toLocaleDateString('uk-UA')}</p>
                        <p><strong>Час:</strong> ${this.formatTime(new Date(this.screening.screening_time))}</p>
                    </div>
                    <div class="modal-seats-info">
                        <p><strong>Обрані місця:</strong></p>
                        <ul>
                            ${this.selectedSeats.map(seat => `<li>${seat.row} ряд, ${seat.seat} місце</li>`).join('')}
                        </ul>
                    </div>
                    <div class="modal-price-info">
                        <p><strong>Загальна сума:</strong> ${totalPrice} грн</p>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button cancel" onclick="bookingSystem.closeModal()">Скасувати</button>
                    <button class="modal-button confirm" onclick="bookingSystem.confirmPurchase()">Підтвердити покупку</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showSuccessModal(data) {
        const modal = this.createModal('success');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header success">
                    <h2>✅ Квитки успішно куплено!</h2>
                </div>
                <div class="modal-body">
                    <p>Ваші квитки заброньовано на ім'я: <strong>${this.currentUser.name}</strong></p>
                    <p>Перевірте ваш профіль для перегляду всіх квитків.</p>
                    <div class="booking-details">
                        <p><strong>Номери квитків:</strong></p>
                        <ul>
                            ${data.tickets.map(ticket => 
                                `<li>Квиток #${ticket.id} - ${ticket.seat_row} ряд, ${ticket.seat_number} місце</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button" onclick="window.location.href='profile.html'">Переглянути в профілі</button>
                    <button class="modal-button" onclick="window.location.href='index.html'">На головну</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showTimeoutModal() {
        const modal = this.createModal('timeout');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header error">
                    <h2>⏰ Час бронювання закінчився</h2>
                </div>
                <div class="modal-body">
                    <p>На жаль, час на бронювання місць вичерпано.</p>
                    <p>Ви можете розпочати процес бронювання знову.</p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button" onclick="window.location.reload()">Почати знову</button>
                    <button class="modal-button" onclick="window.location.href='schedule.html'">До розкладу</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    createModal(type) {
        const modal = document.createElement('div');
        modal.className = `modal modal-${type}`;
        return modal;
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
    }

    // Завантаження
    showLoading() {
        const loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Обробка замовлення...</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();
    }

    // Повідомлення
    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#FF9800',
            info: '#2196F3'
        };

        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            max-width: 300px;
            background-color: ${colors[type] || colors.info};
            transform: translateX(110%);
            transition: transform 0.3s ease;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(110%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        notification.addEventListener('click', () => notification.remove());
    }

    // Утилітарні функції
    formatTime(input) {
        if (typeof input === 'number') {
            // Форматування секунд в MM:SS
            const minutes = Math.floor(input / 60);
            const seconds = input % 60;
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else if (input instanceof Date) {
            // Форматування Date в HH:MM
            return input.toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'});
        }
        return '';
    }

    formatDate(date) {
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
        return days[date.getDay()];
    }
}

// Ініціалізація системи бронювання
let bookingSystem;

document.addEventListener('DOMContentLoaded', function() {
    bookingSystem = new BookingSystem();
    
    // Додаємо CSS стилі
    const styles = document.createElement('style');
    styles.textContent = `
        .timer-icon {
            animation: pulse 1.5s infinite;
        }
        
        .timer-active {
            color: #fff;
            transition: color 0.3s ease;
        }
        
        .timer-warning {
            color: #ffeb99;
            animation: blink 1s infinite;
        }
        
        .timer-critical {
            color: #c1121f;
            animation: blink 0.5s infinite;
            font-weight: bold;
        }
        
        .timer-hint {
            position: absolute;
            bottom: -20px;
            font-size: 12px;
            color: #aaa;
            text-align: center;
            width: 100%;
        }
        
        .modal-header.success {
            background-color: #4CAF50;
        }
        
        .modal-header.error {
            background-color: #f44336;
        }
        
        .booking-details {
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.1);
            border-radius: 5px;
        }
        
        .booking-details ul {
            list-style-type: disc;
            margin-left: 20px;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
        }
        
        .loading-spinner {
            text-align: center;
            color: white;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #780000;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .btn-continue.disabled {
            background-color: #424242;
            cursor: not-allowed;
        }
        
        .row-number {
            width: 20px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-right: 5px;
        }
    `;
    document.head.appendChild(styles);
});

// Глобальна функція для використання в HTML
window.bookingSystem = bookingSystem;