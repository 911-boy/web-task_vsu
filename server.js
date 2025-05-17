const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Раздаем статические файлы

// Инициализация БД и создание таблиц
const db = new sqlite3.Database('./store.db');

// Добавляем отладочный вывод для проверки существующей таблицы
db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'products'", [], (err, row) => {
    if (err) {
        console.error('Ошибка при проверке таблицы products:', err);
    } else {
        console.log('Существующая структура таблицы products:', row ? row.sql : 'таблица не найдена');
    }
});

db.serialize(() => {
    // Таблица товаров
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        image TEXT,
        description TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // После создания таблицы, проверим, есть ли столбец description
    db.all("PRAGMA table_info(products)", [], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении информации о столбцах таблицы:', err);
            return;
        }
        
        // Проверяем наличие столбца description
        let hasDescriptionColumn = false;
        if (rows && rows.length) {
            for (const row of rows) {
                if (row.name === 'description') {
                    hasDescriptionColumn = true;
                    break;
                }
            }
        }
        
        // Если столбца нет, добавляем его
        if (!hasDescriptionColumn) {
            console.log('Добавление отсутствующего столбца description в таблицу products');
            db.run("ALTER TABLE products ADD COLUMN description TEXT", [], err => {
                if (err) console.error('Ошибка при добавлении столбца:', err);
                else console.log('Столбец description успешно добавлен');
            });
        } else {
            console.log('Столбец description уже существует в таблице products');
        }
    });
    
    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_email TEXT,
        total_price INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Таблица элементов заказа
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price INTEGER,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);
});

// ====== API для товаров ======

// Получить все товары с возможностью сортировки и фильтрации
app.get('/api/products', (req, res) => {
    const { sort, order, category, minPrice, maxPrice, search } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    // Фильтрация по категории
    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }
    
    // Фильтрация по цене
    if (minPrice) {
        query += ' AND price >= ?';
        params.push(minPrice);
    }
    
    if (maxPrice) {
        query += ' AND price <= ?';
        params.push(maxPrice);
    }
    
    // Поиск по названию или описанию
    if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Сортировка
    if (sort && ['name', 'price', 'created_at'].includes(sort)) {
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sort} ${sortOrder}`;
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// Получить товар по ID
app.get('/api/products/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({error: err.message});
        if (!row) return res.status(404).json({error: 'Товар не найден'});
        res.json(row);
    });
});

// Добавить товар
app.post('/api/products', (req, res) => {
    const { name, price, image, description, category } = req.body;
    
    // Улучшенная валидация и преобразование данных
    if (!name) {
        return res.status(400).json({error: 'Название товара обязательно'});
    }
    
    // Преобразуем price в число, с проверкой
    const priceNumber = parseInt(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({error: 'Цена должна быть положительным числом'});
    }
    
    // Более подробное логирование для отладки
    console.log('Добавление товара:', { name, price: priceNumber, image, description, category });
    
    try {
        db.run(
            'INSERT INTO products (name, price, image, description, category) VALUES (?, ?, ?, ?, ?)', 
            [name, priceNumber, image || null, description || null, category || null], 
            function(err) {
                if (err) {
                    console.error('Ошибка SQL при добавлении товара:', err);
                    return res.status(500).json({error: err.message});
                }
                
                console.log('Товар успешно добавлен, ID:', this.lastID);
                res.json({ 
                    id: this.lastID, 
                    name, 
                    price: priceNumber, 
                    image, 
                    description,
                    category 
                });
            }
        );
    } catch (error) {
        console.error('Исключение при добавлении товара:', error);
        res.status(500).json({error: error.message});
    }
});

// Обновить товар
app.put('/api/products/:id', (req, res) => {
    const { name, price, image, description, category } = req.body;
    
    // Валидация данных
    if (!name || !price) {
        return res.status(400).json({error: 'Название и цена обязательны'});
    }
    
    db.run(
        'UPDATE products SET name = ?, price = ?, image = ?, description = ?, category = ? WHERE id = ?', 
        [name, price, image, description, category, req.params.id], 
        function(err) {
            if (err) return res.status(500).json({error: err.message});
            if (this.changes === 0) return res.status(404).json({error: 'Товар не найден'});
            res.json({ 
                updated: this.changes, 
                id: req.params.id 
            });
        }
    );
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        if (this.changes === 0) return res.status(404).json({error: 'Товар не найден'});
        res.json({ deleted: this.changes });
    });
});

// ====== API для заказов ======

// Получить все заказы
app.get('/api/orders', (req, res) => {
    db.all('SELECT * FROM orders', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// Получить детали заказа с товарами
app.get('/api/orders/:id', (req, res) => {
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
        if (err) return res.status(500).json({error: err.message});
        if (!order) return res.status(404).json({error: 'Заказ не найден'});
        
        db.all(`
            SELECT oi.*, p.name, p.image 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [req.params.id], (err, items) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({
                ...order,
                items
            });
        });
    });
});

// Создать заказ
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, items } = req.body;
    
    if (!customer_name || !items || !items.length) {
        return res.status(400).json({error: 'Имя и товары обязательны'});
    }
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Рассчитываем общую сумму заказа
        let totalPrice = 0;
        items.forEach(item => {
            totalPrice += item.price * item.quantity;
        });
        
        // Создаем заказ
        db.run(
            'INSERT INTO orders (customer_name, customer_email, total_price, status) VALUES (?, ?, ?, ?)',
            [customer_name, customer_email, totalPrice, 'новый'],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({error: err.message});
                }
                
                const orderId = this.lastID;
                
                // Добавляем элементы заказа
                const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
                
                let allInserted = true;
                items.forEach(item => {
                    stmt.run([orderId, item.id, item.quantity, item.price], err => {
                        if (err) allInserted = false;
                    });
                });
                
                stmt.finalize();
                
                if (!allInserted) {
                    db.run('ROLLBACK');
                    return res.status(500).json({error: 'Ошибка при добавлении товаров в заказ'});
                }
                
                db.run('COMMIT');
                res.json({ id: orderId, totalPrice });
            }
        );
    });
});

// Получить категории товаров
app.get('/api/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        const categories = rows.map(row => row.category);
        res.json(categories);
    });
});

// Статистика
app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as totalProducts, SUM(price) as totalValue FROM products', [], (err, productStats) => {
        if (err) return res.status(500).json({error: err.message});
        
        db.get('SELECT COUNT(*) as totalOrders, SUM(total_price) as totalRevenue FROM orders', [], (err, orderStats) => {
            if (err) return res.status(500).json({error: err.message});
            
            res.json({
                products: productStats,
                orders: orderStats
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 