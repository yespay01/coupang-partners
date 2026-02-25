import express from 'express';
import { login, createUser, getUserById, authenticateToken } from '../config/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }

    const result = await login(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    // 쿠키에도 토큰 설정 (Next.js middleware용)
    res.cookie('admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    });

    res.json(result);
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/register
 * 회원가입
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요.',
      });
    }

    const user = await createUser(email, password, name);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('회원가입 오류:', error);

    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 이메일입니다.',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * 현재 사용자 정보
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/logout
 * 로그아웃 - 쿠키 삭제
 */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true, message: '로그아웃 되었습니다.' });
});

export default router;
