// Скрипт для управління формами авторизації та реєстрації
document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Перемикання між вкладками
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(form => form.classList.remove('active'));

            this.classList.add('active');
            const formId = this.getAttribute('data-tab') + '-form';
            document.getElementById(formId).classList.add('active');
        });
    });

    // Обробка авторизації
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

    // Обробка реєстрації
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

    // Відображення повідомлень про помилки
    function showError(formId, message) {
        const form = document.getElementById(formId);
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
        const existingSuccess = form.querySelector('.success-message');
        if (existingSuccess) existingSuccess.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        form.appendChild(successDiv);
    }

    // Авторизація
    function loginUser(email, password, remember) {
        fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { throw new Error(data.message || 'Помилка авторизації'); });
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                if (remember) {
                    localStorage.setItem('rememberEmail', email);
                } else {
                    localStorage.removeItem('rememberEmail');
                }

                showSuccess('loginForm', 'Авторизація успішна! Перенаправлення...');
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            })
            .catch(err => {
                showError('loginForm', err.message);
            });
    }

    // Реєстрація
    function registerUser(name, email, phone, password) {
        fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { throw new Error(data.message || 'Помилка реєстрації'); });
                }
                return response.json();
            })
            .then(data => {
                showSuccess('registerForm', 'Реєстрація успішна! Тепер ви можете увійти.');
                registerForm.reset();
                setTimeout(() => document.querySelector('[data-tab="login"]').click(), 2000);
            })
            .catch(err => {
                showError('registerForm', err.message);
            });
    }

    // Перевірка авторизації при завантаженні
    function checkAuth() {
        const token = localStorage.getItem('authToken');
        const currentUser = localStorage.getItem('currentUser');

        if (token && currentUser) {
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'profile.html';
            } else {
                updateAuthUI(JSON.parse(currentUser));
            }
        }
    }

    // Оновлення інтерфейсу після входу
    function updateAuthUI(user) {
        console.log('Авторизований користувач:', user);
        // Додайте відображення імені або аватару, наприклад:
        const profileElement = document.getElementById('userProfileName');
        if (profileElement) profileElement.textContent = `Вітаємо, ${user.name}!`;
    }

    // Попереднє заповнення email, якщо користувач обрав "Запам’ятати"
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('remember').checked = true;
    }

    checkAuth();
});
