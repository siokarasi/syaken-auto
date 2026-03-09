// インストール・更新直後の初期設定
chrome.runtime.onInstalled.addListener(() => {
    updateBadge(false);
});

// ブラウザの記憶領域（isRunning）の変化を常に監視
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isRunning !== undefined) {
        updateBadge(changes.isRunning.newValue);
    }
});

// アイコンのバッジ（文字と色）を更新する関数
function updateBadge(isRunning) {
    if (isRunning) {
        // 動作中：緑色で「ON」
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); 
    } else {
        // 停止中：赤色で「OFF」
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' }); 
    }
}