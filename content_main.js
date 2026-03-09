// ISOLATED側からの合図を待機
window.addEventListener('DO_DISPLAY_UPDATE', () => {
    console.log("Main World: 表示更新の実行命令を受信しました。");

    // ページで定義されている関数を直接実行
    if (typeof submitform === 'function') {
        console.log("submitform() を呼び出します。");
        submitform(); 
    } else if (document.form1) {
        console.log("関数が見つからないため、form1を直接送信します。");
        document.form1.submit();
    }
});