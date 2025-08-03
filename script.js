document.addEventListener('DOMContentLoaded', () => {
    const DOM = { nodes: {} };
    let chart;

    function updateCalculations() {
        const mode = DOM.nodes['mode-operatives'].checked ? 'operatives' : 'time';
        const totals = { pickable: 0, nonPickable: 0, cost: 0, pickers: 0, palletizers: 0, totalPickers: 0, totalPalletizers: 0, activeManifolds: 0 };

        ['p1', 'p2', 'p3'].forEach(prefix => {
            const values = getValues(prefix);
            const isValid = values['total-units'] > 0 && values['picker-rate'] > 0 && values['palletizer-rate'] > 0 && (mode === 'operatives' ? values['time-frame'] > 0 : values['picker-cost'] > 0 && values['palletizer-cost'] > 0);

            if (!isValid) {
                DOM.nodes[`${prefix}-output-log`].innerHTML = `<p style="color: #ff4d4d;">Awaiting valid parameters...</p>`;
            } else {
                const results = (mode === 'operatives') ? calculateOperatives(values) : estimateTime(values);
                DOM.nodes[`${prefix}-output-log`].innerHTML = results.html;
                totals.activeManifolds++;
                totals.pickers += results.pickers || 0;
                totals.palletizers += results.palletizers || 0;
                totals.totalPickers += results.totalPickers || 0;
                totals.totalPalletizers += results.totalPalletizers || 0;
                totals.cost += results.totalCost;
            }
            totals.pickable += values['total-units'];
            totals.nonPickable += values['non-pickable'];
        });

        const div = totals.activeManifolds || 1;
        DOM.nodes['p4-total-pickable'].textContent = totals.pickable.toLocaleString();
        DOM.nodes['p4-total-non-pickable'].textContent = totals.nonPickable.toLocaleString();
        DOM.nodes['p4-total-cost'].textContent = `$${totals.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        updateChart([totals.pickers/div, totals.palletizers/div, totals.totalPickers/div, totals.totalPalletizers/div]);
    }

    function getValues(prefix) {
        const values = {};
        const fields = ['total-units', 'non-pickable', 'time-frame', 'picker-rate', 'palletizer-rate', 'picker-cost', 'palletizer-cost'];
        fields.forEach(f => values[f] = parseFloat(DOM.nodes[`${prefix}-${f}`]?.value) || 0);
        return values;
    }

    function calculateOperatives(v) {
        const pickableUnits = v['total-units'], totalWorkloadUnits = pickableUnits + v['non-pickable'];
        const p = Math.ceil((pickableUnits / v['picker-rate']) / v['time-frame']);
        const pl = Math.ceil((pickableUnits / v['palletizer-rate']) / v['time-frame']);
        const tp = Math.ceil((totalWorkloadUnits / v['picker-rate']) / v['time-frame']);
        const tpl = Math.ceil((totalWorkloadUnits / v['palletizer-rate']) / v['time-frame']);
        const pickableCost = (p * v['picker-cost'] + pl * v['palletizer-cost']) * v['time-frame'];
        const totalCost = (tp * v['picker-cost'] + tpl * v['palletizer-cost']) * v['time-frame'];
        return {
            pickers: p, palletizers: pl, totalPickers: tp, totalPalletizers: tpl, totalCost,
            html: `<h3>Calculus Complete:</h3><ul>
                <li>Pickers (Pickable): <strong>${p}</strong></li><li>Palletizers (Pickable): <strong>${pl}</strong></li>
                <li>Pickable Cost: <strong>$${pickableCost.toLocaleString()}</strong></li><hr>
                <li>Pickers (Total): <strong>${tp}</strong></li><li>Palletizers (Total): <strong>${tpl}</strong></li>
                <li>Total Workload Cost: <strong>$${totalCost.toLocaleString()}</strong></li></ul>`
        };
    }
    
    function estimateTime(v) {
        const { 'total-units': pickableUnits, 'non-pickable': nonPickable, 'picker-rate': pickerRate, 'palletizer-rate': palletizerRate, 'picker-cost': availablePickers, 'palletizer-cost': availablePalletizers } = v;
        const totalWorkloadUnits = pickableUnits + nonPickable;
        const pickableTime = Math.max(pickableUnits / (availablePickers * pickerRate), pickableUnits / (availablePalletizers * palletizerRate));
        const totalTime = Math.max(totalWorkloadUnits / (availablePickers * pickerRate), totalWorkloadUnits / (availablePalletizers * palletizerRate));
        const totalCost = (availablePickers * v['picker-cost'] + availablePalletizers * v['palletizer-cost']) * totalTime;
        return {
            totalCost,
            html: `<h3>Calculus Complete:</h3><ul>
                <li>Time (Pickable): <strong>${pickableTime.toFixed(2)} Hrs</strong></li><hr>
                <li>Time (Total Workload): <strong>${totalTime.toFixed(2)} Hrs</strong></li>
                <li>Total Workload Cost: <strong>$${totalCost.toLocaleString()}</strong></li></ul>`
        };
    }

    function syncRates() {
        const isSynced = DOM.nodes['sync-rates-checkbox'].checked;
        const rates = { 'picker-rate': DOM.nodes['p1-picker-rate'].value, 'palletizer-rate': DOM.nodes['p1-palletizer-rate'].value, 'picker-cost': DOM.nodes['p1-picker-cost'].value, 'palletizer-cost': DOM.nodes['p1-palletizer-cost'].value };
        ['p2', 'p3'].forEach(p => {
            Object.keys(rates).forEach(rate => {
                DOM.nodes[`${p}-${rate}`].disabled = isSynced;
                if(isSynced) DOM.nodes[`${p}-${rate}`].value = rates[rate];
            });
        });
    }
    
    function toggleMode() {
        const isOpMode = DOM.nodes['mode-operatives'].checked;
        ['p1', 'p2', 'p3'].forEach(p => {
            DOM.nodes[`${p}-time-frame`].disabled = !isOpMode;
            DOM.nodes[`${p}-picker-cost-label`].textContent = isOpMode ? "Picker Cost/Hour:" : "Available Pickers:";
            DOM.nodes[`${p}-palletizer-cost-label`].textContent = isOpMode ? "Palletizer Cost/Hour:" : "Available Palletizers:";
        });
        updateCalculations();
    }

    function initializeChart() {
        const ctx = DOM.nodes['p4-chart'].getContext('2d');
        Chart.defaults.color = '#d1d1d1';
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pickers (Pickable)', 'Palletizers (Pickable)', 'Pickers (Total)', 'Palletizers (Total)'],
                datasets: [{
                    label: 'Average Operatives Required',
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#c3a4f0', '#a178d1', '#F4A261', '#D94f30'],
                    borderColor: '#1a1a1a',
                    borderWidth: 2
                }]
            },
            options: { scales: { y: { beginAtZero: true, grid: { color: '#444' } }, x: { grid: { color: '#444' } } }, plugins: { legend: { display: false } } }
        });
    }

    function updateChart(data) {
        chart.data.datasets[0].data = data;
        chart.update();
    }
    
    // --- INITIALIZATION RITE ---
    document.querySelectorAll('[id]').forEach(el => DOM.nodes[el.id] = el);
    initializeChart();
    
    try {
        Object.keys(DOM.nodes).forEach(id => {
            const savedValue = localStorage.getItem(id);
            if (savedValue !== null) {
                if (DOM.nodes[id].type === 'checkbox' || DOM.nodes[id].type === 'radio') DOM.nodes[id].checked = (savedValue === 'true');
                else DOM.nodes[id].value = savedValue;
            }
        });
        const savedTheme = localStorage.getItem('theme-selector');
        if (savedTheme) {
            document.body.className = savedTheme;
            DOM.nodes['theme-selector'].value = savedTheme;
        }
    } catch (e) { console.warn("Could not read from memory engrams."); }
    
    DOM.nodes['main-chassis'].addEventListener('input', event => {
        const target = event.target;
        if(target.classList.contains('auto-calc-input')) {
            target.classList.toggle('invalid-input', parseFloat(target.value) <= 0);
            if (target.dataset.prefix === 'p1' && (target.id.includes('rate') || target.id.includes('cost'))) {
                syncRates();
            }
            updateCalculations();
            try { localStorage.setItem(target.id, target.value); } catch(e) {}
        }
    });

    DOM.nodes['theme-selector'].addEventListener('change', event => {
        document.body.className = event.target.value;
        try { localStorage.setItem('theme-selector', event.target.value); } catch(e) {}
    });

    DOM.nodes['mode-selector'].addEventListener('change', e => {
        toggleMode();
        try { localStorage.setItem(e.target.id, e.target.checked); } catch(e) {}
    });

    DOM.nodes['sync-rates-checkbox'].addEventListener('change', event => {
        syncRates();
        updateCalculations();
        try { localStorage.setItem(event.target.id, event.target.checked); } catch(e) {}
    });

    syncRates();
    toggleMode();
});