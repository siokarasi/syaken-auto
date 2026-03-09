document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('targetTableBody');

    // 4行分の入力フォームを生成
    for (let i = 0; i < 4; i++) {
        let tr = document.createElement('tr');
        let html = `<td><input type="text" id="date_${i}" class="date-input" placeholder="日付を入力"></td>`;
        for (let r = 1; r <= 4; r++) {
            html += `
                <td>
                  <div class="cell-wrap">
                    <input type="checkbox" id="chk_${i}_${r}">
                    <input type="number" id="cnt_${i}_${r}" class="cnt-input" value="1" min="1">
                  </div>
                </td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }

    // 保存されている設定を読み込んで画面に復元
    chrome.storage.local.get(['isRunning', 'targets'], (data) => {
        if (data.targets && Array.isArray(data.targets)) {
            // 保存された設定をもとにチェックを入れる
            data.targets.forEach(t => {
                document.getElementById(`date_${t.rowIndex}`).value = t.date;
                document.getElementById(`chk_${t.rowIndex}_${t.round}`).checked = true;
                document.getElementById(`cnt_${t.rowIndex}_${t.round}`).value = t.count;
            });
        }
        updateStatus(data.isRunning);
    });

    // スタートボタンの処理
    document.getElementById('startBtn').addEventListener('click', () => {
        const targets = [];
        
        // 画面の入力内容を読み取って配列にまとめる
        for (let i = 0; i < 4; i++) {
            const dateVal = document.getElementById(`date_${i}`).value.trim();
            if (!dateVal) continue; // 日付が空欄の行は無視

            for (let r = 1; r <= 4; r++) {
                if (document.getElementById(`chk_${i}_${r}`).checked) {
                    targets.push({
                        rowIndex: i,        // 復元用
                        date: dateVal,      // 検索する日付文字列
                        round: r,           // 1〜4ラウンド
                        count: document.getElementById(`cnt_${i}_${r}`).value // 希望台数
                    });
                }
            }
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