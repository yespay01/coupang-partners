/**
 * Firebase 호환 스텁
 * 기존 코드의 빌드 에러를 방지합니다.
 */

const STUB_WARNING = "Firebase는 더 이상 사용되지 않습니다.";

export const app = {
  name: "[STUB]",
  options: {},
} as any;

export const db = {
  type: "firestore-stub",
} as any;

export function getFirebaseApp() {
  console.warn(STUB_WARNING);
  return app;
}

export function getFirebaseDb() {
  console.warn(STUB_WARNING);
  return db;
}
