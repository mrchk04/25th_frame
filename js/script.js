// Функція для реалізації таймера бронювання
function initializeBookingTimer() {
    // Елемент, який містить час
    const durationElement = document.querySelector('.duration-text');
    
    let totalSeconds = 15 * 60;
    
    // Додаємо червону іконку таймера для акцентування уваги
    const durationInfo = document.querySelector('.duration-info');
    durationInfo.innerHTML = `
        <img src="./assets/icons/timer.png" class="timer-icon">
        <span class="duration-text timer-active">${formatTime(totalSeconds)}</span>
    `;
    
    // Додаємо пояснювальний текст
    const timerHint = document.createElement('div');
    timerHint.className = 'timer-hint';
    timerHint.textContent = 'Час на завершення бронювання';
    durationInfo.appendChild(timerHint);
    
    // Запускаємо таймер
    const timerInterval = setInterval(() => {
        totalSeconds--;
        
        // Оновлюємо відображення часу
        const timerElement = document.querySelector('.duration-text');
        timerElement.textContent = formatTime(totalSeconds);
        
        // Додаємо анімацію блимання, коли залишається мало часу
        if (totalSeconds <= 60) {
            timerElement.classList.add('timer-warning');
        }
        
        // Критичний час - останні 30 секунд
        if (totalSeconds <= 30) {
            timerElement.classList.add('timer-critical');
        }
        
        // Якщо час вийшов
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            handleTimeExpired();
        }
    }, 1000);
    
    // Функція форматування часу у вигляді MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    
    // Обробка закінчення часу
    function handleTimeExpired() {
        // Показуємо модальне вікно про закінчення часу
        const modalContent = `
            <div class="modal-timeout">
                <div class="modal-timeout-header">
                    <h2>Час бронювання закінчився</h2>
                </div>
                <div class="modal-timeout-body">
                    <p>На жаль, час на бронювання місць вичерпано.</p>
                    <p>Ви можете розпочати процес бронювання знову.</p>
                </div>
                <div class="modal-timeout-footer">
                    <button class="restart-button">Почати знову</button>
                </div>
            </div>
        `;
        
        // Створюємо модальне вікно
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // Обробник натискання на кнопку "Почати знову"
        modal.querySelector('.restart-button').addEventListener('click', () => {
            document.body.removeChild(modal);
            window.location.reload(); // Перезавантажуємо сторінку для початку нового бронювання
        });
    }
    
    // Додаємо стилі для таймера
    const timerStyles = document.createElement('style');
    timerStyles.textContent = `
        .duration-info {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
        }
        
        .timer-icon {
            animation: pulse 1.5s infinite;
        }
        
        .duration-text {
            font-size: 24px;
            font-weight: bold;
            margin-left: 10px;
            color: #fff;
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
            margin-bottom: 5px;
            font-size: 12px;
            color: #aaa;
            text-align: center;
            width: 100%;
        }
        
        /* Модальне вікно закінчення часу */
        .modal-timeout {
            background-color: #1e1e1e;
            width: 400px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        }
        
        .modal-timeout-header {
            background-color: #c1121f;
            color: white;
            padding: 15px;
            text-align: center;
        }
        
        .modal-timeout-body {
            padding: 20px;
            color: white;
            text-align: center;
        }
        
        .modal-timeout-footer {
            padding: 15px;
            text-align: center;
        }
        
        .restart-button {
            background-color: #780000;
            color: white;
            padding: 10px 25px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        
        .restart-button:hover {
            background-color: #c1121f;
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
    `;
    document.head.appendChild(timerStyles);
}

document.addEventListener('DOMContentLoaded', function() {
     // Конфігурація залу (рядки та місця)
     const seatConfig = {
        rows: 6,
        seatsPerRow: 9,
        // Місця, які вже заброньовані (рядок-місце)
        reservedSeats: ['1-1', '1-3', '1-5', '1-7', '1-9', '2-2', '2-4', '2-6', '2-8', 
                        '3-3', '3-7', '4-2', '4-6', '4-8', '5-1', '5-3', '5-5', '5-7', '5-9']
    };

    // Відстежування вибраних місць
    let selectedSeats = [];
    let totalPrice = 0;
    const pricePerSeat = 150;

    // Генерація схеми залу
    const seatsMap = document.querySelector('.seats-map');
    
    // Створюємо структуру залу
    for (let i = 1; i <= seatConfig.rows; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        // Додаємо номер ряду
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
            
            // Визначаємо статус місця
            if (seatConfig.reservedSeats.includes(seatId)) {
                seatButton.classList.add('seat-reserved');
                seatButton.disabled = true;
                seatButton.title = 'Місце вже заброньоване';
            } else {
                seatButton.classList.add('seat-free');
                seatButton.addEventListener('click', handleSeatSelection);
                seatButton.title = 'Вільне місце. Натисніть для вибору';
            }
            
            rowDiv.appendChild(seatButton);
        }
        
        seatsMap.appendChild(rowDiv);
    }

    // Обробник вибору місця
    function handleSeatSelection(e) {
        const seat = e.target;
        const seatId = seat.dataset.id;
        const [row, number] = seatId.split('-');
        
        if (seat.classList.contains('seat-selected')) {
            // Скасування вибору місця
            seat.classList.remove('seat-selected');
            seat.classList.add('seat-free');
            seat.title = 'Вільне місце. Натисніть для вибору';
            
            // Оновлюємо список і ціну
            const index = selectedSeats.findIndex(s => s.id === seatId);
            if (index !== -1) {
                selectedSeats.splice(index, 1);
                updatePriceList();
            }
            
            // Показуємо сповіщення про скасування вибору
            showNotification(`Ви скасували вибір місця ${number} в ряду ${row}`);
        } else {
            // Вибір місця
            seat.classList.remove('seat-free');
            seat.classList.add('seat-selected');
            seat.title = 'Обране місце. Натисніть для скасування';
            
            // Додаємо інформацію про місце
            selectedSeats.push({
                id: seatId,
                row: row,
                seat: number,
                price: pricePerSeat
            });
            
            updatePriceList();
            
            // Показуємо сповіщення про вибір місця
            showNotification(`Ви вибрали місце ${number} в ряду ${row}`);
        }
    }

    // Оновлення списку цін
    function updatePriceList() {
        const priceList = document.querySelector('.price-list');
        priceList.innerHTML = '';
        
        totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
        
        // Додаємо загальну інформацію
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'price-item';
        
        if (selectedSeats.length > 0) {
            // Визначаємо правильну форму слова "квиток"
            let ticketWord;
            if (selectedSeats.length === 1) {
                ticketWord = "квиток";
            } else if (selectedSeats.length >= 2 && selectedSeats.length <= 4) {
                ticketWord = "квитки";
            } else {
                ticketWord = "квитків";
            }
            
            summaryDiv.innerHTML = `<span class="price-text">${selectedSeats.length} ${ticketWord}, ${totalPrice} грн</span>`;
        } else {
            summaryDiv.innerHTML = `<span class="price-text">Квитки не вибрано</span>`;
        }
        
        priceList.appendChild(summaryDiv);
        
        // Додаємо інформацію про кожне місце
        selectedSeats.forEach(seat => {
            const priceItem = document.createElement('div');
            priceItem.className = 'price-item';
            priceItem.innerHTML = `
                <span class="price-label">${seat.row} ряд ${seat.seat} місце</span>
                <span class="price-amount">${seat.price} грн</span>
            `;
            priceList.appendChild(priceItem);
        });
        
        // Активуємо/деактивуємо кнопку "Продовжити"
        const continueBtn = document.querySelector('.btn-continue');
        if (selectedSeats.length > 0) {
            continueBtn.disabled = false;
            continueBtn.classList.remove('disabled');
        } else {
            continueBtn.disabled = true;
            continueBtn.classList.add('disabled');
        }
    }

    // Показ підказок при наведенні на іконки
    const infoIcons = document.querySelectorAll('.info-item img, .duration-info img');
    infoIcons.forEach(icon => {
        icon.addEventListener('mouseover', function() {
            const infoText = this.nextElementSibling;
            infoText.classList.add('highlight');
        });
        
        icon.addEventListener('mouseout', function() {
            const infoText = this.nextElementSibling;
            infoText.classList.remove('highlight');
        });
    });

    // Функція для показу сповіщень
    function showNotification(message) {
        // Перевіряємо, чи вже є активне сповіщення
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // Створюємо елемент сповіщення
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Додаємо до body
        document.body.appendChild(notification);
        
        // Анімація появи
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Автоматичне закриття через 2 секунди
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // Обробник кліку "Продовжити"
    const continueBtn = document.querySelector('.btn-continue');
    continueBtn.addEventListener('click', function() {
        if (selectedSeats.length === 0) {
            showNotification('Спочатку виберіть хоча б одне місце');
            return;
        }
        
        // Можна додати перехід на сторінку оплати або інші дії
        showNotification('Перехід до оформлення замовлення...');
        
        // Імітація переходу
        setTimeout(() => {
            // Для демонстрації підказок
            showConfirmationModal();
        }, 1000);
    });

    // Функція для показу модального вікна підтвердження
    function showConfirmationModal() {
        // Створюємо модальне вікно
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Заголовок
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = '<h2>Підтвердження бронювання</h2>';
        
        // Основний контент
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        // Інформація про фільм
        const movieInfo = document.createElement('div');
        movieInfo.className = 'modal-movie-info';
        movieInfo.innerHTML = `
            <p><strong>Фільм:</strong> Аватар</p>
            <p><strong>Зал:</strong> № 4</p>
            <p><strong>Дата:</strong> 14.03.2025</p>
            <p><strong>Час:</strong> 15:30 - 18:30</p>
        `;
        
        // Інформація про місця
        const seatsInfo = document.createElement('div');
        seatsInfo.className = 'modal-seats-info';
        seatsInfo.innerHTML = `<p><strong>Обрані місця:</strong></p>`;
        
        const seatsList = document.createElement('ul');
        selectedSeats.forEach(seat => {
            const seatItem = document.createElement('li');
            seatItem.textContent = `${seat.row} ряд, ${seat.seat} місце`;
            seatsList.appendChild(seatItem);
        });
        
        seatsInfo.appendChild(seatsList);
        
        // Інформація про ціну
        const priceInfo = document.createElement('div');
        priceInfo.className = 'modal-price-info';
        priceInfo.innerHTML = `<p><strong>Загальна сума:</strong> ${totalPrice} грн</p>`;
        
        // Кнопки
        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'modal-button cancel';
        cancelButton.textContent = 'Скасувати';
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'modal-button confirm';
        confirmButton.textContent = 'Підтвердити';
        confirmButton.addEventListener('click', function() {
            document.body.removeChild(modal);
            showNotification('Замовлення успішно оформлено!');
        });
        
        modalButtons.appendChild(cancelButton);
        modalButtons.appendChild(confirmButton);
        
        // Збираємо все до купи
        modalBody.appendChild(movieInfo);
        modalBody.appendChild(seatsInfo);
        modalBody.appendChild(priceInfo);
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalButtons);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    // Ініціалізуємо прайс лист
    updatePriceList();

    // Додаємо CSS для сповіщень та модального вікна
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Стиль для підсвічення тексту при наведенні на іконку */
        .info-text.highlight {
            color: #ffeb99;
            font-weight: bold;
        }
        
        /* Номери рядів */
        .row-number {
            width: 20px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-right: 5px;
        }
        
        /* Стилі для сповіщень */
        .notification {
            position: fixed;
            top: 80px;
            right: 20px;
            background-color: rgba(120, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            transform: translateX(110%);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        /* Стилі для модального вікна */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal-content {
            background-color: #1e1e1e;
            width: 500px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }
        
        .modal-header {
            background-color: #780000;
            color: white;
            padding: 15px 20px;
            text-align: center;
        }
        
        .modal-body {
            padding: 20px;
            color: white;
        }
        
        .modal-movie-info, .modal-seats-info, .modal-price-info {
            margin-bottom: 20px;
        }
        
        .modal-seats-info ul {
            list-style-type: disc;
            margin-left: 20px;
        }
        
        .modal-buttons {
            display: flex;
            justify-content: space-between;
            padding: 0 20px 20px;
        }
        
        .modal-button {
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .modal-button.cancel {
            background-color: #424242;
            color: white;
        }
        
        .modal-button.confirm {
            background-color: #780000;
            color: white;
        }
        
        .modal-button.cancel:hover {
            background-color: #333;
        }
        
        .modal-button.confirm:hover {
            background-color: #c1121f;
        }
        
        /* Стиль для неактивної кнопки */
        .btn-continue.disabled {
            background-color: #424242;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(styleElement);

    initializeBookingTimer();
    
    // Додаємо попередження при спробі покинути сторінку
    window.addEventListener('beforeunload', function(e) {
        // Якщо є вибрані місця, показуємо попередження
        const selectedSeats = document.querySelectorAll('.seat-selected');
        if (selectedSeats.length > 0) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
});