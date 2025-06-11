const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Налаштування для завантаження файлів (постерів фільмів)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './public/uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB максимальний розмір
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Дозволені лише файли зображень!'), false);
    }
    cb(null, true);
  }
});

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
  })
  .catch(err => {
    console.error('❌ Помилка при створенні таблиць:', err);
  });

// Функція для валідації та перетворення значень
function validateAndConvert(value, type, defaultValue = null) {
  if (!value || value === '' || value === 'undefined' || value === 'null') {
    return defaultValue;
  }
  
  switch (type) {
    case 'integer':
      const intValue = parseInt(value, 10);
      return isNaN(intValue) ? defaultValue : intValue;
    case 'float':
      const floatValue = parseFloat(value);
      return isNaN(floatValue) ? defaultValue : floatValue;
    case 'date':
      if (value && value !== '') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? defaultValue : value;
      }
      return defaultValue;
    default:
      return value || defaultValue;
  }
}

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

// Middleware для перевірки ролі адміністратора
const adminOnly = async (req, res, next) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    client.release();

    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Доступ заборонено. Потрібні права адміністратора.' });
    }
    
    next();
  } catch (err) {
    console.error('Помилка перевірки ролі:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// ==================== АУТЕНТИФІКАЦІЯ ТА РЕЄСТРАЦІЯ ====================

app.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Ім\'я, пошта та пароль обов\'язкові' });
  }

  try {
    const client = await pool.connect();

    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Користувач з такою поштою вже існує' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const insert = await client.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, role, created_at',
      [name, email, phone || null, hashed]
    );

    client.release();
    res.status(201).json({ user: insert.rows[0] });

  } catch (err) {
    console.error('Помилка при реєстрації користувача:', err);
    res.status(500).json({ message: 'Помилка сервера під час реєстрації' });
  }
});

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
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Помилка при авторизації:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

app.get('/profile', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user.userId]);
    client.release();

    if (!result.rows.length) return res.status(404).json({ message: 'Користувача не знайдено' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Помилка отримання профілю:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== ФІЛЬМИ - ПУБЛІЧНІ ЕНДПОІНТИ ====================

// ВАЖЛИВО: Специфічні маршрути повинні йти ПЕРЕД загальними маршрутами з параметрами!

// Отримати всі фільми (загальний список)
app.get('/api/films', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM films ORDER BY created_at DESC');
    client.release();

    res.json({ films: result.rows });
  } catch (err) {
    console.error('Помилка отримання фільмів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати рекомендовані фільми для головної сторінки
app.get('/api/films/featured', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, title, director, description, release_date, duration, 
             genres, poster_url, status, rating, age_rating, created_at
      FROM films 
      WHERE status IN ('active', 'upcoming') 
      ORDER BY 
        CASE WHEN status = 'active' THEN 1 ELSE 2 END,
        release_date DESC 
      LIMIT 12
    `);
    client.release();

    res.json({ 
      films: result.rows,
      total: result.rows.length 
    });
  } catch (err) {
    console.error('Помилка отримання рекомендованих фільмів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати випадкові фільми
app.get('/api/films/random', async (req, res) => {
  const count = parseInt(req.query.count) || 6;
  
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT id, title, director, description, release_date, duration, 
             genres, poster_url, status, rating, age_rating, created_at
      FROM films 
      WHERE status IN ('active', 'upcoming')
      ORDER BY RANDOM()
      LIMIT $1
    `, [count]);
    
    client.release();

    res.json({ 
      films: result.rows,
      total: result.rows.length 
    });
  } catch (err) {
    console.error('Помилка отримання випадкових фільмів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Пошук фільмів
app.get('/api/films/search', async (req, res) => {
  const { 
    q = '', 
    status = '', 
    genre = '', 
    limit = 20, 
    offset = 0 
  } = req.query;

  try {
    const client = await pool.connect();
    
    let query = `
      SELECT id, title, director, description, release_date, duration, 
             genres, poster_url, status, rating, age_rating, created_at
      FROM films 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Пошук за текстом
    if (q.trim()) {
      query += ` AND (
        title ILIKE $${paramIndex} OR 
        director ILIKE $${paramIndex} OR 
        genres ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex}
      )`;
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }

    // Фільтр за статусом
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Фільтр за жанром
    if (genre) {
      query += ` AND genres ILIKE $${paramIndex}`;
      params.push(`%${genre}%`);
      paramIndex++;
    }

    // Сортування
    if (q.trim()) {
      query += ` ORDER BY 
        CASE 
          WHEN title ILIKE $1 THEN 1
          WHEN director ILIKE $1 THEN 2
          WHEN genres ILIKE $1 THEN 3
          ELSE 4
        END,
        release_date DESC
      `;
    } else {
      query += ` ORDER BY 
        CASE WHEN status = 'active' THEN 1 ELSE 2 END,
        release_date DESC
      `;
    }

    // Пагінація
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await client.query(query, params);
    
    // Отримуємо загальну кількість для пагінації
    let countQuery = `SELECT COUNT(*) as total FROM films WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (q.trim()) {
      countQuery += ` AND (
        title ILIKE $${countParamIndex} OR 
        director ILIKE $${countParamIndex} OR 
        genres ILIKE $${countParamIndex} OR
        description ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${q.trim()}%`);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (genre) {
      countQuery += ` AND genres ILIKE $${countParamIndex}`;
      countParams.push(`%${genre}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    
    client.release();

    res.json({
      films: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
      hasMore: (offset + limit) < countResult.rows[0].total
    });

  } catch (err) {
    console.error('Помилка пошуку фільмів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати фільми за жанром
app.get('/api/films/genre/:genre', async (req, res) => {
  const genre = req.params.genre;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, title, director, description, release_date, duration, 
             genres, poster_url, status, rating, age_rating
      FROM films 
      WHERE genres ILIKE $1 
      AND status IN ('active', 'upcoming')
      ORDER BY release_date DESC
      LIMIT $2
    `, [`%${genre}%`, limit]);
    
    client.release();

    res.json({ 
      films: result.rows,
      genre: genre,
      total: result.rows.length 
    });
  } catch (err) {
    console.error('Помилка отримання фільмів за жанром:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати всі унікальні жанри
app.get('/api/films/genres', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT DISTINCT unnest(string_to_array(genres, ',')) as genre
      FROM films 
      WHERE genres IS NOT NULL 
      AND status IN ('active', 'upcoming')
      ORDER BY genre
    `);
    
    client.release();

    // Очищуємо жанри від пробілів
    const genres = result.rows
      .map(row => row.genre.trim())
      .filter(genre => genre.length > 0)
      .filter((genre, index, arr) => arr.indexOf(genre) === index); // Унікальні значення

    res.json({ genres });
  } catch (err) {
    console.error('Помилка отримання жанрів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Статистика фільмів
app.get('/api/films/stats', async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_films,
        COUNT(*) FILTER (WHERE status = 'active') as active_films,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming_films,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_films,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as average_rating,
        AVG(duration) FILTER (WHERE duration IS NOT NULL) as average_duration
      FROM films
    `);
    
    const topGenres = await client.query(`
      SELECT 
        unnest(string_to_array(genres, ',')) as genre,
        COUNT(*) as count
      FROM films 
      WHERE genres IS NOT NULL 
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10
    `);
    
    client.release();
    
    res.json({
      general: stats.rows[0],
      topGenres: topGenres.rows.map(row => ({
        genre: row.genre.trim(),
        count: parseInt(row.count)
      }))
    });
    
  } catch (err) {
    console.error('Помилка отримання статистики фільмів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати деталі конкретного фільму з сеансами
app.get('/api/films/:id/details', async (req, res) => {
  const filmId = parseInt(req.params.id);
  
  if (isNaN(filmId)) {
    return res.status(400).json({ message: 'Невірний ID фільму' });
  }
  
  try {
    const client = await pool.connect();
    
    // Отримуємо інформацію про фільм
    const filmResult = await client.query(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM screenings s WHERE s.film_id = f.id AND s.screening_time > NOW()) as upcoming_screenings
      FROM films f 
      WHERE f.id = $1
    `, [filmId]);

    if (!filmResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Фільм не знайдено' });
    }

    // Отримуємо найближчі сеанси
    const screeningsResult = await client.query(`
      SELECT id, screening_time, hall_number, price, available_seats
      FROM screenings 
      WHERE film_id = $1 
      AND screening_time > NOW()
      ORDER BY screening_time ASC
      LIMIT 10
    `, [filmId]);

    // Отримуємо схожі фільми (за жанром)
    const film = filmResult.rows[0];
    const genres = film.genres ? film.genres.split(',').map(g => g.trim()) : [];
    let similarFilms = [];

    if (genres.length > 0) {
      const similarResult = await client.query(`
        SELECT id, title, poster_url, rating
        FROM films 
        WHERE id != $1 
        AND status IN ('active', 'upcoming')
        AND (${genres.map((_, i) => `genres ILIKE $${i + 2}`).join(' OR ')})
        ORDER BY rating DESC NULLS LAST
        LIMIT 6
      `, [filmId, ...genres.map(g => `%${g}%`)]);
      
      similarFilms = similarResult.rows;
    }

    client.release();

    res.json({
      film: film,
      screenings: screeningsResult.rows,
      similarFilms: similarFilms
    });

  } catch (err) {
    console.error('Помилка отримання деталей фільму:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// УВАГА: Цей маршрут повинен бути ОСТАННІМ серед всіх /api/films/*
// Отримати один фільм за ID  
app.get('/api/films/:id', async (req, res) => {
  const filmId = parseInt(req.params.id);
  
  if (isNaN(filmId)) {
    return res.status(400).json({ message: 'Невірний ID фільму' });
  }
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM films WHERE id = $1', [filmId]);
    client.release();

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Фільм не знайдено' });
    }
    
    res.json({ film: result.rows[0] });
  } catch (err) {
    console.error('Помилка отримання фільму:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== ФІЛЬМИ - ADMIN ЕНДПОІНТИ ====================

// Створити новий фільм
app.post('/api/films', auth, adminOnly, upload.single('poster'), async (req, res) => {
  const { 
    title, 
    director, 
    description, 
    release_date, 
    duration, 
    genres, 
    poster_url, 
    trailer_url, 
    status, 
    rating, 
    age_rating 
  } = req.body;
  
  if (!title) {
    return res.status(400).json({ message: 'Назва фільму обов\'язкова' });
  }
  
  try {
    const client = await pool.connect();
    
    // Пріоритет: завантажений файл > URL > null
    let finalPosterUrl = null;
    if (req.file) {
      finalPosterUrl = `/uploads/${req.file.filename}`;
    } else if (poster_url) {
      finalPosterUrl = poster_url;
    }
    
    // Валідуємо та перетворюємо значення
    const validatedDuration = validateAndConvert(duration, 'integer', null);
    const validatedReleaseDate = validateAndConvert(release_date, 'date', null);
    const validatedRating = validateAndConvert(rating, 'float', null);
    
    const result = await client.query(`
      INSERT INTO films (
        title, director, description, release_date, duration, 
        genres, poster_url, trailer_url, status, rating, age_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `, [
      title,
      director || null,
      description || null,
      validatedReleaseDate,
      validatedDuration,
      genres || null,
      finalPosterUrl,
      trailer_url || null,
      status || 'upcoming',
      validatedRating,
      age_rating || null
    ]);
    
    client.release();
    res.status(201).json({ film: result.rows[0] });
  } catch (err) {
    console.error('Помилка створення фільму:', err);
    res.status(500).json({ message: 'Помилка сервера: ' + err.message });
  }
});

// Оновити фільм
app.put('/api/films/:id', auth, adminOnly, upload.single('poster'), async (req, res) => {
  const { 
    title, 
    director, 
    description, 
    release_date, 
    duration, 
    genres, 
    poster_url, 
    trailer_url, 
    status, 
    rating, 
    age_rating 
  } = req.body;
  const filmId = req.params.id;
  
  try {
    const client = await pool.connect();
    
    const checkResult = await client.query('SELECT * FROM films WHERE id = $1', [filmId]);
    if (!checkResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Фільм не знайдено' });
    }
    
    const existingFilm = checkResult.rows[0];
    
    // Визначаємо новий URL постера
    let finalPosterUrl = existingFilm.poster_url;
    if (req.file) {
      finalPosterUrl = `/uploads/${req.file.filename}`;
    } else if (poster_url !== undefined) {
      finalPosterUrl = poster_url || null;
    }
    
    // Валідуємо значення
    const validatedDuration = validateAndConvert(duration, 'integer', existingFilm.duration);
    const validatedReleaseDate = validateAndConvert(release_date, 'date', existingFilm.release_date);
    const validatedRating = validateAndConvert(rating, 'float', existingFilm.rating);
    
    const result = await client.query(`
      UPDATE films SET 
        title = COALESCE($1, title),
        director = COALESCE($2, director),
        description = COALESCE($3, description),
        release_date = COALESCE($4, release_date),
        duration = COALESCE($5, duration),
        genres = COALESCE($6, genres),
        poster_url = COALESCE($7, poster_url),
        trailer_url = COALESCE($8, trailer_url),
        status = COALESCE($9, status),
        rating = COALESCE($10, rating),
        age_rating = COALESCE($11, age_rating)
      WHERE id = $12 
      RETURNING *
    `, [
      title || null,
      director || null,
      description || null,
      validatedReleaseDate,
      validatedDuration,
      genres || null,
      finalPosterUrl,
      trailer_url || null,
      status || null,
      validatedRating,
      age_rating || null,
      filmId
    ]);
    
    client.release();
    res.json({ film: result.rows[0] });
  } catch (err) {
    console.error('Помилка оновлення фільму:', err);
    res.status(500).json({ message: 'Помилка сервера: ' + err.message });
  }
});

// Видалити фільм
app.delete('/api/films/:id', auth, adminOnly, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const checkResult = await client.query('SELECT * FROM films WHERE id = $1', [req.params.id]);
    if (!checkResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Фільм не знайдено' });
    }
    
    await client.query('DELETE FROM films WHERE id = $1', [req.params.id]);
    
    client.release();
    res.json({ message: 'Фільм успішно видалено' });
  } catch (err) {
    console.error('Помилка видалення фільму:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== СЕАНСИ ====================

// Отримати всі сеанси
app.get('/api/screenings', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT s.*, f.title as film_title 
      FROM screenings s
      JOIN films f ON s.film_id = f.id
      ORDER BY s.screening_time
    `);
    client.release();

    res.json({ screenings: result.rows });
  } catch (err) {
    console.error('Помилка отримання сеансів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати інформацію про конкретний сеанс
app.get('/api/screenings/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT s.*, f.title as film_title, f.duration, f.poster_url 
      FROM screenings s
      JOIN films f ON s.film_id = f.id
      WHERE s.id = $1
    `, [req.params.id]);
    client.release();

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Сеанс не знайдено' });
    }

    res.json({ screening: result.rows[0] });
  } catch (err) {
    console.error('Помилка отримання сеансу:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати зайняті місця для конкретного сеансу
app.get('/api/screenings/:id/seats', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT seat_row, seat_number 
      FROM tickets 
      WHERE film_id = (SELECT film_id FROM screenings WHERE id = $1)
      AND session_date = (SELECT screening_time FROM screenings WHERE id = $1)
      AND hall_id = (SELECT hall_number FROM screenings WHERE id = $1)
      AND status = 'active'
    `, [req.params.id]);
    client.release();

    const occupiedSeats = result.rows.map(seat => `${seat.seat_row}-${seat.seat_number}`);
    res.json({ occupiedSeats });
  } catch (err) {
    console.error('Помилка отримання зайнятих місць:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Створити новий сеанс (ADMIN)
app.post('/api/screenings', auth, adminOnly, async (req, res) => {
  const { film_id, screening_time, hall_number, price, available_seats } = req.body;
  
  if (!film_id || !screening_time || !hall_number || !price || !available_seats) {
    return res.status(400).json({ message: 'Всі поля обов\'язкові' });
  }
  
  try {
    const client = await pool.connect();
    
    // Перевіряємо чи існує фільм
    const filmCheck = await client.query('SELECT id FROM films WHERE id = $1', [film_id]);
    if (!filmCheck.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Фільм не знайдено' });
    }
    
    // Валідуємо значення
    const validatedFilmId = validateAndConvert(film_id, 'integer');
    const validatedHallNumber = validateAndConvert(hall_number, 'integer');
    const validatedPrice = validateAndConvert(price, 'float');
    const validatedSeats = validateAndConvert(available_seats, 'integer');
    
    if (!validatedFilmId || !validatedHallNumber || !validatedPrice || !validatedSeats) {
      client.release();
      return res.status(400).json({ message: 'Невірний формат даних' });
    }
    
    const result = await client.query(
      'INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [validatedFilmId, screening_time, validatedHallNumber, validatedPrice, validatedSeats]
    );
    
    client.release();
    res.status(201).json({ screening: result.rows[0] });
  } catch (err) {
    console.error('Помилка створення сеансу:', err);
    res.status(500).json({ message: 'Помилка сервера: ' + err.message });
  }
});

// Видалити сеанс (ADMIN)
app.delete('/api/screenings/:id', auth, adminOnly, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const checkResult = await client.query('SELECT id FROM screenings WHERE id = $1', [req.params.id]);
    if (!checkResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Сеанс не знайдено' });
    }
    
    await client.query('DELETE FROM screenings WHERE id = $1', [req.params.id]);
    client.release();
    
    res.json({ message: 'Сеанс успішно видалено' });
  } catch (err) {
    console.error('Помилка видалення сеансу:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== КВИТКИ ====================

// Бронювання квитків
app.post('/api/tickets/book', auth, async (req, res) => {
  const { screeningId, seats } = req.body;
  
  if (!screeningId || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ message: 'Некоректні дані для бронювання' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Отримуємо інформацію про сеанс
    const screeningResult = await client.query(`
      SELECT s.*, f.title as film_title 
      FROM screenings s
      JOIN films f ON s.film_id = f.id
      WHERE s.id = $1
    `, [screeningId]);

    if (!screeningResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Сеанс не знайдено' });
    }

    const screening = screeningResult.rows[0];

    // Перевіряємо чи місця вже зайняті
    for (const seat of seats) {
      const [row, number] = seat.split('-');
      const existingTicket = await client.query(`
        SELECT id FROM tickets 
        WHERE film_id = $1 AND session_date = $2 AND hall_id = $3 
        AND seat_row = $4 AND seat_number = $5 AND status = 'active'
      `, [screening.film_id, screening.screening_time, screening.hall_number, row, number]);

      if (existingTicket.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          message: `Місце ${number} в ряду ${row} вже зайнято` 
        });
      }
    }

    // Створюємо квитки
    const tickets = [];
    for (const seat of seats) {
      const [row, number] = seat.split('-');
      const qrCode = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const ticketResult = await client.query(`
        INSERT INTO tickets (user_id, film_id, hall_id, seat_row, seat_number, session_date, price, qr_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        req.user.userId,
        screening.film_id,
        screening.hall_number,
        row,
        number,
        screening.screening_time,
        screening.price,
        qrCode
      ]);

      tickets.push(ticketResult.rows[0]);
    }

    // Зменшуємо кількість доступних місць
    await client.query(`
      UPDATE screenings 
      SET available_seats = available_seats - $1 
      WHERE id = $2
    `, [seats.length, screeningId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Квитки успішно заброньовано!',
      tickets: tickets,
      screening: {
        title: screening.film_title,
        date: screening.screening_time,
        hall: screening.hall_number
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Помилка бронювання квитків:', err);
    res.status(500).json({ message: 'Помилка при бронюванні квитків' });
  } finally {
    client.release();
  }
});

// Отримати квитки користувача
app.get('/api/tickets/my', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT t.*, f.title as film_title, f.poster_url 
      FROM tickets t
      JOIN films f ON t.film_id = f.id
      WHERE t.user_id = $1 AND t.status = 'active'
      ORDER BY t.session_date DESC
    `, [req.user.userId]);
    client.release();

    res.json({ tickets: result.rows });
  } catch (err) {
    console.error('Помилка отримання квитків:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Скасування квитка
app.delete('/api/tickets/:id', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Перевіряємо чи квиток належить користувачу
    const ticketResult = await client.query(`
      SELECT t.*, s.screening_time 
      FROM tickets t
      JOIN screenings s ON t.film_id = s.film_id 
        AND t.session_date = s.screening_time 
        AND t.hall_id = s.hall_number
      WHERE t.id = $1 AND t.user_id = $2 AND t.status = 'active'
    `, [req.params.id, req.user.userId]);

    if (!ticketResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Квиток не знайдено' });
    }

    const ticket = ticketResult.rows[0];
    
    // Перевіряємо чи можна скасувати (за 2 години до сеансу)
    const sessionTime = new Date(ticket.screening_time);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      client.release();
      return res.status(400).json({ 
        message: 'Квиток можна скасувати не пізніше ніж за 2 години до початку сеансу' 
      });
    }

    // Скасовуємо квиток
    await client.query(`
      UPDATE tickets SET status = 'cancelled' WHERE id = $1
    `, [req.params.id]);

    // Збільшуємо кількість доступних місць
    await client.query(`
      UPDATE screenings 
      SET available_seats = available_seats + 1 
      WHERE film_id = $1 AND screening_time = $2 AND hall_number = $3
    `, [ticket.film_id, ticket.session_date, ticket.hall_id]);

    client.release();
    res.json({ message: 'Квиток успішно скасовано' });

  } catch (err) {
    console.error('Помилка скасування квитка:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== КОРИСТУВАЧІ (ADMIN) ====================

// Отримати всіх користувачів (без паролів)
app.get('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
    client.release();

    res.json({ users: result.rows });
  } catch (err) {
    console.error('Помилка отримання користувачів:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Змінити роль користувача
app.patch('/api/users/:id/role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;
  
  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Невірний формат ролі' });
  }
  
  try {
    const client = await pool.connect();
    
    // Перевіряємо чи існує користувач
    const checkResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!checkResult.rows.length) {
      client.release();
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }
    
    const result = await client.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, userId]
    );
    
    client.release();
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Помилка оновлення ролі:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// ==================== СТАТИСТИКА (ADMIN) ====================

app.get('/api/stats', auth, adminOnly, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Кількість активних фільмів
    const activeFilmsResult = await client.query("SELECT COUNT(*) FROM films WHERE status = 'active'");
    const activeFilmsCount = parseInt(activeFilmsResult.rows[0].count);
    
    // Кількість проданих квитків
    const ticketsResult = await client.query('SELECT COUNT(*) FROM tickets');
    const ticketsCount = parseInt(ticketsResult.rows[0].count);
    
    // Кількість зареєстрованих користувачів
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    const usersCount = parseInt(usersResult.rows[0].count);
    
    // Загальний дохід за поточний місяць
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const revenueResult = await client.query(
      'SELECT SUM(price) FROM tickets WHERE EXTRACT(MONTH FROM purchase_date) = $1 AND EXTRACT(YEAR FROM purchase_date) = $2',
      [currentMonth, currentYear]
    );
    const monthlyRevenue = parseFloat(revenueResult.rows[0].sum || 0);
    
    client.release();
    
    res.json({
      stats: {
        activeFilms: activeFilmsCount,
        ticketsSold: ticketsCount,
        registeredUsers: usersCount,
        monthlyRevenue: monthlyRevenue
      }
    });
  } catch (err) {
    console.error('Помилка отримання статистики:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});