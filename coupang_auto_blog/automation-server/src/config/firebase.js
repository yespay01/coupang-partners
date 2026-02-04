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
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Firestore 인스턴스 가져오기
 */
export function getDb() {
  return getFirestore();
}
