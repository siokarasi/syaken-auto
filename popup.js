document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('targetTableBody');

    // 画面を開いた瞬間に、現在のタブ（予約画面）に「日付リストをちょうだい」と要求する
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action: "getDates" }, (response) => {
            let dates = [];
            // 正常に日付が取得できた場合
            if (response && response.dates && response.dates.length > 0) {
                dates = response.dates;
            } else {
                // 取得できなかった場合（関係ないページを開いている時など）は空枠を5つ作る
                dates = ["", "", "", "", ""];
            }
            
            buildTable(dates);
            loadSettings(); // テーブル生成後に、保存されていたチェック状態を復元
        });
    });

    // 取得した日付をもとに表を組み立てる関数
    function buildTable(dates) {
        tbody.innerHTML = '';
        dates.forEach((date, i) => {
            let tr = document.createElement('tr');
            // 日付が取得できている場合は編集不可（readonly）にして背景色をグレーにする
            const readonly = date ? 'readonly style="background-color: #eee; color: #333;"' : '';
            let html = `<td><input type="text" id="date_${i}" class="date-input" value="${date}" placeholder="yyyy/mm/dd" ${readonly}></td>`;
            for (let r = 1; r <= 4; r++) {
                html += `<td><input type="checkbox" id="chk_${i}_${r}" class="chk"></td>`;
            }
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
    }

    // 保存されている設定を読み込んでチェックボックスに反映させる関数
    function loadSettings() {
        chrome.storage.local.get(['isRunning', 'targets', 'totalCount'], (data) => {
            if (data.totalCount) document.getElementById('totalCount').value = data.totalCount;
            
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(t => {
                    // 保存されている日付と一致する行を探してチェックを入れる
                    const dateInputs = Array.from(document.querySelectorAll('.date-input'));
                    const targetInput = dateInputs.find(input => input.value === t.date);
                    
                    if (targetInput) {
                        const rowIdx = targetInput.id.split('_')[1];
                        const chk = document.getElementById(`chk_${rowIdx}_${t.round}`);
                        if (chk) chk.checked = true;
                    }
                });
            }
            updateStatus(data.isRunning);
        });
    }

    // スタートボタンの処理
    document.getElementById('startBtn').addEventListener('click', () => {
        const targets = [];
        const totalCount = parseInt(document.getElementById('totalCount').value, 10);
        
        const dateInputs = document.querySelectorAll('.date-input');
        dateInputs.forEach((input, i) => {
            const dateVal = input.value.trim();
            if (!dateVal) return;

            for (let r = 1; r <= 4; r++) {
                const chk = document.getElementById(`chk_${i}_${r}`);
                if (chk && chk.checked) {
                    targets.push({ date: dateVal, round: r }); // rowIndexの保存をやめ、日付そのもので管理
                }
            }
        });

        chrome.storage.local.set({ isRunning: true, targets: targets, totalCount: totalCount }, () => {
            updateStatus(true);
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "start" });
            });
        });
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
        chrome.storage.local.set({ isRunning: false }, () => updateStatus(false));
    });
});

function updateStatus(isRunning) {
    const s = document.getElementById('status');
    s.textContent = isRunning ? "🟢 監視中" : "🔴 停止中";
    s.className = `status ${isRunning ? 'running' : 'stopped'}`;
}