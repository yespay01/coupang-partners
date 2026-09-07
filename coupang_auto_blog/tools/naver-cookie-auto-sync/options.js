const statusEl = document.querySelector("#status");
const syncButton = document.querySelector("#sync");

function render(status, at) {
  statusEl.className = status?.ok ? "success" : status ? "error" : "";
  const time = at ? new Date(at).toLocaleString("ko-KR") : "";
  statusEl.textContent = status ? `${status.message}${time ? ` (${time})` : ""}` : "아직 동기화하지 않았습니다.";
}

async function loadStatus() {
  const { lastSyncStatus, lastSyncAt } = await chrome.storage.local.get([
    "lastSyncStatus",
    "lastSyncAt",
  ]);
  render(lastSyncStatus, lastSyncAt);
}

syncButton.addEventListener("click", async () => {
  syncButton.disabled = true;
  statusEl.className = "";
  statusEl.textContent = "동기화 중...";
  const result = await chrome.runtime.sendMessage({ type: "sync-now" });
  if (!result?.ok) render({ ok: false, message: result?.message || "동기화 실패" });
  else await loadStatus();
  syncButton.disabled = false;
});

loadStatus();
