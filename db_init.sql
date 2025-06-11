-- Створення бази даних (якщо вона ще не існує)
-- Цей рядок потрібно виконувати з правами суперкористувача PostgreSQL
-- CREATE DATABASE cinema;

-- Створення таблиці користувачів
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Films table
CREATE TABLE IF NOT EXISTS films (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  director VARCHAR(100),
  description TEXT,
  release_date DATE,
  duration INTEGER,
  genres VARCHAR(255),
  poster_url VARCHAR(500),
  trailer_url VARCHAR(500),
  rating DECIMAL(3,1),
  age_rating VARCHAR(10),
  status VARCHAR(20) DEFAULT 'upcoming', -- 'active', 'upcoming', 'inactive'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screenings (movie sessions) table
CREATE TABLE IF NOT EXISTS screenings (
  id SERIAL PRIMARY KEY,
  film_id INTEGER REFERENCES films(id) ON DELETE CASCADE,
  screening_time TIMESTAMP NOT NULL,
  hall_number INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  available_seats INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення індексу для швидкого пошуку за email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Створення таблиці для зберігання квитків
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  film_id INTEGER NOT NULL,
  hall_id INTEGER NOT NULL,
  seat_row INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  session_date TIMESTAMP NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'active'
);

-- Створення індексу для швидкого пошуку квитків за user_id
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- Створення таблиці для збереження сесій (токенів)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення індексів для швидкого пошуку сесій
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Додавання тестових користувачів (пароль: "password")
INSERT INTO users (name, email, phone, password, role)
VALUES 
  ('Адміністратор', 'admin@cinema.com', '+380991234567', '$2a$10$bqlVuR1kTXGXDoSHdUMZIODr9E7wsQwZ3Xp3jsCGAT2ea2PmIMcRW', 'admin'),
  ('Користувач', 'user@example.com', '+380993216540', '$2a$10$bqlVuR1kTXGXDoSHdUMZIODr9E7wsQwZ3Xp3jsCGAT2ea2PmIMcRW', 'user')
ON CONFLICT (email) DO NOTHING;

-- Додавання функції для очищення старих сесій
CREATE OR REPLACE FUNCTION clear_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Додавання тригера для автоматичного очищення старих сесій
CREATE OR REPLACE FUNCTION trigger_clear_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM clear_expired_sessions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Створення тригера, який спрацьовує щоразу при вставці нової сесії
DROP TRIGGER IF EXISTS clean_expired_sessions ON sessions;
CREATE TRIGGER clean_expired_sessions
AFTER INSERT ON sessions
EXECUTE FUNCTION trigger_clear_expired_sessions();

-- Додаємо тестові фільми з постерами
INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Дюна: Частина друга', 'Дені Вільньов', 'Пол Атрейдес поєднується з Чані та фрименами, коли він перебуває на шляху помсти проти змовників, які знищили його сім''ю.', DATE '2024-03-15', 166, 'Наукова фантастика, Пригоди', 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', 'active', 8.8, '12+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Дюна: Частина друга');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Опенгеймер', 'Крістофер Нолан', 'Історія американського вченого Дж. Роберта Оппенгеймера та його роль у розробці атомної бомби.', DATE '2023-07-21', 180, 'Біографія, Драма, Історія', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'active', 8.6, '16+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Опенгеймер');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Барбі', 'Грета Гервіг', 'Барбі та Кен чудово проводять час у барвистому і здавалося б ідеальному світі Барбіленду.', DATE '2023-07-21', 114, 'Комедія, Пригоди', 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', 'active', 7.2, '6+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Барбі');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Джон Вік 4', 'Чад Стахелскі', 'Джон Вік знаходить шлях до перемоги над Правлінням. Але перш ніж він зможе заслужити свою свободу, Вік повинен зіткнутися з новим ворогом.', DATE '2023-03-24', 169, 'Бойовик, Кримінал, Трилер', 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', 'active', 7.9, '16+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Джон Вік 4');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Павутиння людина: Через всесвіти', 'Хоакім Дос Сантос', 'Майлз Моралес повертається для наступної глави саги Людини-павука.', DATE '2023-06-02', 140, 'Анімація, Бойовик, Пригоди', 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'upcoming', 8.7, '6+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Павутиння людина: Через всесвіти');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Індіана Джонс 5: Циферблат долі', 'Джеймс Менголд', 'Індіана Джонс відправляється в свою останню пригоду.', DATE '2023-06-30', 154, 'Пригоди, Бойовик', 'https://image.tmdb.org/t/p/w500/Af4bXE63pVsb2FtbW8uYIyPBadD.jpg', 'upcoming', 6.9, '12+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Індіана Джонс 5: Циферблат долі');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Аватар', 'Джеймс Кемерон', 'Культовий фільм Джеймса Кемерона про пригоди на планеті Пандора. Головний герой Джейк Саллі стає агентом у програмі Аватар і втягується у конфлікт з місцевими мешканцями планети.', DATE '2025-04-10', 162, 'Фантастика, Пригоди, Бойовик', 'https://image.tmdb.org/t/p/w500/kyuFiYQfQCBJkTgCv2sWJynz8bE.jpg', 'active', 7.8, '12+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Аватар');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Капітан Америка: Новий світ', 'Джуліус Она', 'Сем Вілсон офіційно взяв на себе мантію Капітана Америки.', DATE '2025-04-15', 118, 'Бойовик, Пригоди, Фантастика', 'https://image.tmdb.org/t/p/w500/nxxaQW0cVuBNDdM6Hd8DAcIqYeO.jpg', 'upcoming', 7.5, '12+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Капітан Америка: Новий світ');

INSERT INTO films (title, director, description, release_date, duration, genres, poster_url, status, rating, age_rating) 
SELECT 'Соник 3', 'Джефф Фаулер', 'Соник, Тейлз та Наклз об''єднуються проти нового потужного ворога - Шедоу.', DATE '2025-03-20', 109, 'Пригоди, Комедія, Сімейний', 'https://image.tmdb.org/t/p/w500/34jf4Gny7ltdz3JQgXJE8Eoa3HK.jpg', 'active', 7.3, '6+'
WHERE NOT EXISTS (SELECT 1 FROM films WHERE title = 'Соник 3');

-- Додаємо тестові сеанси
INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-14 15:30:00', 4, 150.00, 45
FROM films f WHERE f.title = 'Аватар' AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-14 15:30:00'
);

INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-14 18:30:00', 4, 150.00, 50
FROM films f WHERE f.title = 'Аватар' AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-14 18:30:00'
);

INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-15 14:00:00', 2, 140.00, 35
FROM films f WHERE f.title = 'Дюна: Частина друга' AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-15 14:00:00'
);

-- Створюємо індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_films_status ON films(status);
CREATE INDEX IF NOT EXISTS idx_films_title ON films(title);
CREATE INDEX IF NOT EXISTS idx_screenings_film_id ON screenings(film_id);
CREATE INDEX IF NOT EXISTS idx_screenings_time ON screenings(screening_time);

-- Функція для отримання випадкових фільмів
CREATE OR REPLACE FUNCTION get_random_films(film_count INTEGER DEFAULT 6)
RETURNS TABLE(
    id INTEGER,
    title VARCHAR(255),
    director VARCHAR(100),
    description TEXT,
    release_date DATE,
    duration INTEGER,
    genres VARCHAR(255),
    poster_url VARCHAR(500),
    status VARCHAR(20),
    rating DECIMAL(3,1),
    age_rating VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.title, f.director, f.description, f.release_date, 
           f.duration, f.genres, f.poster_url, f.status, f.rating, f.age_rating
    FROM films f
    WHERE f.status IN ('active', 'upcoming')
    ORDER BY RANDOM()
    LIMIT film_count;
END;
$$ LANGUAGE plpgsql;