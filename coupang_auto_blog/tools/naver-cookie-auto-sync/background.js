const SYNC_ALARM = "naver-sa-cookie-sync";
const SYNC_URL = "https://semolink.store/api/admin/credentials/naver-sa";

function cookieHeader(cookies) {
  // 브라우저처럼 경로가 긴 쿠키를 먼저 보낸다. 같은 이름의 쿠키도
  // 경로가 다르면 제거하지 않는다. 네이버가 이 순서로 세션을 판별한다.
  return [...cookies]
    .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function saveStatus(status) {
  await chrome.storage.local.set({
    lastSyncStatus: status,
    lastSyncAt: new Date().toISOString(),
  });
}

async function syncCookies() {
  try {
    const [searchAdvisorCookies, adminSession] = await Promise.all([
      // 해당 페이지에 실제로 첨부되는 도메인/경로 쿠키만 읽는다.
      chrome.cookies.getAll({
        url: "https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Fsemolink.store",
      }),
      chrome.cookies.get({ url: "https://semolink.store/", name: "admin_session" }),
    ]);

    const header = cookieHeader(searchAdvisorCookies);
    if (!header.includes("NID_AUT=") || !header.includes("NID_SES=")) {
      throw new Error("네이버 로그인이 필요합니다.");
    }
    if (!adminSession?.value) {
      throw new Error("세모링크 관리자 로그인이 필요합니다.");
    }

    const response = await fetch(SYNC_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminSession.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cookies: header }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || `HTTP ${response.status}`);
    }

    await saveStatus({ ok: true, message: "자동 동기화 완료" });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveStatus({ ok: false, message });
    throw error;
  }
}

async function ensureAlarm() {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  syncCookies().catch(() => chrome.runtime.openOptionsPage());
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  syncCookies().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) syncCookies().catch(() => {});
});

chrome.action.onClicked.addListener(() => {
  syncCookies().catch(() => {}).finally(() => chrome.runtime.openOptionsPage());
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "sync-now") return;
  syncCookies()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, message: error.message }));
  return true;
});
