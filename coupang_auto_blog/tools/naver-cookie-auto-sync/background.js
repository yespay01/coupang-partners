const SYNC_ALARM = "naver-sa-report-sync";
const SNAPSHOT_URL = "https://semolink.store/api/admin/credentials/naver-sa/snapshot";
const REPORT_PAGE =
  "https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Fsemolink.store";
const SITE_HASH = "4b2cc44a6fc01e87c7081210a5c4a974e1b02b6d701dbf3c379563b913f65984";
const SITE_URL = "https://semolink.store";
const PERIODS = [
  { dateRange: "7d", period: 7 },
  { dateRange: "30d", period: 30 },
  { dateRange: "all", period: 90 },
];

async function saveStatus(status) {
  await chrome.storage.local.set({
    lastSyncStatus: status,
    lastSyncAt: new Date().toISOString(),
  });
}

function waitForTab(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      error ? reject(error) : resolve();
    };
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    };
    const timer = setTimeout(
      () => finish(new Error("네이버 서치어드바이저 연결 시간이 초과됐습니다.")),
      timeoutMs
    );
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") finish();
    }).catch(finish);
  });
}

async function readReportsInNaverTab() {
  const existing = await chrome.tabs.query({ url: "https://searchadvisor.naver.com/*" });
  let tab = existing[0];
  let created = false;

  if (!tab?.id) {
    tab = await chrome.tabs.create({ url: REPORT_PAGE, active: false });
    created = true;
  } else if (!tab.url?.includes("/console/site/report/expose")) {
    tab = await chrome.tabs.update(tab.id, { url: REPORT_PAGE, active: false });
  }

  try {
    await waitForTab(tab.id);
    const loadedTab = await chrome.tabs.get(tab.id);
    if (!loadedTab.url?.startsWith("https://searchadvisor.naver.com/")) {
      throw new Error("네이버 서치어드바이저 로그인이 필요합니다.");
    }

    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: async (siteHash, siteUrl, periods) => {
        const reports = [];
        for (const item of periods) {
          const url = `/api-console/report/expose/${siteHash}?site=${encodeURIComponent(siteUrl)}&period=${item.period}&device=d&topN=30`;
          const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { accept: "application/json" },
          });
          if (!response.ok) return { ok: false, status: response.status };
          reports.push({ dateRange: item.dateRange, report: await response.json() });
        }
        return { ok: true, reports };
      },
      args: [SITE_HASH, SITE_URL, PERIODS],
    });

    const result = injection[0]?.result;
    if (!result?.ok) {
      throw new Error(`네이버 통계 조회 실패${result?.status ? ` (HTTP ${result.status})` : ""}`);
    }
    return result.reports;
  } finally {
    if (created && tab?.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function uploadReports(reports) {
  const adminSession = await chrome.cookies.get({
    url: "https://semolink.store/",
    name: "admin_session",
  });
  if (!adminSession?.value) {
    throw new Error("세모링크 관리자 로그인이 필요합니다.");
  }

  for (const item of reports) {
    const response = await fetch(SNAPSHOT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminSession.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || `서버 저장 실패 (HTTP ${response.status})`);
    }
  }
}

async function syncReports() {
  try {
    const reports = await readReportsInNaverTab();
    await uploadReports(reports);
    await saveStatus({ ok: true, message: "네이버 통계 자동 동기화 완료" });
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
  syncReports().catch(() => chrome.runtime.openOptionsPage());
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  syncReports().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) syncReports().catch(() => {});
});

chrome.action.onClicked.addListener(() => {
  syncReports().catch(() => {}).finally(() => chrome.runtime.openOptionsPage());
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "sync-now") return;
  syncReports()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, message: error.message }));
  return true;
});
