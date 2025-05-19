// Скрипт для управління іконкою профілю та перенаправленням
document.addEventListener('DOMContentLoaded', function() {
    // Знаходимо іконку профілю в шапці сайту
    const profileIcon = document.querySelector('.profile');
    
    if (profileIcon) {
        profileIcon.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Перевіряємо, чи користувач авторизований
            const authToken = localStorage.getItem('authToken');
            const currentUser = localStorage.getItem('currentUser');
            
            if (authToken && currentUser) {
                // Якщо авторизований, перенаправляємо на сторінку профілю
                window.location.href = 'profile.html';
            } else {
                // Якщо не авторизований, перенаправляємо на сторінку авторизації
                window.location.href = 'login.html';
            }
        });
    }
    
    // Оновлюємо іконку профілю залежно від статусу авторизації
    updateProfileIcon();
});

// Функція для оновлення іконки профілю
function updateProfileIcon() {
    const profileIcon = document.querySelector('.profile');
    
    if (!profileIcon) return;
    
    const authToken = localStorage.getItem('authToken');
    const currentUser = localStorage.getItem('currentUser');
    
    if (authToken && currentUser) {
        // Якщо користувач авторизований, можна змінити іконку або додати клас
        profileIcon.classList.add('logged-in');
        
        // Якщо є текстовий елемент, можна показати ім'я користувача
        if (profileText) {
            const user = JSON.parse(currentUser);
            profileText.textContent = user.name || 'Профіль';
        }
    } else {
        // Якщо користувач не авторизований
        profileIcon.classList.remove('logged-in');
        
        if (profileText) {
            profileText.textContent = 'Увійти';
        }
    }
}