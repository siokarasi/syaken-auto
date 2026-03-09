function checkAndRefresh() {
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targets'], (config) => {
        if (!config.isRunning || !config.targets || config.targets.length === 0) return;

        console.log(`[監視中] 狙っている枠数: ${config.targets.length}件`);

        let foundAny = false;
        const rows = document.querySelectorAll('.common-table tr');

        // 表のすべての行（日付）を確認
        for (const row of rows) {
            const dateCell = row.cells[0];
            if (!dateCell) continue;
            
            const dateText = dateCell.innerText;

            // この行の日付に一致するターゲットをすべて抽出
            const targetsForThisDate = config.targets.filter(t => dateText.includes(t.date));

            for (const target of targetsForThisDate) {
                // target.roundは1〜4なので、そのままcells[1]〜cells[4]に対応します
                const cell = row.cells[target.round];
                
                // 空きがあるクラス（zan）と入力欄があるか確認
                if (cell && cell.classList.contains('zan')) {
                    const input = cell.querySelector('input[type="text"]');
                    if (input) {
                        // 台数を入力
                        input.value = target.count;
                        foundAny = true;
                        console.log(`🔥 空き発見！ ${target.date} の ${target.round}R に [${target.count}]台 入力しました。`);
                    }
                }
            }
        }

        // --- 1つでも入力できた枠があれば、送信して終了 ---
        if (foundAny) {
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false });
                setTimeout(() => submitBtn.click(), 500);
            }
        } 
        // --- ひとつも空きがなければ表示更新 ---
        else {
            const waitTime = Math.floor(Math.random() * 2000) + 3000;
            console.log(`${waitTime / 1000}秒後にイベントを発火します...`);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('DO_DISPLAY_UPDATE'));
            }, waitTime);
        }
    });
}

chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") checkAndRefresh(); });
if (document.readyState === 'complete') checkAndRefresh(); else window.addEventListener('load', checkAndRefresh);