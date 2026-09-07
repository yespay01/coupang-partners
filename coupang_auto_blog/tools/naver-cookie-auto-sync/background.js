const SYNC_ALARM = "naver-sa-cookie-sync";
const SYNC_URL = "https://semolink.store/api/admin/credentials/naver-sa";

function cookieHeader(cookies) {
  const selected = new Map();
  for (const cookie of cookies) {
    // 같은 이름이면 호스트 전용 쿠키를 우선한다.
    const current = selected.get(cookie.name);
    if (!current || (!cookie.domain.startsWith(".") && current.domain.startsWith("."))) {
      selected.set(cookie.name, cookie);
    }
  }
  return [...selected.values()].map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function saveStatus(status) {
  await chrome.storage.local.set({
    lastSyncStatus: status,
    lastSyncAt: new Date().toISOString(),
  });
}

async function syncCookies() {
  try {
    const [naverCookies, searchAdvisorCookies, adminSession] = await Promise.all([
      chrome.cookies.getAll({ domain: ".naver.com" }),
      chrome.cookies.getAll({ domain: "searchadvisor.naver.com" }),
      chrome.cookies.get({ url: "https://semolink.store", name: "admin_session" }),
    ]);

    const merged = [...naverCookies, ...searchAdvisorCookies];
    const header = cookieHeader(merged);
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
