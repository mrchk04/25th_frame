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
  ('Адміністратор', 'admin@cinema.com', '+380991234567', '$2b$10$L7v7wLwCAsHEKDKzPu5kEO3Kh.aRpFfYJSUj5NSgxWJJJ97/SBXjS', 'admin'),
  ('Менеджер', 'manager@cinema.com', '+380997654321', '$2b$10$L7v7wLwCAsHEKDKzPu5kEO3Kh.aRpFfYJSUj5NSgxWJJJ97/SBXjS', 'manager'),
  ('Користувач', 'user@example.com', '+380993216540', '$2b$10$L7v7wLwCAsHEKDKzPu5kEO3Kh.aRpFfYJSUj5NSgxWJJJ97/SBXjS', 'user')
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