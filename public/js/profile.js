class UserProfile {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        this.userTickets = [];
        
        this.init();
    }

    async init() {
        if (!this.token || !localStorage.getItem('currentUser')) {
            window.location.href = 'login.html';
            return;
        }

        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.renderUserData(this.currentUser);
        this.setupEventListeners();
        await this.loadUserTickets();
    }

    renderUserData(userData) {
        document.getElementById('user-name').textContent = `Вітаємо, ${userData.name || 'Користувач'}!`;
        document.getElementById('name').value = userData.name || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('birthday').value = userData.birthday || '';

        if (userData.settings) {
            document.getElementById('email-notifications').checked = !!userData.settings.emailNotifications;
            document.getElementById('sms-notifications').checked = !!userData.settings.smsNotifications;
        }
    }

    setupEventListeners() {
        // Перемикання між вкладками
        const tabLinks = document.querySelectorAll('.profile-menu li');
        const tabContents = document.querySelectorAll('.profile-tab');

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                e.target.classList.add('active');
                const tabId = e.target.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');

                // Завантажуємо дані при переключенні на вкладку квитків
                if (tabId === 'tickets') {
                    this.loadUserTickets();
                }
            });
        });

        // Форма особистих даних
        document.getElementById('personal-info-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePersonalInfo();
        });

        // Форма налаштувань
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSettings();
        });

        // Кнопка виходу
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    // Завантаження квитків користувача
    async loadUserTickets() {
        try {
            const response = await fetch(`${this.baseURL}/api/tickets/my`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.userTickets = data.tickets;
                this.renderTickets();
            } else {
                throw new Error('Помилка завантаження квитків');
            }
        } catch (error) {
            console.error('Помилка завантаження квитків:', error);
            this.showTicketsError();
        }
    }

    // Відображення квитків
    renderTickets() {
        const ticketsContainer = document.getElementById('tickets-container');
        
        if (this.userTickets.length === 0) {
            ticketsContainer.innerHTML = '<p class="no-data-message">У вас поки немає квитків</p>';
            return;
        }

        ticketsContainer.innerHTML = '';
        
        // Групуємо квитки за сеансами
        const groupedTickets = this.groupTicketsBySession();
        
        Object.entries(groupedTickets).forEach(([sessionKey, tickets]) => {
            const ticketGroup = this.createTicketGroup(sessionKey, tickets);
            ticketsContainer.appendChild(ticketGroup);
        });
    }

    // Групування квитків за сеансами
    groupTicketsBySession() {
        return this.userTickets.reduce((groups, ticket) => {
            const sessionKey = `${ticket.film_title}-${ticket.session_date}-${ticket.hall_id}`;
            if (!groups[sessionKey]) {
                groups[sessionKey] = [];
            }
            groups[sessionKey].push(ticket);
            return groups;
        }, {});
    }

    // Створення групи квитків для одного сеансу
    createTicketGroup(sessionKey, tickets) {
        const firstTicket = tickets[0];
        const sessionDate = new Date(firstTicket.session_date);
        const isUpcoming = sessionDate > new Date();
        const canCancel = this.canCancelTicket(sessionDate);

        const ticketGroup = document.createElement('div');
        ticketGroup.className = 'ticket-card';
        
        // Коректний розрахунок загальної вартості
        const totalCost = tickets.reduce((sum, ticket) => {
            return sum + parseFloat(ticket.price || 0);
        }, 0);
        
        // Форматування дати
        const formattedDate = sessionDate.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const formattedTime = sessionDate.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        ticketGroup.innerHTML = `
            <div class="ticket-card-header">
                <div class="movie-title-section">
                    <h3 class="movie-title">${firstTicket.film_title}</h3>
                    <span class="ticket-badge">${tickets.length} ${this.getTicketWord(tickets.length)}</span>
                </div>
            </div>
            
            <div class="ticket-card-body">
                <div class="session-info-grid">
                    <div class="info-item">
                        <div class="info-label">Дата:</div>
                        <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Час:</div>
                        <div class="info-value">${formattedTime}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Зал:</div>
                        <div class="info-value">№${firstTicket.hall_id}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Статус:</div>
                        <div class="info-value">
                            <span class="status-indicator ${isUpcoming ? 'active' : 'past'}">
                                ${isUpcoming ? 'Майбутній сеанс' : 'Завершений сеанс'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="seats-section">
                    <div class="seats-header">
                        <span class="seats-icon">🎫</span>
                        <span class="seats-title">Місця:</span>
                    </div>
                    <div class="seats-list">
                        ${tickets.map(ticket => `
                            <div class="seat-item">
                                <div class="seat-location">
                                    <span class="seat-row">Ряд ${ticket.seat_row}</span>
                                    <span class="seat-number">Місце ${ticket.seat_number}</span>
                                </div>
                                <div class="seat-price">${parseFloat(ticket.price).toFixed(2)} грн</div>
                                <div class="seat-ticket-id">Квиток №${ticket.id}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="ticket-card-footer">
                <div class="total-section">
                    <span class="total-label">Загально вартість:</span>
                    <span class="total-amount">${totalCost.toFixed(2)} грн</span>
                </div>
                
                ${canCancel ? `
                    <button class="cancel-button" data-session="${sessionKey}">
                        <span class="cancel-icon">🗑️</span>
                        Скасувати
                    </button>` : ''}
            </div>
        `;

        // Додаємо обробник для скасування квитків
        const cancelBtn = ticketGroup.querySelector('.cancel-button');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelTickets(tickets);
            });
        }

        return ticketGroup;
    }

    // Перевірка можливості скасування квитка
    canCancelTicket(sessionDate) {
        const now = new Date();
        const timeDiff = sessionDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff > 2; // Можна скасувати за 2+ години до сеансу
    }

    // Скасування квитків
    async cancelTickets(tickets) {
        const firstTicket = tickets[0];
        const sessionDate = new Date(firstTicket.session_date);
        
        if (!this.canCancelTicket(sessionDate)) {
            this.showNotification('Квитки можна скасувати не пізніше ніж за 2 години до початку сеансу', 'warning');
            return;
        }

        const confirmMessage = `Ви впевнені, що хочете скасувати ${tickets.length} ${this.getTicketWord(tickets.length)} на фільм "${firstTicket.film_title}"?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            let cancelledCount = 0;
            
            for (const ticket of tickets) {
                const response = await fetch(`${this.baseURL}/api/tickets/${ticket.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });

                if (response.ok) {
                    cancelledCount++;
                } else {
                    const errorData = await response.json();
                    console.error(`Помилка скасування квитка ${ticket.id}:`, errorData.message);
                }
            }

            if (cancelledCount > 0) {
                this.showNotification(`Успішно скасовано ${cancelledCount} ${this.getTicketWord(cancelledCount)}`, 'success');
                await this.loadUserTickets(); // Перезавантажуємо список квитків
            } else {
                this.showNotification('Не вдалося скасувати жодного квитка', 'error');
            }

        } catch (error) {
            console.error('Помилка скасування квитків:', error);
            this.showNotification('Помилка скасування квитків', 'error');
        }
    }

    // Правильна форма слова "квиток"
    getTicketWord(count) {
        if (count === 1) return "квиток";
        if (count >= 2 && count <= 4) return "квитки";
        return "квитків";
    }

    // Показ помилки завантаження квитків
    showTicketsError() {
        const ticketsContainer = document.getElementById('tickets-container');
        ticketsContainer.innerHTML = `
            <div class="error-message">
                <p>Помилка завантаження квитків</p>
                <button class="btn-retry" onclick="userProfile.loadUserTickets()">Спробувати знову</button>
            </div>
        `;
    }

    // Оновлення особистої інформації
    updatePersonalInfo() {
        this.currentUser = {
            ...this.currentUser,
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthday: document.getElementById('birthday').value
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.renderUserData(this.currentUser);

        this.showNotification('Дані успішно оновлено!', 'success');
    }

    // Оновлення налаштувань
    updateSettings() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (currentPassword && newPassword) {
            if (newPassword !== confirmPassword) {
                this.showNotification('Новий пароль та підтвердження паролю не співпадають!', 'warning');
                return;
            }
            this.showNotification('Пароль успішно змінено!', 'success');
        }

        this.currentUser.settings = {
            emailNotifications: document.getElementById('email-notifications').checked,
            smsNotifications: document.getElementById('sms-notifications').checked
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        if (!currentPassword) {
            this.showNotification('Налаштування успішно оновлено!', 'success');
        }
    }

    // Вихід з системи
    logout() {
        if (confirm('Ви впевнені, що хочете вийти з системи?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    }

    // Показ повідомлень
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
}

// Ініціалізація профілю користувача
let userProfile;

document.addEventListener('DOMContentLoaded', function() {
    userProfile = new UserProfile();
    
    // Додаємо CSS стилі для квитків
    const styles = document.createElement('style');
    styles.textContent = `
        /* Основна картка */
    .ticket-card {
        background: #2a2a2a;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        transition: all 0.3s ease;
        border: 1px solid #404040;
    }
    
    .ticket-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border-color: #666;
    }
    
    /* Хедер */
    .ticket-card-header {
        padding: 20px 24px;
        background: #333;
        border-bottom: 1px solid #404040;
    }
    
    .movie-title-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .movie-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.3;
    }
    
    .ticket-badge {
        background: #780000;
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
    }
    
    /* Тіло картки */
    .ticket-card-body {
        padding: 24px;
    }
    
    /* Сітка інформації про сеанс */
    .session-info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .info-label {
        font-size: 13px;
        color: #999;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .info-value {
        font-size: 15px;
        color: #ffffff;
        font-weight: 500;
    }
    
    .status-indicator {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .status-indicator.active {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
        border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .status-indicator.past {
        background: rgba(158, 158, 158, 0.2);
        color: #9E9E9E;
        border: 1px solid rgba(158, 158, 158, 0.3);
    }
    
    /* Секція місць */
    .seats-section {
        border-top: 1px solid #404040;
        padding-top: 20px;
    }
    
    .seats-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
    }
    
    .seats-icon {
        font-size: 16px;
    }
    
    .seats-title {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
    }
    
    .seats-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .seat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #363636;
        border-radius: 8px;
        border: 1px solid #484848;
        transition: all 0.2s ease;
    }
    
    .seat-item:hover {
        background: #404040;
        border-color: #666;
    }
    
    .seat-location {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .seat-row {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
    }
    
    .seat-number {
        font-size: 13px;
        color: #ccc;
    }
    
    .seat-price {
        font-size: 15px;
        font-weight: 600;
        color: #4CAF50;
    }
    
    .seat-ticket-id {
        font-size: 11px;
        color: #888;
        font-family: 'Courier New', monospace;
        letter-spacing: 0.5px;
    }
    
    /* Футер */
    .ticket-card-footer {
        padding: 20px 24px;
        background: #333;
        border-top: 1px solid #404040;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .total-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #2a2a2a;
        border-radius: 8px;
        border: 1px solid #484848;
    }
    
    .total-label {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
    }
    
    .total-amount {
        font-size: 18px;
        font-weight: 700;
        color: #4CAF50;
    }
    
    .cancel-button {
        width: 100%;
        padding: 14px 20px;
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
    }
    
    .cancel-button:hover {
        background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
    }
    
    .cancel-button:active {
        transform: translateY(0);
    }
    
    .cancel-icon {
        font-size: 14px;
    }
    
    /* Адаптивність */
    @media (max-width: 768px) {
        .session-info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }
        
        .movie-title-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }
        
        .ticket-badge {
            align-self: flex-end;
        }
        
        .seat-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            text-align: left;
        }
        
        .seat-ticket-id {
            align-self: flex-end;
        }
    }
    
    @media (max-width: 480px) {
        .ticket-card-header,
        .ticket-card-body,
        .ticket-card-footer {
            padding: 16px 20px;
        }
        
        .movie-title {
            font-size: 18px;
        }
        
        .total-section {
            padding: 12px 16px;
        }
        
        .cancel-button {
            padding: 12px 16px;
            font-size: 13px;
        }
    }
    
    /* Покращення для темної теми */
    .tickets-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }
    
    /* Анімації */
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .ticket-card {
        animation: slideIn 0.3s ease-out;
    }
    `;
    document.head.appendChild(styles);
});

// Глобальна функція
window.userProfile = userProfile;