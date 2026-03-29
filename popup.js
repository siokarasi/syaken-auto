document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('targetTableBody');
    const securedTotalDisplay = document.getElementById('securedTotalDisplay');
    const lastSecuredDisplay = document.getElementById('lastSecuredDisplay');
    const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
    const inspectionTypeSelect = document.getElementById('inspectionTypeSelect');

    setDefaultSelectionOptions(vehicleTypeSelect, inspectionTypeSelect);

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
    chrome.storage.local.get([
        'isRunning',
        'targets',
        'securedTotal',
        'lastSecuredCount',
        'selectionOptions',
        'vehicleTypeValue',
        'inspectionTypeValue'
    ], (data) => {
        if (data.targets && Array.isArray(data.targets)) {
            data.targets.forEach(t => {
                const qty = document.getElementById(`qty_${t.rowIndex}_${t.round}`);
                if (qty) qty.value = Math.max(0, parseInt(t.count || 0, 10));
            });
        }

        if (data.selectionOptions && hasEffectiveOptions(data.selectionOptions)) {
            renderSelectOptions(vehicleTypeSelect, data.selectionOptions.vehicleOptions || [], data.vehicleTypeValue);
            renderSelectOptions(inspectionTypeSelect, data.selectionOptions.inspectionOptions || [], data.inspectionTypeValue);
        } else {
            vehicleTypeSelect.value = data.vehicleTypeValue || '';
            inspectionTypeSelect.value = data.inspectionTypeValue || '';
        }

        updateStats(data.securedTotal, data.lastSecuredCount, securedTotalDisplay, lastSecuredDisplay);
        updateStatus(data.isRunning);

        loadSelectionOptionsFromPage(vehicleTypeSelect, inspectionTypeSelect);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        const nextTotal = changes.securedTotal ? changes.securedTotal.newValue : undefined;
        const nextLast = changes.lastSecuredCount ? changes.lastSecuredCount.newValue : undefined;

        if (changes.securedTotal || changes.lastSecuredCount) {
            chrome.storage.local.get(['securedTotal', 'lastSecuredCount'], (data) => {
                updateStats(
                    nextTotal !== undefined ? nextTotal : data.securedTotal,
                    nextLast !== undefined ? nextLast : data.lastSecuredCount,
                    securedTotalDisplay,
                    lastSecuredDisplay
                );
            });
        }

        if (changes.selectionOptions) {
            const nextOptions = changes.selectionOptions.newValue || {};
            chrome.storage.local.get(['vehicleTypeValue', 'inspectionTypeValue'], (data) => {
                renderSelectOptions(vehicleTypeSelect, nextOptions.vehicleOptions || [], data.vehicleTypeValue);
                renderSelectOptions(inspectionTypeSelect, nextOptions.inspectionOptions || [], data.inspectionTypeValue);
            });
        }

        if (changes.isRunning) {
            updateStatus(changes.isRunning.newValue);
        }
    });

    // スタートボタン
    document.getElementById('startBtn').addEventListener('click', () => {
        const targets = [];
        const vehicleTypeValue = vehicleTypeSelect.value;
        const inspectionTypeValue = inspectionTypeSelect.value;

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

        chrome.storage.local.set({
            isRunning: true,
            targets: targets,
            securedTotal: 0,
            lastSecuredCount: 0,
            vehicleTypeValue: vehicleTypeValue,
            inspectionTypeValue: inspectionTypeValue
        }, () => {
            updateStatus(true);
            updateStats(0, 0, securedTotalDisplay, lastSecuredDisplay);
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

function updateStats(securedTotal, lastSecuredCount, totalNode, lastNode) {
    totalNode.textContent = parseInt(securedTotal || 0, 10);
    lastNode.textContent = parseInt(lastSecuredCount || 0, 10);
}

function setDefaultSelectionOptions(vehicleSelect, inspectionSelect) {
    const defaults = [{ value: '', label: '変更しない' }];
    renderSelectOptions(vehicleSelect, defaults, '');
    renderSelectOptions(inspectionSelect, defaults, '');
}

function renderSelectOptions(selectNode, options, selectedValue) {
    const normalized = Array.isArray(options) && options.length > 0 ? options : [{ value: '', label: '変更しない' }];

    selectNode.innerHTML = '';
    normalized.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = String(opt.value ?? '');
        optionEl.textContent = String(opt.label ?? opt.value ?? '');
        selectNode.appendChild(optionEl);
    });

    const hasSelected = normalized.some(opt => String(opt.value ?? '') === String(selectedValue ?? ''));
    selectNode.value = hasSelected ? String(selectedValue ?? '') : String(normalized[0].value ?? '');
}

function loadSelectionOptionsFromPage(vehicleSelect, inspectionSelect) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: 'requestSelectionCacheRefresh' }, () => {
            if (chrome.runtime.lastError) return;

            chrome.storage.local.get(['selectionOptions', 'vehicleTypeValue', 'inspectionTypeValue'], (data) => {
                const options = data.selectionOptions || {};
                renderSelectOptions(vehicleSelect, options.vehicleOptions || [], data.vehicleTypeValue);
                renderSelectOptions(inspectionSelect, options.inspectionOptions || [], data.inspectionTypeValue);

                chrome.storage.local.set({
                    vehicleTypeValue: vehicleSelect.value,
                    inspectionTypeValue: inspectionSelect.value
                });
            });
        });
    });
}

function hasEffectiveOptions(selectionOptions) {
    const vehicleLen = (selectionOptions.vehicleOptions || []).length;
    const inspectionLen = (selectionOptions.inspectionOptions || []).length;
    return vehicleLen > 1 && inspectionLen > 1;
}