document.addEventListener('DOMContentLoaded', function() {
    // Функция для показа уведомлений
    function showNotification(message, type = 'info') {
        // Создаем контейнер для уведомлений, если его еще нет
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = '✓';
                break;
            case 'error':
                icon = '✕';
                break;
            case 'info':
                icon = 'ℹ';
                break;
        }
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Показываем уведомление
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Функция для очистки всех cookies
    function clearAllCookies() {
        // Очищаем все cookies
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            // Удаляем cookie для всех путей и доменов
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
        }

        // Очищаем localStorage
        localStorage.clear();

        // Очищаем sessionStorage
        sessionStorage.clear();

        // Очищаем все данные в IndexedDB
        if ('indexedDB' in window) {
            const databases = indexedDB.databases();
            databases.then(function(dbs) {
                dbs.forEach(function(db) {
                    indexedDB.deleteDatabase(db.name);
                });
            });
        }

        showNotification('Все cookies и данные очищены', 'success');
        
        // Обновляем страницу через 1 секунду после очистки
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // Обработчик для кнопки очистки cookies на всех страницах
    const clearCookiesButton = document.querySelector('.clear-cookies');
    if (clearCookiesButton) {
        clearCookiesButton.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите очистить все cookies и данные сайта? Это действие нельзя отменить.')) {
                clearAllCookies();
            }
        });
    }
}); 