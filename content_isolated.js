// ==========================================
// 1. 予約枠を監視して自動入力するメイン関数
// ==========================================
function checkAndRefresh() {
    chrome.storage.local.get(['isRunning'], (globalConfig) => {
        
        const isTabRunning = sessionStorage.getItem('ams_isRunning') === 'true';
        if (!globalConfig.isRunning || !isTabRunning) return;

        // 🚨 安全装置（ログイン画面）
        if (location.href.includes('login')) {
            console.error("🚨 ログイン画面を検知しました。安全装置が作動し、自動化を強制終了します。");
            chrome.storage.local.set({ isRunning: false });
            sessionStorage.setItem('ams_isRunning', 'false');
            sessionStorage.setItem('ams_phase', 'idle');
            return;
        }

        const tabPhase = sessionStorage.getItem('ams_phase') || 'idle';
        const tabSecuredCount = parseInt(sessionStorage.getItem('ams_securedCount') || '0', 10);
        let tabTargets = JSON.parse(sessionStorage.getItem('ams_targets') || '[]');
        let tabTotalCount = parseInt(sessionStorage.getItem('ams_totalCount') || '1', 10);

        const config = {
            isRunning: globalConfig.isRunning,
            targets: tabTargets,
            totalCount: tabTotalCount,
            phase: tabPhase,
            securedCount: tabSecuredCount
        };

        // ==========================================
        // 【フェーズ3】予約完了画面
        // ==========================================
        if (config.phase === 'completed') {
            const securedCount = config.securedCount || 0;
            const flyout = document.createElement('div');
            flyout.style.cssText = `position: fixed; bottom: 20px; left: 20px; background-color: #323232; color: #ffffff; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-size: 15px; font-family: sans-serif; font-weight: bold; opacity: 0; transform: translateY(10px); transition: all 0.4s ease; pointer-events: none;`;
            flyout.innerHTML = `✅ 自動予約: <span style="color: #4CAF50; font-size: 18px;">${securedCount}</span> 台確保しました`;
            if (document.body) {
                document.body.appendChild(flyout);
                setTimeout(() => { flyout.style.opacity = '1'; flyout.style.transform = 'translateY(0)'; }, 100);
                setTimeout(() => { flyout.style.opacity = '0'; flyout.style.transform = 'translateY(10px)'; setTimeout(() => flyout.remove(), 400); }, 5000);
            }
            sessionStorage.setItem('ams_isRunning', 'false');
            sessionStorage.setItem('ams_phase', 'idle');
            return;
        }

        // ==========================================
        // 【フェーズ2】確認画面での最終確定処理
        // ==========================================
        if (config.isRunning && config.phase === 'confirm') {
            console.log("【フェーズ2】確認画面フラグを検知しました。確定処理を実行します！");
            const buttons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
            const confirmBtn = buttons.find(btn => btn.value === '登録' || btn.textContent.includes('登録')) || buttons[1];
            
            if (confirmBtn) {
                sessionStorage.setItem('ams_phase', 'completed');
                setTimeout(() => {
                    console.log(`[手癖の学習] ⌨️ TABキーを 2 回打鍵 ⇨ [登録]ボタンにフォーカス`);
                    confirmBtn.focus();
                    console.log(`[手癖の学習] ⌨️ SPACEキーを打鍵して最速で確定します！`);
                    confirmBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                    confirmBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                    confirmBtn.click(); 
                }, 150);
            } else {
                console.error("「登録」ボタンが見つかりませんでした。");
                sessionStorage.setItem('ams_phase', 'idle');
            }
            return;
        }

        // ==========================================
        // 【フェーズ1】予約画面の監視と入力
        // ==========================================
        if (config.isRunning && config.phase === 'idle') {
            if (!config.targets || config.targets.length === 0 || !config.totalCount) return;
            let remainingNeed = parseInt(config.totalCount, 10);
            let securedCount = 0; 
            let inputDone = false;
            const rows = document.querySelectorAll('.common-table tr');
            if (!rows || rows.length === 0) return;
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
                    const input = cell ? cell.querySelector('input[type="text"]') : null;
                    if (input) {
                        let availableCount = 99;
                        const cellText = cell.innerText.replace(/[^0-9]/g, '');
                        if (cellText) availableCount = parseInt(cellText, 10);
                        const takeCount = Math.min(remainingNeed, availableCount);
                        if (takeCount > 0) {
                            const targetIndex = allFocusableInputs.indexOf(input);
                            const tabPresses = targetIndex - currentFocusIndex;
                            currentFocusIndex = targetIndex; 
                            console.log(`[手癖の学習] ⌨️ TABキーを ${tabPresses} 回打鍵 ⇨ ${i+1}行目の ${r}R にフォーカス`);
                            input.focus(); 
                            input.value = takeCount;
                            console.log(`[手癖の学習] ⌨️ 数字の [${takeCount}] を入力（残り ${remainingNeed - takeCount} 台必要）`);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            remainingNeed -= takeCount;
                            securedCount += takeCount; 
                            inputDone = true;
                        }
                    }
                }
            }

            if (inputDone) {
                console.log("予約実行へ移行します...");
                const submitBtn = document.querySelector('button[name="cmdsubmit"]');
                if (submitBtn) {
                    sessionStorage.setItem('ams_phase', 'confirm');
                    sessionStorage.setItem('ams_securedCount', securedCount.toString());
                    const remainingTabs = (allFocusableInputs.length - 1 - currentFocusIndex) + 1;
                    setTimeout(() => {
                        console.log(`[手癖の学習] ⌨️ TABキーを ${remainingTabs} 回打鍵 ⇨ [登録確認]ボタンにフォーカス`);
                        submitBtn.focus();
                        console.log(`[手癖の学習] ⌨️ SPACEキーを打鍵してフォームを送信します`);
                        submitBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        submitBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        submitBtn.click();
                    }, 100); 
                }
            } else {
                const waitTime = Math.floor(Math.random() * 700) + 1000;
                console.log(`${waitTime / 1000}秒後に表示更新します...`);
                setTimeout(() => {
                    const refreshBtn = document.querySelector('button[name="cmdselect"]');
                    if (refreshBtn) {
                        console.log(`[手癖の学習] ⌨️ TABキーを 3 回打鍵 ⇨ [表示更新]ボタンにフォーカス`);
                        refreshBtn.focus();
                        console.log(`[手癖の学習] ⌨️ SPACEキーを打鍵して表示更新を実行します`);
                        refreshBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        refreshBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        refreshBtn.click();
                    } else { location.reload(); }
                }, waitTime);
            }
        }
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "start") {
        chrome.storage.local.get(['targets', 'totalCount'], (data) => {
            sessionStorage.setItem('ams_isRunning', 'true');
            sessionStorage.setItem('ams_phase', 'idle');
            sessionStorage.setItem('ams_targets', JSON.stringify(data.targets || []));
            sessionStorage.setItem('ams_totalCount', data.totalCount || '1');
            checkAndRefresh();
        });
    } else if (msg.action === "stop_tab") {
        sessionStorage.setItem('ams_isRunning', 'false');
    } else if (msg.action === "stop_all") {
        sessionStorage.setItem('ams_isRunning', 'false');
    }
});

if (document.readyState === 'complete') { checkAndRefresh(); } else { window.addEventListener('load', checkAndRefresh); }