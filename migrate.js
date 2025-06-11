// migrate.js - Скрипт для виконання міграції бази даних

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || '25th-frame',
  password: process.env.DB_PASSWORD || '20041204',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  try {
    console.log('🚀 Початок міграції бази даних...');
    
    // Читаємо SQL файл міграції
    const migrationSQL = fs.readFileSync('./migration.sql', 'utf8');
    
    // Виконуємо міграцію
    await pool.query(migrationSQL);
    
    console.log('✅ Міграція успішно завершена!');
    
    // Перевіряємо результат
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_films,
        COUNT(*) FILTER (WHERE poster_url IS NOT NULL) as with_posters,
        COUNT(*) FILTER (WHERE rating IS NOT NULL) as with_ratings
      FROM films
    `);
    
    console.log('📊 Статистика фільмів:');
    console.log(`   Всього фільмів: ${result.rows[0].total_films}`);
    console.log(`   З постерами: ${result.rows[0].with_posters}`);
    console.log(`   З рейтингами: ${result.rows[0].with_ratings}`);
    
    // Перевіряємо сеанси
    const screeningsResult = await pool.query('SELECT COUNT(*) as total FROM screenings');
    console.log(`   Всього сеансів: ${screeningsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Помилка міграції:', error.message);
    console.error('Детальна помилка:', error);
  } finally {
    await pool.end();
  }
}

// Запуск міграції
runMigration();