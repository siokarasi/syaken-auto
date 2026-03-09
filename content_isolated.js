function checkAndRefresh() {
    if (!location.href.includes('pca0200')) return;

    chrome.storage.local.get(['isRunning', 'targets', 'totalCount'], (config) => {
        if (!config.isRunning || !config.targets || config.targets.length === 0 || !config.totalCount) return;

        let remainingNeed = parseInt(config.totalCount, 10);
        let inputDone = false;

        const rows = document.querySelectorAll('.common-table tr');
        
        // ヘッダーなどを除外し、1列目に日付（2026/03/10など）が入っている「データ行」だけを抽出
        const dataRows = Array.from(rows).filter(r => r.cells[0] && r.cells[0].innerText.match(/\d{4}\/\d{2}\/\d{2}/));

        // 表を上から走査（i = 0〜3）
        for (let i = 0; i < dataRows.length; i++) {
            if (remainingNeed <= 0) break;
            const row = dataRows[i];

            // この行（i）に対する監視設定があるか
            const targetMatches = config.targets.filter(t => t.rowIndex === i);
            if (targetMatches.length === 0) continue;

            for (let r = 1; r <= 4; r++) {
                if (remainingNeed <= 0) break;
                if (!targetMatches.some(t => t.round === r)) continue;

                const cell = row.cells[r];
                if (!cell) continue;

                // 入力欄（テキストボックス）があるかチェック
                const input = cell.querySelector('input[type="text"]');
                if (input) {
                    let availableCount = 99;
                    const cellText = cell.innerText.replace(/[^0-9]/g, '');
                    if (cellText) availableCount = parseInt(cellText, 10);

                    const takeCount = Math.min(remainingNeed, availableCount);

                    if (takeCount > 0) {
                        // 【手癖のエミュレート部分】
                        // 1. TABキーで対象のセルにカーソルを移動させた状態を作る
                        input.focus(); 
                        
                        // 2. 人間が数字を打ち込む
                        input.value = takeCount;
                        
                        // 3. PHPシステムに「キーボードで入力された」と認識させるためのイベント発火
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));

                        remainingNeed -= takeCount;
                        inputDone = true;
                        console.log(`🔥 [上から${i+1}行目] ${r}R にカーソルを合わせて [${takeCount}]台 入力。（残り ${remainingNeed} 台）`);
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
                
                setTimeout(() => {
                    // 送信ボタンにTABキーでフォーカスを合わせ、Enter(Click)するエミュレート
                    submitBtn.focus();
                    submitBtn.click();
                }, 500);
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