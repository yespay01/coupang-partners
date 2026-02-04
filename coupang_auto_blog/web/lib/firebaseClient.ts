/**
 * Firebase Client 호환 stub
 * Firebase SDK를 사용하는 기존 코드의 빌드 에러를 방지합니다.
 * 실제 기능은 automation-server API로 전환되었습니다.
 */

const STUB_WARNING = "Firebase는 더 이상 사용되지 않습니다. API를 사용하세요.";

// Stub Firebase app
const stubApp = {
  name: "[STUB]",
  options: {},
  automaticDataCollectionEnabled: false,
};

// Stub Firestore
const stubDb = {
  type: "firestore-stub",
  app: stubApp,
};

export function getFirebaseClients() {
  console.warn(STUB_WARNING);
  return {
    app: stubApp as any,
    db: stubDb as any,
  };
}

export function getFirebaseApp() {
  console.warn(STUB_WARNING);
  return stubApp as any;
}

export function getFirebaseDb() {
  console.warn(STUB_WARNING);
  return stubDb as any;
}
