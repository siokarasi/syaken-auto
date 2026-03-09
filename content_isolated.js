function checkAndRefresh() {
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targets', 'totalCount'], (config) => {
        if (!config.isRunning || !config.targets || config.targets.length === 0 || !config.totalCount) return;

        let remainingNeed = parseInt(config.totalCount, 10); // まだ確保しなければならない台数
        let inputDone = false; // 1台でも入力したかどうかのフラグ

        console.log(`[監視中] 目標合計: ${remainingNeed}台 / 候補枠数: ${config.targets.length}件`);

        const rows = document.querySelectorAll('.common-table tr');

        // 表を上から（日付の早い順に）走査
        for (const row of rows) {
            if (remainingNeed <= 0) break; // 必要な台数をすべて確保できたら終了

            const dateCell = row.cells[0];
            if (!dateCell) continue;
            const dateText = dateCell.innerText;

            // この行の日付が、狙っている候補の中に含まれているか？
            const targetMatches = config.targets.filter(t => dateText.includes(t.date));
            if (targetMatches.length === 0) continue;

            // ラウンド1〜4を左から（早い順に）走査
            for (let r = 1; r <= 4; r++) {
                if (remainingNeed <= 0) break;

                // このラウンドが候補としてチェックされているか？
                if (!targetMatches.some(t => t.round === r)) continue;

                const cell = row.cells[r];
                if (!cell) continue;

                // 入力欄があるか確認（＝空きがあるか）
                const input = cell.querySelector('input[type="text"]');
                if (input) {
                    let availableCount = 99; // デフォルトは「余裕あり」とする

                    // 提供されたソース通り、セル内の数字（残席数）を読み取る
                    // 例: "3<input...>" のようなHTMLから "3" を抽出
                    const cellText = cell.innerText.replace(/[^0-9]/g, '');
                    if (cellText) {
                        availableCount = parseInt(cellText, 10);
                    }

                    // 「残り必要な数」と「この枠の残席数」のうち、小さい方だけ入力する
                    const takeCount = Math.min(remainingNeed, availableCount);

                    if (takeCount > 0) {
                        input.value = takeCount;
                        remainingNeed -= takeCount; // 必要な数を減らす
                        inputDone = true;
                        console.log(`🔥 確保成功！ ${dateText} の ${r}R に [${takeCount}]台 入力。（あと ${remainingNeed} 台必要）`);
                    }
                }
            }
        }

        // --- 1台でも確保できたら、送信ボタンを押す ---
        if (inputDone) {
            console.log("予約実行へ移行します...");
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ isRunning: false });
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

chrome.runtime.onMessage.addListener((msg) => { if (msg.action === "start") checkAndRefresh(); });
if (document.readyState === 'complete') checkAndRefresh(); else window.addEventListener('load', checkAndRefresh);