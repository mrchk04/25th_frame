-- Скрипт міграції для оновлення існуючої таблиці films
-- Виконайте цей скрипт окремо після створення базових таблиць

-- 1. Додаємо нові поля до існуючої таблиці films
ALTER TABLE films ADD COLUMN IF NOT EXISTS trailer_url VARCHAR(500);
ALTER TABLE films ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1);
ALTER TABLE films ADD COLUMN IF NOT EXISTS age_rating VARCHAR(10);

-- 2. Оновлюємо розмір поля poster_url якщо потрібно
ALTER TABLE films ALTER COLUMN poster_url TYPE VARCHAR(500);

-- 3. Оновлюємо існуючі фільми з постерами (якщо вони є)
UPDATE films SET poster_url = 'https://image.tmdb.org/t/p/w500/kyuFiYQfQCBJkTgCv2sWJynz8bE.jpg' 
WHERE (title = 'Avatar' OR title = 'Аватар') AND poster_url IS NULL;

UPDATE films SET poster_url = 'https://image.tmdb.org/t/p/w500/nxxaQW0cVuBNDdM6Hd8DAcIqYeO.jpg' 
WHERE title LIKE '%Captain America%' AND poster_url IS NULL;

UPDATE films SET poster_url = 'https://image.tmdb.org/t/p/w500/34jf4Gny7ltdz3JQgXJE8Eoa3HK.jpg' 
WHERE title LIKE '%Sonic%' AND poster_url IS NULL;

-- 4. Додаємо нові фільми з перевіркою існування
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

-- 5. Оновлюємо існуючі фільми зі значеннями rating та age_rating
UPDATE films SET rating = 7.8, age_rating = '12+' WHERE title = 'Avatar' OR title = 'Аватар';
UPDATE films SET rating = 7.5, age_rating = '12+' WHERE title LIKE '%Captain America%';
UPDATE films SET rating = 7.3, age_rating = '6+' WHERE title LIKE '%Sonic%';
UPDATE films SET rating = 8.1, age_rating = '18+' WHERE title LIKE '%Deadpool%';

-- 6. Додаємо тестові сеанси
INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-14 15:30:00', 4, 150.00, 45
FROM films f WHERE f.title IN ('Avatar', 'Аватар') AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-14 15:30:00'
);

INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-14 18:30:00', 4, 150.00, 50
FROM films f WHERE f.title IN ('Avatar', 'Аватар') AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-14 18:30:00'
);

INSERT INTO screenings (film_id, screening_time, hall_number, price, available_seats)
SELECT f.id, TIMESTAMP '2025-06-15 14:00:00', 2, 140.00, 35
FROM films f WHERE f.title = 'Дюна: Частина друга' AND NOT EXISTS (
    SELECT 1 FROM screenings s WHERE s.film_id = f.id AND s.screening_time = TIMESTAMP '2025-06-15 14:00:00'
);

-- 7. Створюємо додаткові індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_films_status ON films(status);
CREATE INDEX IF NOT EXISTS idx_films_title ON films(title);
CREATE INDEX IF NOT EXISTS idx_films_rating ON films(rating);
CREATE INDEX IF NOT EXISTS idx_screenings_film_id ON screenings(film_id);
CREATE INDEX IF NOT EXISTS idx_screenings_time ON screenings(screening_time);

-- 8. Функція для отримання випадкових фільмів
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