const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));


const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || '25th-frame',
  password: process.env.DB_PASSWORD || '20041204',
  port: process.env.DB_PORT || 5432,
});

const sql = fs.readFileSync('./db_init.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Таблиці створено');
    // pool.end();
  })
  .catch(err => {
    console.error('❌ Помилка при створенні таблиць:', err);
    // pool.end();
  });

app.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Перевірка заповнення обов’язкових полів
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Ім’я, пошта та пароль обов’язкові' });
  }

  try {
    const client = await pool.connect();

    // Перевірка, чи користувач з такою поштою вже існує
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Користувач з такою поштою вже існує' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Створення нового користувача
    const insert = await client.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, role, created_at',
      [name, email, phone, hashed]
    );

    client.release();
    res.status(201).json({ user: insert.rows[0] });

  } catch (err) {
    console.error('Помилка при реєстрації користувача:', err);
    res.status(500).json({ message: 'Помилка сервера під час реєстрації' });
  }
});


// Логін
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Заповніть всі поля' });

  try {
    const client = await pool.connect();
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    client.release();

    if (!userResult.rows.length) return res.status(401).json({ message: 'Невірний email або пароль' });

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Невірний email або пароль' });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'cinema_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch {
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Middleware для авторизації
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Токен відсутній' });

  const token = authHeader.split(' ')[1];
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || 'cinema_secret_key');
    req.user = data;
    next();
  } catch {
    res.status(401).json({ message: 'Недійсний токен' });
  }
};

// Приклад захищеного маршруту
app.get('/profile', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.userId]);
    client.release();

    if (!result.rows.length) return res.status(404).json({ message: 'Користувача не знайдено' });
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});