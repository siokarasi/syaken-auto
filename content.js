function main() {
    // pca0200.php が含まれるメインフレーム（mainフレーム）でのみ実行
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targetDate', 'targetRound', 'targetCount'], (config) => {
        if (!config.isRunning) return;

        console.log(`[監視中] 対象: ${config.targetDate} / ${config.targetRound}R`);

        // --- 1. 予約枠のチェック ---
        const rows = document.querySelectorAll('.common-table tr');
        let targetInput = null;

        for (const row of rows) {
            if (row.cells[0] && row.cells[0].innerText.includes(config.targetDate)) {
                const roundIdx = parseInt(config.targetRound);
                const cell = row.cells[roundIdx];
                if (cell && cell.classList.contains('zan')) {
                    targetInput = cell.querySelector('input[type="text"]');
                }
                break;
            }
        }

        // --- 2. 空きがあった場合：予約入力して送信 ---
        if (targetInput) {
            console.log("🔥 空き発見！入力します。");
            targetInput.value = config.targetCount;
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false });
                setTimeout(() => submitBtn.click(), 500);
            }
            return;
        }

        // --- 3. 空きがない場合：キーエミュレーションで表示更新 ---
        const waitTime = Math.floor(Math.random() * 2000) + 3000;
        console.log(`${waitTime / 1000}秒後に「表示更新」をキー操作で実行します...`);

        setTimeout(() => {
            const updateBtn = document.querySelector('button[name="cmdselect"]');
            
            if (updateBtn) {
                console.log("ボタンにフォーカス（TAB相当）してENTERを送信します。");

                // ① ボタンにフォーカスを当てる（TABキーで選択した状態にする）
                updateBtn.focus();

                // ② ENTERキーの「押し下げ(keydown)」と「離し(keyup)」イベントを作成
                const keyConfig = {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                };

                const downEvent = new KeyboardEvent('keydown', keyConfig);
                const upEvent = new KeyboardEvent('keyup', keyConfig);

                // ③ イベントを順番に発行（これによりonclickが発火しやすくなります）
                updateBtn.dispatchEvent(downEvent);
                updateBtn.dispatchEvent(upEvent);

                // 念のためクリックも同時並行で試行（CSPエラーにならない安全な方法）
                updateBtn.click();
            } else {
                console.error("表示更新ボタンが見つかりません。");
                // ボタンが見つからない場合はフレーム全体を強制更新
                location.reload(); 
            }
        }, waitTime);
    });
}

// 起動処理
chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") main(); });
if (document.readyState === 'complete') main(); else window.addEventListener('load', main);