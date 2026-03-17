// ==========================================
// 1. 予約枠を監視して自動入力するメイン関数
// ==========================================
function checkAndRefresh() {
    chrome.storage.local.get(['isRunning', 'targets', 'phase', 'securedCount', 'securedTotal', 'pendingSecuredTargets'], (config) => {
        
        // ==========================================
        // 🚨 安全装置（フェールセーフ）
        // ==========================================
        if (location.href.includes('login')) {
            console.error("🚨 ログイン画面を検知しました。安全装置が作動し、自動化を強制終了します。");
            chrome.storage.local.set({ isRunning: false, phase: 'idle' });
            return;
        }

        // ==========================================
        // 【フェーズ3】予約完了画面でのフライアウト表示
        // ==========================================
        if (config.phase === 'completed') {
            const securedTotal = config.securedTotal || 0;
            
            const flyout = document.createElement('div');
            flyout.style.cssText = `
                position: fixed; bottom: 20px; left: 20px; background-color: #323232; color: #ffffff;
                padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000; font-size: 15px; font-family: sans-serif; font-weight: bold;
                opacity: 0; transform: translateY(10px); transition: all 0.4s ease; pointer-events: none;
            `;
            flyout.innerHTML = `✅ 自動予約: <span style="color: #4CAF50; font-size: 18px;">${securedTotal}</span> 台の確保目標を達成しました`;
            
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
            chrome.storage.local.set({ phase: 'idle', securedCount: 0 }); 
            return;
        }

        // ==========================================
        // 【フェーズ2】確認画面での最終確定処理
        // ==========================================
        if (config.isRunning && config.phase === 'confirm') {
            const pendingSecuredTargets = Array.isArray(config.pendingSecuredTargets) ? config.pendingSecuredTargets : [];
            const securedThisRound = pendingSecuredTargets.reduce((sum, t) => sum + parseInt(t.count || 0, 10), 0);
            const securedTotal = parseInt(config.securedTotal || 0, 10) + securedThisRound;
            const currentTargets = Array.isArray(config.targets) ? config.targets : [];

            const securedMap = new Map();
            pendingSecuredTargets.forEach(t => {
                const key = `${t.rowIndex}_${t.round}`;
                securedMap.set(key, (securedMap.get(key) || 0) + parseInt(t.count || 0, 10));
            });

            const updatedTargets = currentTargets
                .map(t => {
                    const key = `${t.rowIndex}_${t.round}`;
                    const securedForTarget = securedMap.get(key) || 0;
                    const nextCount = Math.max(0, parseInt(t.count || 0, 10) - securedForTarget);
                    return { rowIndex: t.rowIndex, round: t.round, count: nextCount };
                })
                .filter(t => t.count > 0);

            console.log(`【フェーズ2】確認画面に到達。今回確保: ${securedThisRound} 台 / 残りターゲット: ${updatedTargets.length} 件`);

            const buttons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
            const backBtn = buttons.find(btn => btn.value === '戻る' || btn.textContent.includes('戻る'));

            if (updatedTargets.length === 0) {
                chrome.storage.local.set({
                    isRunning: false,
                    phase: 'completed',
                    targets: [],
                    securedTotal: securedTotal,
                    securedCount: 0,
                    pendingSecuredTargets: []
                });
                return;
            }

            if (backBtn) {
                chrome.storage.local.set({
                    isRunning: true,
                    phase: 'idle',
                    targets: updatedTargets,
                    securedTotal: securedTotal,
                    securedCount: 0,
                    pendingSecuredTargets: []
                }, () => {
                    setTimeout(() => {
                        console.log('[KBエミュレーション] ⌨️ TABキーを 1 回打鍵 ⇨ [戻る]ボタンにフォーカス');
                        backBtn.focus();

                        console.log('[KBエミュレーション] ⌨️ ENTERキーを打鍵して予約画面へ戻ります');
                        backBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                        backBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                        backBtn.click();
                    }, 120);
                });
            } else {
                console.error('「戻る」ボタンが見つかりませんでした。安全のため停止します。');
                chrome.storage.local.set({ isRunning: false, phase: 'idle', targets: updatedTargets, securedTotal: securedTotal, securedCount: 0, pendingSecuredTargets: [] });
            }
            return;
        }

        // ==========================================
        // 【フェーズ1】予約画面の監視と入力
        // ==========================================
        if (config.isRunning && (!config.phase || config.phase === 'idle')) {
            if (!config.targets || config.targets.length === 0) {
                chrome.storage.local.set({ isRunning: false, phase: 'completed' });
                return;
            }

            const targetMap = new Map();
            config.targets.forEach(t => {
                const need = parseInt(t.count || 0, 10);
                if (need > 0) {
                    targetMap.set(`${t.rowIndex}_${t.round}`, need);
                }
            });

            if (targetMap.size === 0) {
                chrome.storage.local.set({ isRunning: false, phase: 'completed' });
                return;
            }

            let securedCount = 0; 
            let inputDone = false;
            const securedTargets = [];

            const rows = document.querySelectorAll('.common-table tr');
            if (!rows || rows.length === 0) return;

            const dataRows = Array.from(rows).filter(r => r.cells[0] && r.cells[0].innerText.match(/\d{4}\/\d{2}\/\d{2}/));
            const allFocusableInputs = Array.from(document.querySelectorAll('.common-table input[type="text"]'));
            let currentFocusIndex = -1;

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];

                for (let r = 1; r <= 4; r++) {
                    const key = `${i}_${r}`;
                    const targetNeed = targetMap.get(key) || 0;
                    if (targetNeed <= 0) continue;

                    const cell = row.cells[r];
                    if (!cell) continue;

                    const input = cell.querySelector('input[type="text"]');
                    if (input) {
                        let availableCount = 99;
                        const cellText = cell.innerText.replace(/[^0-9]/g, '');
                        if (cellText) availableCount = parseInt(cellText, 10);

                        // 🌟 修正：1セルあたり最大2台までに制限
                        const takeCount = Math.min(targetNeed, availableCount, 2);

                        if (takeCount > 0) {
                            const targetIndex = allFocusableInputs.indexOf(input);
                            const tabPresses = targetIndex - currentFocusIndex;
                            currentFocusIndex = targetIndex; 

                            console.log(`[KBエミュレーション] ⌨️ TABキーを ${tabPresses} 回打鍵 ⇨ ${i+1}行目の ${r}R にフォーカス`);
                            input.focus(); 
                            input.value = takeCount;
                            console.log(`[KBエミュレーション] ⌨️ 数字の [${takeCount}] を入力（${i + 1}行目 ${r}R の残り希望 ${targetNeed - takeCount} 台）`);
                            
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));

                            targetMap.set(key, targetNeed - takeCount);
                            securedCount += takeCount; 
                            securedTargets.push({ rowIndex: i, round: r, count: takeCount });
                            inputDone = true;
                        }
                    }
                }
            }

            if (inputDone) {
                console.log("予約実行へ移行します...");
                const submitBtn = document.querySelector('button[name="cmdsubmit"]');
                if (submitBtn) {
                    chrome.storage.local.set({ phase: 'confirm', securedCount: securedCount, pendingSecuredTargets: securedTargets }, () => {
                        const remainingTabs = (allFocusableInputs.length - 1 - currentFocusIndex) + 1;
                        
                        setTimeout(() => {
                            console.log(`[KBエミュレーション] ⌨️ TABキーを ${remainingTabs} 回打鍵 ⇨ [登録確認]ボタンにフォーカス`);
                            submitBtn.focus();
                            
                            console.log(`[KBエミュレーション] ⌨️ SPACEキーを打鍵してフォームを送信します`);
                            submitBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                            submitBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                            submitBtn.click();
                        }, 100); 
                    });
                }
            } 
            else {
                const waitTime = Math.floor(Math.random() * 700) + 1000;
                console.log(`${waitTime / 1000}秒後に表示更新します...`);
                
                setTimeout(() => {
                    const refreshBtn = document.querySelector('button[name="cmdselect"]');
                    if (refreshBtn) {
                        console.log(`[KBエミュレーション] ⌨️ TABキーを 3 回打鍵 ⇨ [表示更新]ボタンにフォーカス`);
                        refreshBtn.focus();
                        
                        console.log(`[KBエミュレーション] ⌨️ SPACEキーを打鍵して表示更新を実行します`);
                        refreshBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        refreshBtn.dispatchEvent(new KeyboardEvent('keyup',   { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
                        refreshBtn.click();
                    } else {
                        location.reload();
                    }
                }, waitTime);
            }
        }
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "start") {
        chrome.storage.local.set({ phase: 'idle', securedCount: 0, securedTotal: 0, pendingSecuredTargets: [] }, () => {
            checkAndRefresh();
        });
    }
});

if (document.readyState === 'complete') {
    checkAndRefresh();
} else {
    window.addEventListener('load', checkAndRefresh);
}