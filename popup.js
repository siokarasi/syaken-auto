const elements = ['targetDate', 'targetRound', 'targetCount'];

document.addEventListener('DOMContentLoaded', () => {
    // 保存されている設定を復元
    chrome.storage.local.get(['isRunning', ...elements], (data) => {
        elements.forEach(id => {
            if (data[id]) document.getElementById(id).value = data[id];
        });
        updateStatus(data.isRunning);
    });

    document.getElementById('startBtn').addEventListener('click', () => {
        const settings = { isRunning: true };
        elements.forEach(id => settings[id] = document.getElementById(id).value);
        
        chrome.storage.local.set(settings, () => {
            updateStatus(true);
            // ページをリロードせずにメッセージで開始（F5対策）
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "start" });
            });
        });
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
        chrome.storage.local.set({ isRunning: false }, () => updateStatus(false));
    });
});

function updateStatus(isRunning) {
    const s = document.getElementById('status');
    s.textContent = isRunning ? "🟢 監視中" : "🔴 停止中";
    s.className = `status ${isRunning ? 'running' : 'stopped'}`;
}