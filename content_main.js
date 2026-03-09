// ISOLATED側からの「表示更新せよ」という合図を待機
window.addEventListener('TRIGGER_SUBMIT_FORM', () => {
    console.log("MAIN WORLD: 表示更新リクエストを受信しました。");

    // ページ側の関数を直接叩く
    if (typeof submitform === 'function') {
        console.log("submitform() を実行します。");
        submitform(); 
    } else if (document.form1) {
        console.log("submitformが見つからないため、form1を直接送信します。");
        document.form1.submit();
    }
});