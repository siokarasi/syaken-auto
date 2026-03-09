function main() {
    // 1. 正しいフレーム（pca0200が含まれるメイン画面）でのみ実行
    if (!location.href.includes('pca0200.php')) return;

    chrome.storage.local.get(['isRunning', 'targetDate', 'targetRound', 'targetCount'], (config) => {
        if (!config.isRunning) return;

        console.log(`[監視中] 対象: ${config.targetDate} / ${config.targetRound}R`);

        // 2. 予約枠の解析
        const rows = document.querySelectorAll('.common-table tr');
        let targetInput = null;

        for (const row of rows) {
            const dateCell = row.cells[0];
            if (dateCell && dateCell.innerText.includes(config.targetDate)) {
                const roundIndex = parseInt(config.targetRound);
                const cell = row.cells[roundIndex];
                if (cell && cell.classList.contains('zan')) {
                    targetInput = cell.querySelector('input[type="text"]');
                }
                break;
            }
        }

        // 3. 空きがあった場合の処理
        if (targetInput) {
            console.log("🔥 空き発見！入力を開始します。");
            targetInput.value = config.targetCount;
            
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false }); // 重複防止
                setTimeout(() => submitBtn.click(), 500);
            }
            return;
        }

        // 4. 空きがない場合の「表示更新」処理（ここを大幅強化）
        const waitTime = Math.floor(Math.random() * 2000) + 3000;
        console.log(`${waitTime / 1000}秒後に表示更新を実行します...`);

        setTimeout(() => {
            // ページ側の世界で定義されている submitform() を強制実行させる
            // これにより、PHP側が期待するPOSTデータが正しく送信されます
            const script = document.createElement('script');
            script.textContent = `
                if (typeof submitform === 'function') {
                    submitform();
                } else if (document.form1) {
                    document.form1.submit();
                }
            `;
            document.documentElement.appendChild(script);
            script.remove();
            
            console.log("表示更新命令を送信しました。");
        }, waitTime);
    });
}

// メッセージ待機と実行
chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") main(); });
if (document.readyState === 'complete') main(); else window.addEventListener('load', main);