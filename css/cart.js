document.addEventListener('DOMContentLoaded', function() {
    const cartItems = document.getElementById('cart-items');
    const clearCartButton = document.querySelector('.clear-cart');
    const payButton = document.querySelector('.pay-button');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const buyAllButton = document.querySelector('.see-all');

    console.log('Buy All button found:', buyAllButton); // Отладочное сообщение

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

    // Функции для работы с БД
    async function loadProductsFromDB() {
        try {
            const response = await fetch('http://localhost:3001/api/products');
            const products = await response.json();
            return products;
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            return [];
        }
    }

    async function saveProductToDB(product) {
        try {
            const response = await fetch('http://localhost:3001/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(product)
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка при сохранении товара:', error);
            return null;
        }
    }

    // Модифицируем функцию addToCart
    async function addToCart(title, price, image) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart.push({ title, price, image });
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Сохраняем товар в БД
        await saveProductToDB({
            name: title,
            price: price,
            image: image,
            description: 'Товар добавлен в корзину'
        });
        
        showNotification('Товар добавлен в корзину!', 'success');
        updateCartDisplay();
    }

    // Функция для обновления отображения корзины
    function updateCartDisplay() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        cartItems.innerHTML = '';

        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
            return;
        }

        let totalPrice = 0;

        cart.forEach(item => {
            const cartItem = document.createElement('li');
            cartItem.className = 'cart-item';
            
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${item.price} ₽</div>
                </div>
            `;

            cartItems.appendChild(cartItem);
            totalPrice += item.price;
        });

        // Добавляем общую сумму
        const totalElement = document.createElement('div');
        totalElement.className = 'cart-total';
        totalElement.innerHTML = `<strong>Итого: ${totalPrice} ₽</strong>`;
        cartItems.appendChild(totalElement);
    }

    // Модифицируем функцию addAllItemsToCart
    async function addAllItemsToCart() {
        const items = document.querySelectorAll('.item');
        let addedItems = 0;
        
        for (const item of items) {
            const title = item.querySelector('span').textContent.split('₽')[0].trim();
            const price = parseInt(item.querySelector('span').textContent.match(/\d+/)[0]);
            const image = item.querySelector('img').src;
            
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            cart.push({ title, price, image });
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Сохраняем каждый товар в БД
            await saveProductToDB({
                name: title,
                price: price,
                image: image,
                description: 'Товар добавлен через Buy All'
            });
            
            addedItems++;
        }

        if (addedItems > 0) {
            showNotification(`Добавлено ${addedItems} товаров в корзину!`, 'success');
            updateCartDisplay();
        } else {
            showNotification('Нет товаров для добавления', 'info');
        }
    }

    // Добавляем обработчик для кнопки "Buy All"
    if (buyAllButton) {
        console.log('Adding click handler to Buy All button'); // Отладочное сообщение
        buyAllButton.addEventListener('click', function(e) {
            console.log('Buy All button clicked'); // Отладочное сообщение
            e.preventDefault();
            addAllItemsToCart();
        });
    } else {
        console.log('Buy All button not found!'); // Отладочное сообщение
    }

    // Обработчики для кнопок "Добавить в корзину"
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const itemElement = this.closest('.item');
            const title = itemElement.querySelector('span').textContent.split('₽')[0].trim();
            const price = parseInt(itemElement.querySelector('span').textContent.match(/\d+/)[0]);
            const image = itemElement.querySelector('img').src;
            addToCart(title, price, image);
        });
    });

    // Очистка корзины
    if (clearCartButton) {
    clearCartButton.addEventListener('click', function() {
        localStorage.removeItem('cart');
        showNotification('Корзина очищена', 'info');
        updateCartDisplay();
    });
    }

    // Обработка оплаты
    if (payButton) {
        payButton.addEventListener('click', function() {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            if (cart.length === 0) {
                showNotification('Корзина пуста!', 'error');
                return;
            }
            
            // Показываем форму оформления заказа
            document.querySelector('.checkout-form').style.display = 'block';
        });
    }
    
    // Обработка формы заказа
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const customerName = document.getElementById('customer-name').value;
            const customerEmail = document.getElementById('customer-email').value;
            
            if (!customerName) {
                showNotification('Пожалуйста, укажите ваше имя', 'error');
                return;
            }
            
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            if (cart.length === 0) {
                showNotification('Корзина пуста!', 'error');
                return;
            }
            
            // Подготавливаем данные заказа
            const orderItems = cart.map((item, index) => ({
                id: index + 1,
                product_id: index + 1,
                quantity: 1,
                price: item.price,
                name: item.title,
                image: item.image
            }));
            
            try {
                const response = await fetch('http://localhost:3001/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_name: customerName,
                        customer_email: customerEmail,
                        items: orderItems
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    showNotification(`Заказ #${result.id} успешно оформлен!`, 'success');
                    
                    // Очищаем корзину
                    localStorage.removeItem('cart');
                    updateCartDisplay();
                    
                    // Скрываем форму заказа
                    document.querySelector('.checkout-form').style.display = 'none';
                    
                    // Очищаем форму
                    document.getElementById('customer-name').value = '';
                    document.getElementById('customer-email').value = '';
                } else {
                    const error = await response.json();
                    showNotification(error.error || 'Ошибка при оформлении заказа', 'error');
                }
            } catch (error) {
                console.error('Ошибка при оформлении заказа:', error);
                showNotification('Ошибка при оформлении заказа', 'error');
            }
        });
    }
    
    // Кнопка отмены заказа
    const cancelOrderButton = document.querySelector('.cancel-order');
    if (cancelOrderButton) {
        cancelOrderButton.addEventListener('click', function() {
            document.querySelector('.checkout-form').style.display = 'none';
        });
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

    // Загружаем товары из БД при старте
    loadProductsFromDB().then(products => {
        if (products.length > 0) {
            console.log('Загружены товары из БД:', products);
        }
    });

    // Инициализация отображения корзины при загрузке страницы
    if (cartItems) {
    updateCartDisplay();
    }
});
