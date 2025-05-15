document.addEventListener('DOMContentLoaded', function() {
    // Функция для показа уведомлений
    function showNotification(message, type = 'info') {
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
            case 'success': icon = '✓'; break;
            case 'error': icon = '✕'; break;
            case 'info': icon = 'ℹ'; break;
        }
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Переключение вкладок
    const tabs = document.querySelectorAll('.admin-sidebar li');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Активируем вкладку в меню
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Показываем контент вкладки
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            
            // Загружаем данные для вкладки
            if (tabId === 'products') {
                loadProducts();
                loadCategories();
            } else if (tabId === 'orders') {
                loadOrders();
            } else if (tabId === 'dashboard') {
                loadStats();
            }
        });
    });

    // Кнопка назад к заказам
    document.querySelector('.back-button').addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        // Активируем соответствующую вкладку в меню
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    });

    // Загрузка статистики
    async function loadStats() {
        try {
            const response = await fetch('http://localhost:3001/api/stats');
            const stats = await response.json();
            
            document.getElementById('total-products').textContent = stats.products.totalProducts || 0;
            document.getElementById('total-value').textContent = (stats.products.totalValue || 0) + ' ₽';
            document.getElementById('total-orders').textContent = stats.orders.totalOrders || 0;
            document.getElementById('total-revenue').textContent = (stats.orders.totalRevenue || 0) + ' ₽';
        } catch (error) {
            console.error('Ошибка при загрузке статистики:', error);
            showNotification('Ошибка при загрузке статистики', 'error');
        }
    }

    // Загрузка товаров с применением фильтров
    async function loadProducts() {
        const searchQuery = document.getElementById('product-search').value;
        const categoryFilter = document.getElementById('category-filter').value;
        const minPrice = document.getElementById('min-price').value;
        const maxPrice = document.getElementById('max-price').value;
        const sortBy = document.getElementById('sort-by').value;
        const sortOrder = document.getElementById('sort-order').value;
        
        let url = 'http://localhost:3001/api/products?';
        
        // Добавляем параметры фильтрации и сортировки
        if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
        if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;
        if (minPrice) url += `minPrice=${minPrice}&`;
        if (maxPrice) url += `maxPrice=${maxPrice}&`;
        if (sortBy) url += `sort=${sortBy}&order=${sortOrder}`;
        
        try {
            const response = await fetch(url);
            const products = await response.json();
            
            const tbody = document.getElementById('products-table');
            tbody.innerHTML = '';
            
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Товары не найдены</td></tr>';
                return;
            }
            
            products.forEach(product => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.id}</td>
                    <td><img src="${product.image || '/img/no-image.jpg'}" alt="${product.name}"></td>
                    <td>${product.name}</td>
                    <td>${product.category || '-'}</td>
                    <td>${product.price} ₽</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" data-id="${product.id}">Изменить</button>
                            <button class="action-btn delete-btn" data-id="${product.id}">Удалить</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Добавляем обработчики для кнопок действий
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    editProduct(productId);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    deleteProduct(productId);
                });
            });
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            showNotification('Ошибка при загрузке товаров', 'error');
        }
    }

    // Загрузка списка категорий
    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3001/api/categories');
            const categories = await response.json();
            
            const categoryFilter = document.getElementById('category-filter');
            // Сохраняем текущее значение
            const currentValue = categoryFilter.value;
            
            // Очистка списка (оставляем только первую опцию "Все категории")
            while (categoryFilter.options.length > 1) {
                categoryFilter.remove(1);
            }
            
            // Добавляем категории
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            
            // Восстанавливаем выбранную категорию
            if (currentValue) {
                categoryFilter.value = currentValue;
            }
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
        }
    }

    // Загрузка заказов
    async function loadOrders() {
        try {
            const response = await fetch('http://localhost:3001/api/orders');
            const orders = await response.json();
            
            const tbody = document.getElementById('orders-table');
            tbody.innerHTML = '';
            
            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Заказы не найдены</td></tr>';
                return;
            }
            
            orders.forEach(order => {
                const date = new Date(order.created_at);
                const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.customer_email || '-'}</td>
                    <td>${order.total_price} ₽</td>
                    <td>${order.status}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-id="${order.id}">Просмотр</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Добавляем обработчики для кнопок просмотра
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const orderId = this.getAttribute('data-id');
                    viewOrder(orderId);
                });
            });
        } catch (error) {
            console.error('Ошибка при загрузке заказов:', error);
            showNotification('Ошибка при загрузке заказов', 'error');
        }
    }

    // Просмотр заказа
    async function viewOrder(orderId) {
        try {
            const response = await fetch(`http://localhost:3001/api/orders/${orderId}`);
            const order = await response.json();
            
            // Заполняем информацию о заказе
            document.getElementById('order-id').textContent = order.id;
            document.getElementById('order-customer').textContent = order.customer_name;
            document.getElementById('order-email').textContent = order.customer_email || '-';
            document.getElementById('order-status').textContent = order.status;
            
            const date = new Date(order.created_at);
            document.getElementById('order-date').textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Заполняем товары в заказе
            const tbody = document.getElementById('order-items');
            tbody.innerHTML = '';
            
            if (!order.items || order.items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Товары не найдены</td></tr>';
                document.getElementById('order-total').textContent = '0 ₽';
                return;
            }
            
            let totalSum = 0;
            order.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                totalSum += itemTotal;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.price} ₽</td>
                    <td>${item.quantity}</td>
                    <td>${itemTotal} ₽</td>
                `;
                tbody.appendChild(tr);
            });
            
            document.getElementById('order-total').textContent = `${totalSum} ₽`;
            
            // Показываем вкладку просмотра заказа
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('view-order').classList.add('active');
        } catch (error) {
            console.error('Ошибка при загрузке заказа:', error);
            showNotification('Ошибка при загрузке заказа', 'error');
        }
    }

    // Редактирование товара
    async function editProduct(productId) {
        try {
            const response = await fetch(`http://localhost:3001/api/products/${productId}`);
            const product = await response.json();
            
            // Заполняем форму данными товара
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-image').value = product.image || '';
            document.getElementById('product-description').value = product.description || '';
            
            // Показываем кнопку отмены
            document.getElementById('cancel-edit').style.display = 'block';
            
            // Меняем заголовок формы
            document.querySelector('#add-product h2').textContent = 'Редактирование товара';
            
            // Переключаемся на вкладку формы
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('add-product').classList.add('active');
            
            // Активируем соответствующую вкладку в меню
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="add-product"]').classList.add('active');
        } catch (error) {
            console.error('Ошибка при загрузке товара:', error);
            showNotification('Ошибка при загрузке товара', 'error');
        }
    }

    // Удаление товара
    async function deleteProduct(productId) {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3001/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Товар успешно удален', 'success');
                loadProducts();
                loadStats();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Ошибка при удалении товара', 'error');
            }
        } catch (error) {
            console.error('Ошибка при удалении товара:', error);
            showNotification('Ошибка при удалении товара', 'error');
        }
    }

    // Обработка формы добавления/редактирования товара
    document.getElementById('product-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const productId = document.getElementById('product-id').value;
        const isEdit = !!productId;
        
        const productData = {
            name: document.getElementById('product-name').value,
            price: parseInt(document.getElementById('product-price').value) || 0,
            category: document.getElementById('product-category').value,
            image: document.getElementById('product-image').value,
            description: document.getElementById('product-description').value
        };
        
        try {
            let response;
            
            if (isEdit) {
                // Обновление существующего товара
                response = await fetch(`http://localhost:3001/api/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
            } else {
                // Добавление нового товара
                response = await fetch('http://localhost:3001/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
            }
            
            if (response.ok) {
                showNotification(isEdit ? 'Товар успешно обновлен' : 'Товар успешно добавлен', 'success');
                resetProductForm();
                
                // Переключаемся на вкладку списка товаров
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="products"]').classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById('products').classList.add('active');
                
                loadProducts();
                loadStats();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Ошибка при сохранении товара', 'error');
            }
        } catch (error) {
            console.error('Ошибка при сохранении товара:', error);
            showNotification('Ошибка при сохранении товара', 'error');
        }
    });

    // Кнопка отмены редактирования
    document.getElementById('cancel-edit').addEventListener('click', function() {
        resetProductForm();
        
        // Переключаемся на вкладку списка товаров
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="products"]').classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('products').classList.add('active');
    });

    // Сброс формы товара
    function resetProductForm() {
        document.getElementById('product-id').value = '';
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-category').value = '';
        document.getElementById('product-image').value = '';
        document.getElementById('product-description').value = '';
        
        document.getElementById('cancel-edit').style.display = 'none';
        document.querySelector('#add-product h2').textContent = 'Добавить новый товар';
    }

    // Обработчик кнопки применения фильтров
    document.getElementById('apply-filters').addEventListener('click', loadProducts);

    // Инициализация при загрузке
    loadStats();
}); 