import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Firebase Admin SDK 초기화
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    console.log('✅ Firebase already initialized');
    return;
  }

  try {
    // 개발 환경에서 Private Key가 없으면 스킵
    if (!process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY.includes('(임시)')) {
      console.warn('⚠️  Firebase Private Key가 설정되지 않았습니다. Firebase 기능 비활성화.');
      console.warn('⚠️  실제 키를 설정하려면 .env 파일의 FIREBASE_PRIVATE_KEY를 업데이트하세요.');
      return;
    }

    // 환경변수에서 Service Account 키 로드
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.warn('⚠️  Firebase 기능이 비활성화되었습니다.');
    // 개발 환경에서는 에러를 throw하지 않음
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

/**
 * Firestore 인스턴스 가져오기
 */
export function getDb() {
  return getFirestore();
}
