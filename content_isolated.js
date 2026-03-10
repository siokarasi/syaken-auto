// ==========================================
// 1. 予約枠を監視して自動入力するメイン関数
// ==========================================
function checkAndRefresh() {
    chrome.storage.local.get(['isRunning', 'targets', 'totalCount', 'phase', 'securedCount'], (config) => {
        
        // ==========================================
        // 🚨 安全装置（フェールセーフ）
        // ==========================================
        if (location.href.includes('login')) {
            console.error("🚨 ログイン画面を検知しました。安全装置が作動し、自動化を強制終了します。");
            chrome.storage.local.set({ isRunning: false, phase: 'idle' });
            return;
        }

        // ==========================================
        // 【フェーズ3】予約完了画面でのフライアウト表示（左下）
        // ==========================================
        if (config.phase === 'completed') {
            const securedCount = config.securedCount || 0;
            
            const flyout = document.createElement('div');
            flyout.style.cssText = `
                position: fixed; bottom: 20px; left: 20px; background-color: #323232; color: #ffffff;
                padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000; font-size: 15px; font-family: sans-serif; font-weight: bold;
                opacity: 0; transform: translateY(10px); transition: all 0.4s ease; pointer-events: none;
            `;
            flyout.innerHTML = `✅ 自動予約: <span style="color: #4CAF50; font-size: 18px;">${securedCount}</span> 台確保しました`;
            
            if (document.body) {
                document.body.appendChild(flyout);
                setTimeout(() => {
                    flyout.style.opacity = '1';
                    flyout.style.transform = 'translateY(0)';
                }, 100);
                setTimeout(() => {
                    flyout.style.opacity = '0';
                    flyout.style.transform = 'translateY(10px)';
                    setTimeout(() => flyout.remove(), 400);
                }, 5000);
            }
            chrome.storage.local.set({ isRunning: false, phase: 'idle', securedCount: 0 });
            return;
        }

        // ==========================================
        // 【フェーズ2】確認画面での最終確定処理（待機ゼロ）
        // ==========================================
        if (config.phase === 'confirm') {
            console.log("【フェーズ2】確認画面へ遷移しました。待機時間ゼロで即時確定します！");
            
            const confirmBtn = document.querySelector('button, input[type="submit"], input[type="button"]');
            if (confirmBtn) {
                chrome.storage.local.set({ isRunning: false, phase: 'completed' }, () => {
                    console.log(`[手癖エミュレート] ⌨️ TABキーを 1 回打鍵 ⇨ [確定]ボタンにフォーカス`);
                    confirmBtn.focus();
                    
                    console.log(`[手癖エミュレート] ⌨️ SPACEキーを打鍵して最速で確定します！`);
                    // SPACEキーの物理的な打鍵のみをエミュレート
                    confirmBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                    confirmBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                    confirmBtn.click();
                });
            } else {
                chrome.storage.local.set({ isRunning: false, phase: 'idle' });
            }
            return;
        }

        // ==========================================
        // 【フェーズ1】予約画面(pca0200)の監視と入力
        // ==========================================
        if (!config.isRunning) return; 
        if (!location.href.includes('pca0200')) return;
        if (!config.targets || config.targets.length === 0 || !config.totalCount) return;

        let remainingNeed = parseInt(config.totalCount, 10);
        let securedCount = 0; 
        let inputDone = false;

        const rows = document.querySelectorAll('.common-table tr');
        const dataRows = Array.from(rows).filter(r => r.cells[0] && r.cells[0].innerText.match(/\d{4}\/\d{2}\/\d{2}/));
        const allFocusableInputs = Array.from(document.querySelectorAll('.common-table input[type="text"]'));
        let currentFocusIndex = -1;

        for (let i = 0; i < dataRows.length; i++) {
            if (remainingNeed <= 0) break;
            const row = dataRows[i];

            const targetMatches = config.targets.filter(t => t.rowIndex === i);
            if (targetMatches.length === 0) continue;

            for (let r = 1; r <= 4; r++) {
                if (remainingNeed <= 0) break;
                if (!targetMatches.some(t => t.round === r)) continue;

                const cell = row.cells[r];
                if (!cell) continue;

                const input = cell.querySelector('input[type="text"]');
                if (input) {
                    let availableCount = 99;
                    const cellText = cell.innerText.replace(/[^0-9]/g, '');
                    if (cellText) availableCount = parseInt(cellText, 10);

                    const takeCount = Math.min(remainingNeed, availableCount);

                    if (takeCount > 0) {
                        const targetIndex = allFocusableInputs.indexOf(input);
                        const tabPresses = targetIndex - currentFocusIndex;
                        currentFocusIndex = targetIndex; 

                        console.log(`[手癖エミュレート] ⌨️ TABキーを ${tabPresses} 回打鍵 ⇨ ${i+1}行目の ${r}R にフォーカス`);
                        input.focus(); 
                        input.value = takeCount;
                        console.log(`[手癖エミュレート] ⌨️ 数字の [${takeCount}] を入力（残り ${remainingNeed - takeCount} 台必要）`);
                        
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));

                        remainingNeed -= takeCount;
                        securedCount += takeCount; 
                        inputDone = true;
                    }
                }
            }
        }

        // --- 空き枠を確保できた場合 ---
        if (inputDone) {
            console.log("予約実行へ移行します...");
            const submitBtn = document.querySelector('button[name="cmdsubmit"]');
            if (submitBtn) {
                chrome.storage.local.set({ phase: 'confirm', securedCount: securedCount }, () => {
                    const remainingTabs = (allFocusableInputs.length - 1 - currentFocusIndex) + 1;
                    
                    setTimeout(() => {
                        console.log(`[手癖エミュレート] ⌨️ TABキーを ${remainingTabs} 回打鍵 ⇨ [登録確認]ボタンにフォーカス`);
                        submitBtn.focus();
                        
                        console.log(`[手癖エミュレート] ⌨️ SPACEキーを打鍵してフォームを送信します`);
                        // SPACEキーの物理的な打鍵のみをエミュレート
                        submitBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        submitBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        submitBtn.click();

                    }, 800); 
                });
            }
        } 
        // --- 空き枠がなかった場合（表示更新） ---
        else {
            const waitTime = Math.floor(Math.random() * 1000) + 1500;
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
    if (msg.action === "start") {
        chrome.storage.local.set({ phase: 'idle', securedCount: 0 }, () => {
            checkAndRefresh();
        });
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