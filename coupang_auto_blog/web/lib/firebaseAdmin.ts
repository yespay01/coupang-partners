/**
 * Firebase Admin 호환 스텁
 * 기존 코드의 빌드 에러를 방지합니다.
 */

export function getAdminAuth() {
  console.warn("Firebase Admin Auth는 더 이상 사용되지 않습니다. JWT를 사용하세요.");
  return {
    verifyIdToken: async () => { throw new Error("Firebase Admin 미사용"); },
    createCustomToken: async () => { throw new Error("Firebase Admin 미사용"); },
    verifySessionCookie: async () => { throw new Error("Firebase Admin 미사용"); },
    createSessionCookie: async () => { throw new Error("Firebase Admin 미사용"); },
  } as any;
}

export function getAdminFirestore() {
  console.warn("Firebase Admin Firestore는 더 이상 사용되지 않습니다.");
  return {} as any;
}
