document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Перевіряємо URL хеш для автоматичного перемикання на реєстрацію
    if (window.location.hash === '#register') {
        switchToTab('register');
    }

    // Перемикання між вкладками
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabType = this.getAttribute('data-tab');
            switchToTab(tabType);
        });
    });

    function switchToTab(tabType) {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(form => form.classList.remove('active'));

        const activeTab = document.querySelector(`[data-tab="${tabType}"]`);
        const activeForm = document.getElementById(`${tabType}-form`);
        
        if (activeTab && activeForm) {
            activeTab.classList.add('active');
            activeForm.classList.add('active');
        }
    }

    // Обробка авторизації
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const remember = document.getElementById('remember').checked;

            if (!email || !password) {
                showError('loginForm', 'Будь ласка, заповніть усі поля');
                return;
            }

            loginUser(email, password, remember);
        });
    }

    // Обробка реєстрації
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const terms = document.getElementById('terms').checked;

            if (!name || !email || !phone || !password || !confirmPassword) {
                showError('registerForm', 'Будь ласка, заповніть усі поля');
                return;
            }

            if (password !== confirmPassword) {
                showError('registerForm', 'Паролі не співпадають');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('registerForm', 'Введіть коректний email');
                return;
            }

            const phoneRegex = /^\+?3?8?(0\d{9})$/;
            if (!phoneRegex.test(phone)) {
                showError('registerForm', 'Введіть коректний номер телефону');
                return;
            }

            if (!terms) {
                showError('registerForm', 'Ви повинні погодитись з умовами користування');
                return;
            }

            registerUser(name, email, phone, password);
        });
    }

    // Відображення повідомлень про помилки
    function showError(formId, message) {
        const form = document.getElementById(formId);
        if (!form) return;

        const existingError = form.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        form.appendChild(errorDiv);
    }

    // Відображення повідомлень про успіх
    function showSuccess(formId, message) {
        const form = document.getElementById(formId);
        if (!form) return;

        const existingSuccess = form.querySelector('.success-message');
        if (existingSuccess) existingSuccess.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        form.appendChild(successDiv);
    }

    // Авторизація з перевіркою ролі та returnUrl
    function loginUser(email, password, remember) {
        // Показуємо індикатор завантаження
        showLoading();

        fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { 
                        throw new Error(data.message || 'Помилка авторизації'); 
                    });
                }
                return response.json();
            })
            .then(data => {
                hideLoading();

                // Зберігаємо дані користувача
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                if (remember) {
                    localStorage.setItem('rememberEmail', email);
                } else {
                    localStorage.removeItem('rememberEmail');
                }

                showSuccess('loginForm', 'Авторизація успішна! Перенаправлення...');
                
                // Перевіряємо returnUrl
                const returnUrl = localStorage.getItem('returnUrl');
                
                setTimeout(() => {
                    if (returnUrl) {
                        localStorage.removeItem('returnUrl');
                        window.location.href = returnUrl;
                    } else {
                        // Стандартне перенаправлення залежно від ролі
                        if (data.user.role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'profile.html';
                        }
                    }
                }, 1500);
            })
            .catch(err => {
                hideLoading();
                showError('loginForm', err.message);
            });
    }

    // Реєстрація з підтримкою returnUrl
    function registerUser(name, email, phone, password) {
        showLoading();

        fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { 
                        throw new Error(data.message || 'Помилка реєстрації'); 
                    });
                }
                return response.json();
            })
            .then(data => {
                hideLoading();
                showSuccess('registerForm', 'Реєстрація успішна! Тепер ви можете увійти.');
                
                if (registerForm) {
                    registerForm.reset();
                }
                
                // Автоматично перемикаємось на вкладку входу
                setTimeout(() => {
                    switchToTab('login');
                    
                    // Заповнюємо email з реєстрації
                    const loginEmailField = document.getElementById('loginEmail');
                    if (loginEmailField) {
                        loginEmailField.value = email;
                    }
                }, 2000);
            })
            .catch(err => {
                hideLoading();
                showError('registerForm', err.message);
            });
    }

    // Функції завантаження
    function showLoading() {
        // Видаляємо попередній індикатор, якщо є
        hideLoading();

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'auth-loading';
        loadingDiv.className = 'auth-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Обробка запиту...</p>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);
    }

    function hideLoading() {
        const loading = document.getElementById('auth-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Функція для визначення типу перенаправлення на основі ролі
    function getRedirectUrl(userRole) {
        switch (userRole) {
            case 'admin':
                return 'admin.html';
            case 'user':
            default:
                return 'profile.html';
        }
    }

    // Перевірка авторизації при завантаженні з урахуванням ролей
    function checkAuth() {
        const token = localStorage.getItem('authToken');
        const currentUser = localStorage.getItem('currentUser');

        if (token && currentUser) {
            const user = JSON.parse(currentUser);
            const currentPage = window.location.pathname;
            
            // Якщо користувач на сторінці авторизації - перенаправляємо
            if (currentPage.includes('login.html')) {
                // Перевіряємо returnUrl
                const returnUrl = localStorage.getItem('returnUrl');
                if (returnUrl) {
                    localStorage.removeItem('returnUrl');
                    window.location.href = returnUrl;
                } else {
                    window.location.href = getRedirectUrl(user.role);
                }
                return;
            }
            
            // Перевіряємо доступ до адмін-панелі
            if (currentPage.includes('admin.html') && user.role !== 'admin') {
                alert('У вас немає доступу до адмін-панелі!');
                window.location.href = 'profile.html';
                return;
            }
            
            // Перевіряємо, чи адмін не потрапив на звичайну сторінку профілю
            if (currentPage.includes('profile.html') && user.role === 'admin') {
                window.location.href = 'admin.html';
                return;
            }
            
            // Оновлюємо UI для авторизованого користувача
            updateAuthUI(user);
        } else {
            // Якщо токена немає, але користувач намагається отримати доступ до захищених сторінок
            const currentPage = window.location.pathname;
            if (currentPage.includes('admin.html') || currentPage.includes('profile.html')) {
                alert('Для доступу до цієї сторінки необхідно авторизуватися!');
                window.location.href = 'login.html';
            }
        }
    }

    // Оновлення інтерфейсу після входу
    function updateAuthUI(user) {
        console.log('Авторизований користувач:', user);
        
        // Відображення імені користувача
        const profileElement = document.getElementById('userProfileName');
        if (profileElement) {
            profileElement.textContent = `Вітаємо, ${user.name}!`;
        }
        
        // Відображення ролі (якщо потрібно)
        const roleElement = document.getElementById('userRole');
        if (roleElement) {
            roleElement.textContent = user.role === 'admin' ? 'Адміністратор' : 'Користувач';
        }
        
        // Додаткові елементи інтерфейсу для адміна
        if (user.role === 'admin') {
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(element => {
                element.style.display = 'block';
            });
        }
    }

    // Функція для виходу з системи
    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('returnUrl'); // Очищуємо returnUrl при виході
        window.location.href = 'login.html';
    }

    // Додаємо глобальну функцію logout для використання в HTML
    window.logout = logout;

    // Перевірка токена на валідність
    function validateToken() {
        const token = localStorage.getItem('authToken');
        if (!token) return false;

        fetch('http://localhost:3000/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Token invalid');
            }
            return response.json();
        })
        .then(data => {
            // Оновлюємо дані користувача, якщо вони змінилися
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            updateAuthUI(data.user);
        })
        .catch(err => {
            console.log('Токен недійсний, виконуємо вихід');
            logout();
        });
    }

    // Попереднє заповнення email, якщо користувач обрав "Запам'ятати"
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        const loginEmailField = document.getElementById('loginEmail');
        const rememberCheckbox = document.getElementById('remember');
        if (loginEmailField && rememberCheckbox) {
            loginEmailField.value = rememberedEmail;
            rememberCheckbox.checked = true;
        }
    }

    // Ініціалізація при завантаженні сторінки
    checkAuth();
    
    // Опціонально: перевіряємо токен кожні 5 хвилин
    setInterval(validateToken, 5 * 60 * 1000);

    // Додаємо стилі для індикатора завантаження
    const styles = document.createElement('style');
    styles.textContent = `
        .auth-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .loading-spinner {
            text-align: center;
            color: white;
        }
        
        .loading-spinner .spinner {
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
    `;
    document.head.appendChild(styles);
});