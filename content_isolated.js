// ==========================================
// 1. 予約枠を監視して自動入力するメイン関数
// ==========================================
function checkAndRefresh() {
    // pca0200.php 以外のフレーム（メニュー等）では実行しない
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targets', 'totalCount'], (config) => {
        if (!config.isRunning || !config.targets || config.targets.length === 0 || !config.totalCount) return;

        let remainingNeed = parseInt(config.totalCount, 10); // 確保したい残り台数
        let inputDone = false;

        console.log(`[監視中] 目標合計: ${remainingNeed}台 / 候補枠数: ${config.targets.length}件`);

        const rows = document.querySelectorAll('.common-table tr');

        // 表を上から（日付順）、左から（ラウンド順）に走査
        for (const row of rows) {
            if (remainingNeed <= 0) break;

            const dateCell = row.cells[0];
            if (!dateCell) continue;
            const dateText = dateCell.innerText;

            const targetMatches = config.targets.filter(t => dateText.includes(t.date));
            if (targetMatches.length === 0) continue;

            for (let r = 1; r <= 4; r++) {
                if (remainingNeed <= 0) break;
                if (!targetMatches.some(t => t.round === r)) continue;

                const cell = row.cells[r];
                if (!cell) continue;

                const input = cell.querySelector('input[type="text"]');
                if (input) {
                    let availableCount = 99; // デフォルトは余裕あり
                    const cellText = cell.innerText.replace(/[^0-9]/g, '');
                    if (cellText) {
                        availableCount = parseInt(cellText, 10);
                    }

                    // 必要な数と残席数を比べて、入力できるだけ入力する
                    const takeCount = Math.min(remainingNeed, availableCount);

                    if (takeCount > 0) {
                        input.value = takeCount;
                        remainingNeed -= takeCount;
                        inputDone = true;
                        console.log(`🔥 確保成功！ ${dateText} の ${r}R に [${takeCount}]台 入力。（あと ${remainingNeed} 台必要）`);
                    }
                }
            }
        }

        // --- 1台でも確保できたら送信 ---
        if (inputDone) {
            console.log("予約実行へ移行します...");
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false }); // 重複実行を防ぐ
                setTimeout(() => submitBtn.click(), 500);
            }
        } 
        // --- ひとつも確保できなかったら表示更新 ---
        else {
            const waitTime = Math.floor(Math.random() * 2000) + 3000;
            console.log(`${waitTime / 1000}秒後に表示更新します...`);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('DO_DISPLAY_UPDATE'));
            }, waitTime);
        }
    });
}

// ==========================================
// 2. ポップアップ画面との通信用リスナー
// ==========================================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    // ① ポップアップの「監視スタート」ボタンが押された時
    if (msg.action === "start") {
        checkAndRefresh();
    }
    
    // ② ポップアップが開かれて「画面の日付を教えて」とリクエストが来た時
    if (msg.action === "getDates") {
        const dates = [];
        if (location.href.includes('pca0200')) {
            const rows = document.querySelectorAll('.common-table tr');
            for (const row of rows) {
                const dateCell = row.cells[0];
                if (dateCell && dateCell.tagName === 'TD') {
                    // 日付文字列（YYYY/MM/DD）を抽出
                    const match = dateCell.innerText.match(/\d{4}\/\d{2}\/\d{2}/);
                    if (match) {
                        dates.push(match[0]);
                    }
                }
            }
        }
        sendResponse({ dates: dates });
        return true; // 非同期で返すための設定
    }
});

// ==========================================
// 3. ページ読み込み時の自動実行トリガー
// ==========================================
if (document.readyState === 'complete') {
    checkAndRefresh();
} else {
    window.addEventListener('load', checkAndRefresh);
}