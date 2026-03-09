// --- (上部の checkAndRefresh 関数のコードはそのままにしておいてください) ---

// メッセージを受け取る処理（アクションによって分岐）
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    // ① ポップアップからの「監視スタート」の合図
    if (msg.action === "start") {
        checkAndRefresh();
    }
    
    // ② ポップアップからの「画面上の日付リストを教えて」というリクエスト
    if (msg.action === "getDates") {
        const dates = [];
        // pca0200 が開かれているか確認
        if (location.href.includes('pca0200')) {
            const rows = document.querySelectorAll('.common-table tr');
            for (const row of rows) {
                const dateCell = row.cells[0];
                // <th>（見出し）ではなく <td>（データ）のセルから抽出
                if (dateCell && dateCell.tagName === 'TD') {
                    // "2026/03/10 火曜日（仏滅）" から正規表現で "2026/03/10" だけを抜き出す
                    const match = dateCell.innerText.match(/\d{4}\/\d{2}\/\d{2}/);
                    if (match) {
                        dates.push(match[0]);
                    }
                }
            }
        }
        // 抽出した日付の配列をポップアップに返す
        sendResponse({ dates: dates });
        return true; // 非同期でsendResponseを返すための決まり文句
    }
});

if (document.readyState === 'complete') checkAndRefresh(); else window.addEventListener('load', checkAndRefresh);