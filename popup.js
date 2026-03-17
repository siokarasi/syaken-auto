document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('targetTableBody');

    // 予約表に合わせて「4行分」の台数入力欄を作成
    for (let i = 0; i < 4; i++) {
        let tr = document.createElement('tr');
        let html = `<td>上から <b>${i + 1}</b> 行目</td>`;
        for (let r = 1; r <= 4; r++) {
            html += `<td><input type="number" id="qty_${i}_${r}" class="qty" min="0" value="0"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }

    // 保存されている設定を復元
    chrome.storage.local.get(['isRunning', 'targets'], (data) => {
        if (data.targets && Array.isArray(data.targets)) {
            data.targets.forEach(t => {
                const qty = document.getElementById(`qty_${t.rowIndex}_${t.round}`);
                if (qty) qty.value = Math.max(0, parseInt(t.count || 0, 10));
            });
        }
        updateStatus(data.isRunning);
    });

    // スタートボタン
    document.getElementById('startBtn').addEventListener('click', () => {
        const targets = [];

        for (let i = 0; i < 4; i++) {
            for (let r = 1; r <= 4; r++) {
                const qty = parseInt(document.getElementById(`qty_${i}_${r}`).value || '0', 10);
                if (qty > 0) {
                    targets.push({ rowIndex: i, round: r, count: qty });
                }
            }
        }

        if (targets.length === 0) {
            alert('希望台数を1つ以上入力してください。');
            return;
        }

        chrome.storage.local.set({ isRunning: true, targets: targets }, () => {
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