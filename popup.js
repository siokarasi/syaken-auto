document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('targetTableBody');

    // 🌟 ご提示の通り「4行分」のチェックボックスを作成
    for (let i = 0; i < 4; i++) {
        let tr = document.createElement('tr');
        let html = `<td>上から <b>${i + 1}</b> 行目</td>`;
        for (let r = 1; r <= 4; r++) {
            html += `<td><input type="checkbox" id="chk_${i}_${r}" class="chk"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }

    // 保存設定の復元
    chrome.storage.local.get(['isRunning', 'targets', 'totalCount'], (data) => {
        if (data.totalCount) document.getElementById('totalCount').value = data.totalCount;
        if (data.targets && Array.isArray(data.targets)) {
            data.targets.forEach(t => {
                const chk = document.getElementById(`chk_${t.rowIndex}_${t.round}`);
                if (chk) chk.checked = true;
            });
        }
        updateStatus(data.isRunning);
    });

    // スタートボタン：設定をロックして現在のタブに送信
    document.getElementById('startBtn').addEventListener('click', () => {
        const targets = [];
        const totalCount = parseInt(document.getElementById('totalCount').value, 10);
        for (let i = 0; i < 4; i++) {
            for (let r = 1; r <= 4; r++) {
                if (document.getElementById(`chk_${i}_${r}`).checked) {
                    targets.push({ rowIndex: i, round: r });
                }
            }
        }
        chrome.storage.local.set({ isRunning: true, targets: targets, totalCount: totalCount }, () => {
            updateStatus(true);
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "start" });
            });
        });
    });

    // 個別停止ボタン
    document.getElementById('stopTabBtn').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "stop_tab" });
        });
    });

    // 一斉停止ボタン
    document.getElementById('stopAllBtn').addEventListener('click', () => {
        chrome.storage.local.set({ isRunning: false }, () => {
            updateStatus(false);
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "stop_all" });
            });
        });
    });
});

function updateStatus(isRunning) {
    const s = document.getElementById('status');
    if (s) {
        s.textContent = isRunning ? "🟢 監視中" : "🔴 停止中";
        s.className = `status ${isRunning ? 'running' : 'stopped'}`;
    }
}