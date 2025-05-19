document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('authToken') || !localStorage.getItem('currentUser')) {
        window.location.href = 'login.html';
        return;
    }

    let user = JSON.parse(localStorage.getItem('currentUser'));

    function renderUserData(userData) {
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

    renderUserData(user);

    const tabLinks = document.querySelectorAll('.profile-menu li');
    const tabContents = document.querySelectorAll('.profile-tab');

    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    document.getElementById('personal-info-form').addEventListener('submit', function(e) {
        e.preventDefault();

        user = {
            ...user,
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthday: document.getElementById('birthday').value
        };

        localStorage.setItem('currentUser', JSON.stringify(user));
        renderUserData(user);

        alert('Дані успішно оновлено!');
    });

    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (currentPassword && newPassword) {
            if (newPassword !== confirmPassword) {
                alert('Новий пароль та підтвердження паролю не співпадають!');
                return;
            }
            alert('Пароль успішно змінено!');
        }

        user.settings = {
            emailNotifications: document.getElementById('email-notifications').checked,
            smsNotifications: document.getElementById('sms-notifications').checked
        };

        localStorage.setItem('currentUser', JSON.stringify(user));

        if (!currentPassword) {
            alert('Налаштування успішно оновлено!');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});
