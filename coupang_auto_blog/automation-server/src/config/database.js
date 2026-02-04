import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

/**
 * PostgreSQL 연결 풀 초기화
 */
export function initializeDatabase() {
  if (pool) {
    console.log('✅ Database already initialized');
    return pool;
  }

  const connectionString = process.env.DATABASE_URL ||
    'postgresql://coupang_user:your-secure-password@localhost:5432/coupang_blog';

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
  });

  console.log('✅ PostgreSQL connection pool initialized');
  return pool;
}

/**
 * 데이터베이스 풀 가져오기
 */
export function getDb() {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * 데이터베이스 연결 테스트
 */
export async function testConnection() {
  try {
    const db = getDb();
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * 스키마 초기화
 */
export async function initializeSchema() {
  try {
    const db = getDb();
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    await db.query(schema);
    console.log('✅ Database schema initialized');
    return true;
  } catch (error) {
    console.error('❌ Schema initialization failed:', error.message);
    return false;
  }
}
