document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDisplay = document.getElementById('statusDisplay');

    // 現在のステータスを表示
    chrome.storage.local.get(['isRunning'], (result) => {
        if (result.isRunning) {
            statusDisplay.textContent = "現在の状態: 🟢 監視中";
        } else {
            statusDisplay.textContent = "現在の状態: 🔴 停止中";
        }
    });

    // 監視スタートボタン
    startBtn.addEventListener('click', () => {
        chrome.storage.local.set({ isRunning: true }, () => {
            statusDisplay.textContent = "現在の状態: 🟢 監視中";
            reloadActiveTab();
        });
    });

    // 停止ボタン
    stopBtn.addEventListener('click', () => {
        chrome.storage.local.set({ isRunning: false }, () => {
            statusDisplay.textContent = "現在の状態: 🔴 停止中";
        });
    });

    // 現在のタブをリロードしてcontent.jsを再実行させる関数
    function reloadActiveTab() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if(tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    }
});