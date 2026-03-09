function checkAndAct() {
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targetDate', 'targetRound', 'targetCount'], (config) => {
        if (!config.isRunning) return;

        console.log(`[監視中] 対象: ${config.targetDate} / ${config.targetRound}R`);

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

        if (targetInput) {
            // 空きあり：入力してクリック（これはISOLATEDから可能）
            targetInput.value = config.targetCount;
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false });
                setTimeout(() => submitBtn.click(), 500);
            }
        } else {
            // 空きなし：MAIN側の世界に「表示更新せよ」とカスタムイベントを送る
            const waitTime = Math.floor(Math.random() * 2000) + 3000;
            console.log(`${waitTime / 1000}秒後に「表示更新」を命令します...`);

            setTimeout(() => {
                // カスタムイベントを発火させて、MAIN側のスクリプトに通知する
                const event = new CustomEvent('TRIGGER_SUBMIT_FORM');
                window.dispatchEvent(event);
            }, waitTime);
        }
    });
}

chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") checkAndAct(); });
if (document.readyState === 'complete') checkAndAct(); else window.addEventListener('load', checkAndAct);