import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getDb } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * JWT 토큰 생성
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 비밀번호 해싱
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * 사용자 생성
 */
export async function createUser(email, password, name, role = 'user') {
  const db = getDb();
  const passwordHash = await hashPassword(password);

  const result = await db.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
    [email, passwordHash, name, role]
  );

  return result.rows[0];
}

/**
 * 사용자 조회 (이메일)
 */
export async function getUserByEmail(email) {
  const db = getDb();
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
}

/**
 * 사용자 조회 (ID)
 */
export async function getUserById(id) {
  const db = getDb();
  const result = await db.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/**
 * 로그인
 */
export async function login(email, password) {
  const user = await getUserByEmail(email);

  if (!user) {
    return { success: false, message: '사용자를 찾을 수 없습니다.' };
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return { success: false, message: '비밀번호가 일치하지 않습니다.' };
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * 쿠키 헤더에서 특정 쿠키 값 추출
 */
function parseCookie(cookieHeader, cookieName) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const cookie = cookies.find(c => c.startsWith(`${cookieName}=`));

  return cookie ? cookie.substring(cookieName.length + 1) : null;
}

/**
 * 인증 미들웨어
 * Authorization 헤더 또는 admin_session 쿠키에서 토큰 확인
 */
export function authenticateToken(req, res, next) {
  // 1. Authorization 헤더에서 토큰 확인 (Bearer TOKEN)
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // 2. Authorization 헤더가 없으면 Cookie 헤더에서 토큰 확인
  if (!token) {
    const cookieHeader = req.headers['cookie'];
    token = parseCookie(cookieHeader, 'admin_session');
  }

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  }

  req.user = decoded;
  next();
}

/**
 * 관리자 권한 확인 미들웨어
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

/**
 * 환경변수 기준 초기 관리자 계정 보장 (idempotent)
 * - 없으면 생성
 * - 있으면 role이 admin이 아니어도 admin으로 승격
 */
export async function ensureAdminUserFromEnv() {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim() || 'Administrator';

  if (!email || !password) {
    console.warn('⚠️ ADMIN_EMAIL/ADMIN_PASSWORD 미설정: 초기 관리자 자동 생성/승격을 건너뜁니다.');
    return;
  }

  const db = getDb();
  const existing = await getUserByEmail(email);

  if (!existing) {
    const created = await createUser(email, password, name, 'admin');
    console.log(`✅ Initial admin created from env: ${created.email}`);
    return;
  }

  if (existing.role !== 'admin') {
    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', existing.id]);
    console.log(`✅ Existing user promoted to admin from env: ${email}`);
  } else {
    console.log(`✅ Admin user verified from env: ${email}`);
  }
}
