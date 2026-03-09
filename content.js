function main() {
    chrome.storage.local.get(['isRunning', 'targetDate', 'targetRound', 'targetCount'], (config) => {
        if (!config.isRunning) return;

        // 1. 確認画面(pca0201.php)にいる場合
        if (location.href.includes('pca0201.php')) {
            console.log("確認画面です。最終確定ボタンを探します。");
            // 念のため自動で止まらないよう、ここで「登録」ボタン等を探してクリックする処理を追加可能
            // 一旦、手動確認を挟む場合はここで通知を出すなどの処理が良いでしょう。
            return;
        }

        // 2. 予約入力画面(pca0200)にいる場合
        console.log(`監視中: ${config.targetDate} の ${config.targetRound}ラウンド を狙っています...`);

        const rows = document.querySelectorAll('.common-table tr');
        let targetInput = null;

        for (const row of rows) {
            const dateCell = row.cells[0];
            if (dateCell && dateCell.innerText.includes(config.targetDate)) {
                // ラウンド1=cell[1], ラウンド2=cell[2]...
                const roundIndex = parseInt(config.targetRound);
                const cell = row.cells[roundIndex];
                
                if (cell) {
                    targetInput = cell.querySelector('input[type="text"]');
                }
                break;
            }
        }

        if (targetInput) {
            // 【空き発見！】
            console.log("🔥 空きを発見しました！入力して送信します。");
            targetInput.value = config.targetCount;
            
            // 登録確認ボタンをクリック
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                // 確実に送信するため少し待ってからクリック
                setTimeout(() => submitBtn.click(), 500);
                // 監視をOFFにする（重複予約防止）
                chrome.storage.local.set({ isRunning: false });
            }
        } else {
            // 【空きなし】表示更新ボタンを押す
            console.log("空きがありません。更新します。");
            const waitTime = Math.floor(Math.random() * 2000) + 3000; // 3-5秒

            setTimeout(() => {
                const updateBtn = document.querySelector('button[name="cmdselect"]');
                if (updateBtn) {
                    updateBtn.click();
                } else {
                    // ボタンが見つからない場合、再読み込み
                    location.reload();
                }
            }, waitTime);
        }
    });
}

// 起動トリガー
chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") main(); });
if (document.readyState === 'complete') main(); else window.addEventListener('load', main);