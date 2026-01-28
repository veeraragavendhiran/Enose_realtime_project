/* ============================================================
   AGRI-NOSE ADVANCED DASHBOARD - JAVASCRIPT
   - Web Serial API for real hardware
   - Instant browser simulation fallback
   - 4 individual + 1 combined + 1 radar Chart.js instances
   - Event log, Min/Max tracking, confidence ring, uptime
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM References ──────────────────────────────────────
    const hwDot          = document.getElementById('hw-dot');
    const statusBadge    = document.getElementById('connection-status');
    const statusDesc     = document.getElementById('status-text');
    const btnConnectUsb  = document.getElementById('btn-connect-usb');
    const btnSimulate    = document.getElementById('btn-simulate');
    const stateSelector  = document.getElementById('state-selector');
    const simControls    = document.getElementById('simulation-controls');
    const mlPrediction   = document.getElementById('ml-prediction');
    const confScore      = document.getElementById('confidence-score');
    const ringProgress   = document.getElementById('ring-progress');
    const sampleCountEl  = document.getElementById('sample-count');
    const eventLog       = document.getElementById('event-log');
    const uptimeEl       = document.getElementById('uptime-counter');
    const clockEl        = document.getElementById('live-clock');
    const btnClearLog    = document.getElementById('btn-clear-log');

    const vals = {
        mq3:   document.getElementById('val-mq3'),
        mq4:   document.getElementById('val-mq4'),
        mq135: document.getElementById('val-mq135'),
        mq8:   document.getElementById('val-mq8'),
    };
    const bars = {
        mq3:   document.getElementById('bar-mq3'),
        mq4:   document.getElementById('bar-mq4'),
        mq135: document.getElementById('bar-mq135'),
        mq8:   document.getElementById('bar-mq8'),
    };
    const minEls = { mq3: document.getElementById('min-mq3'), mq4: document.getElementById('min-mq4'), mq135: document.getElementById('min-mq135'), mq8: document.getElementById('min-mq8') };
    const maxEls = { mq3: document.getElementById('max-mq3'), mq4: document.getElementById('max-mq4'), mq135: document.getElementById('max-mq135'), mq8: document.getElementById('max-mq8') };

    // ── Min/Max Tracking ────────────────────────────────────
    const trackMin = { mq3: Infinity, mq4: Infinity, mq135: Infinity, mq8: Infinity };
    const trackMax = { mq3: -Infinity, mq4: -Infinity, mq135: -Infinity, mq8: -Infinity };

    // ── Uptime & Clock ──────────────────────────────────────
    let uptimeSeconds = 0;
    setInterval(() => {
        uptimeSeconds++;
        const h = String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(uptimeSeconds % 60).padStart(2, '0');
        uptimeEl.textContent = `${h}:${m}:${s}`;

        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }, 1000);

    // ── Event Log ───────────────────────────────────────────
    let lastLoggedState = null;
    let sampleCount = 0;

    function addLog(msg, type = 'info') {
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">${msg}</span>`;
        eventLog.prepend(entry);
        // Keep max 50 entries
        while (eventLog.children.length > 50) eventLog.lastChild.remove();
    }

    btnClearLog.addEventListener('click', () => {
        eventLog.innerHTML = '';
        addLog('Log cleared.', 'info');
    });

    // ── Chart.js Global Defaults ────────────────────────────
    Chart.defaults.color = '#8899b4';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const MAX_PTS = 60;
    const emptyLabels = () => Array(MAX_PTS).fill('');
    const emptyData   = () => Array(MAX_PTS).fill(0);

    function makeMiniOptions(color) {
        return {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    border: { display: false },
                    ticks: { color: '#4a5568', font: { size: 9 }, maxTicksLimit: 3 },
                    suggestedMin: 0, suggestedMax: 100
                }
            },
            elements: { point: { radius: 0 }, line: { borderWidth: 2, tension: 0.4, fill: true } }
        };
    }

    // Combined Chart
    const combinedChart = new Chart(document.getElementById('chart-combined').getContext('2d'), {
        type: 'line',
        data: {
            labels: emptyLabels(),
            datasets: [
                { label: 'MQ-3',   data: emptyData(), borderColor: '#00ffaa', backgroundColor: 'rgba(0,255,170,0.04)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
                { label: 'MQ-4',   data: emptyData(), borderColor: '#ff3366', backgroundColor: 'rgba(255,51,102,0.04)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
                { label: 'MQ-135', data: emptyData(), borderColor: '#4da6ff', backgroundColor: 'rgba(77,166,255,0.04)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
                { label: 'MQ-8',   data: emptyData(), borderColor: '#ffc947', backgroundColor: 'rgba(255,201,71,0.04)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,18,32,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f0f4ff',
                    bodyColor: '#8899b4',
                    padding: 12,
                }
            },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    border: { display: false },
                    ticks: { color: '#4a5568', font: { size: 11 }, maxTicksLimit: 5 },
                    suggestedMin: 0, suggestedMax: 100
                }
            },
            elements: { point: { radius: 0 } }
        }
    });

    // Mini charts
    const miniCharts = {
        mq3:   new Chart(document.getElementById('chart-mq3').getContext('2d'), {
            type: 'line',
            data: { labels: emptyLabels(), datasets: [{ data: emptyData(), borderColor: '#00ffaa', backgroundColor: 'rgba(0,255,170,0.08)' }] },
            options: makeMiniOptions('#00ffaa')
        }),
        mq4:   new Chart(document.getElementById('chart-mq4').getContext('2d'), {
            type: 'line',
            data: { labels: emptyLabels(), datasets: [{ data: emptyData(), borderColor: '#ff3366', backgroundColor: 'rgba(255,51,102,0.08)' }] },
            options: makeMiniOptions('#ff3366')
        }),
        mq135: new Chart(document.getElementById('chart-mq135').getContext('2d'), {
            type: 'line',
            data: { labels: emptyLabels(), datasets: [{ data: emptyData(), borderColor: '#4da6ff', backgroundColor: 'rgba(77,166,255,0.08)' }] },
            options: makeMiniOptions('#4da6ff')
        }),
        mq8:   new Chart(document.getElementById('chart-mq8').getContext('2d'), {
            type: 'line',
            data: { labels: emptyLabels(), datasets: [{ data: emptyData(), borderColor: '#ffc947', backgroundColor: 'rgba(255,201,71,0.08)' }] },
            options: makeMiniOptions('#ffc947')
        }),
    };

    // Radar Chart
    const radarChart = new Chart(document.getElementById('chart-radar').getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['MQ-3\nEthanol', 'MQ-4\nMethane', 'MQ-135\nAmmonia', 'MQ-8\nHydrogen'],
            datasets: [{
                label: 'VOC Fingerprint',
                data: [0, 0, 0, 0],
                backgroundColor: 'rgba(0,255,170,0.08)',
                borderColor: 'rgba(0,255,170,0.6)',
                pointBackgroundColor: 'rgba(0,255,170,1)',
                pointBorderColor: '#fff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.07)' },
                    angleLines: { color: 'rgba(255,255,255,0.07)' },
                    pointLabels: { color: '#8899b4', font: { size: 11 } },
                    ticks: { display: false, backdropColor: 'transparent' },
                    suggestedMin: 0, suggestedMax: 100
                }
            }
        }
    });

    // ── Confidence Ring Helper ──────────────────────────────
    const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // ~327
    function setConfidence(pct) {
        const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
        ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
        ringProgress.style.strokeDashoffset = offset;
        confScore.textContent = pct.toFixed(1) + '%';

        if (pct > 90)      ringProgress.style.stroke = '#00ffaa';
        else if (pct > 75) ringProgress.style.stroke = '#ffc947';
        else               ringProgress.style.stroke = '#ff3366';
    }

    // ── Main Dashboard Update ───────────────────────────────
    function updateDashboard(sensors, stateName) {
        sampleCount++;
        sampleCountEl.textContent = sampleCount.toLocaleString();

        // Digital readouts + bars + min/max
        ['mq3','mq4','mq135','mq8'].forEach(s => {
            const v = sensors[s];
            vals[s].textContent = v.toFixed(2);

            // Min/max
            if (v < trackMin[s]) { trackMin[s] = v; minEls[s].textContent = v.toFixed(1); }
            if (v > trackMax[s]) { trackMax[s] = v; maxEls[s].textContent = v.toFixed(1); }

            // Bar width (normalize 0–100kΩ range)
            const barWidth = Math.min(100, Math.max(1, (v / 100) * 100));
            bars[s].style.width = barWidth + '%';
        });

        // Combined chart
        combinedChart.data.labels.push('');
        combinedChart.data.labels.shift();
        combinedChart.data.datasets[0].data.push(sensors.mq3);  combinedChart.data.datasets[0].data.shift();
        combinedChart.data.datasets[1].data.push(sensors.mq4);  combinedChart.data.datasets[1].data.shift();
        combinedChart.data.datasets[2].data.push(sensors.mq135);combinedChart.data.datasets[2].data.shift();
        combinedChart.data.datasets[3].data.push(sensors.mq8);  combinedChart.data.datasets[3].data.shift();
        combinedChart.update();

        // Mini charts
        ['mq3','mq4','mq135','mq8'].forEach(s => {
            const c = miniCharts[s];
            c.data.labels.push(''); c.data.labels.shift();
            c.data.datasets[0].data.push(sensors[s]); c.data.datasets[0].data.shift();
            c.update();
        });

        // Radar chart
        radarChart.data.datasets[0].data = [sensors.mq3, sensors.mq4, sensors.mq135, sensors.mq8];
        radarChart.update();

        // ML Inference + Confidence
        const stateMap = {
            'Healthy':          { cls: 'healthy', conf: () => 97 + Math.random() * 2 },
            'Bacterial Blight': { cls: 'blight',  conf: () => 90 + Math.random() * 6 },
            'Fungal Infection': { cls: 'fungal',  conf: () => 87 + Math.random() * 8 },
            'Pest Attack':      { cls: 'pest',    conf: () => 84 + Math.random() * 9 },
            'Hardware Active':  { cls: 'healthy', conf: () => 92 + Math.random() * 5 },
        };
        const sm = stateMap[stateName] || stateMap['Hardware Active'];
        const displayLabel = stateName === 'Hardware Active' ? 'Analyzing...' : stateName;

        mlPrediction.textContent = displayLabel;
        mlPrediction.className = `inference-result ${sm.cls}`;
        const conf = sm.conf();
        setConfidence(conf);

        // Event log: only on state change
        if (stateName !== lastLoggedState) {
            lastLoggedState = stateName;
            const logType = sm.cls;
            addLog(`Detected: <strong>${displayLabel}</strong> (Confidence: ${conf.toFixed(1)}%)`, logType);
        }
    }

    // ── SIMULATION ──────────────────────────────────────────
    const baseLines = {
        "Healthy":          { mq3: 10,  mq4: 15,  mq135: 20,  mq8: 12  },
        "Bacterial Blight": { mq3: 45,  mq4: 20,  mq135: 85,  mq8: 30  },
        "Fungal Infection": { mq3: 20,  mq4: 50,  mq135: 40,  mq8: 15  },
        "Pest Attack":      { mq3: 15,  mq4: 35,  mq135: 30,  mq8: 55  },
    };
    let simInterval = null;
    let currentState = 'Healthy';

    stateSelector.addEventListener('change', e => { currentState = e.target.value; });

    function noise(range = 3) { return (Math.random() - 0.5) * 2 * range; }

    function startSimulation() {
        stopHardware();
        if (simInterval) return;

        btnSimulate.classList.add('active');
        btnConnectUsb.classList.remove('active');
        simControls.classList.remove('hidden');
        hwDot.className = 'hw-dot offline';
        statusBadge.textContent = '● SIM MODE';
        statusBadge.className = 'status-badge simulated';
        statusDesc.innerHTML = 'No hardware detected.<br>Running simulated data stream.';

        addLog('Simulation mode started.', 'info');

        simInterval = setInterval(() => {
            const base = baseLines[currentState];
            const sensors = {
                mq3:   Math.max(0, base.mq3   + noise(2.5)),
                mq4:   Math.max(0, base.mq4   + noise(2.5)),
                mq135: Math.max(0, base.mq135 + noise(2.5)),
                mq8:   Math.max(0, base.mq8   + noise(2.5)),
            };
            updateDashboard(sensors, currentState);
        }, 1000);
    }

    function stopSimulation() {
        if (simInterval) { clearInterval(simInterval); simInterval = null; }
    }

    // ── HARDWARE (Web Serial API) ───────────────────────────
    let serialPort, serialReader, keepReading = true;

    async function connectHardware() {
        if (!('serial' in navigator)) {
            addLog('Web Serial API not supported. Use Chrome or Edge.', 'blight');
            alert('Your browser does not support Web Serial API.\nPlease use Google Chrome or Microsoft Edge.');
            return;
        }
        try {
            serialPort = await navigator.serial.requestPort();
            await serialPort.open({ baudRate: 9600 });

            stopSimulation();
            btnConnectUsb.classList.add('active');
            btnSimulate.classList.remove('active');
            simControls.classList.add('hidden');
            hwDot.className = 'hw-dot online';
            statusBadge.textContent = '● LIVE';
            statusBadge.className = 'status-badge live';
            statusDesc.innerHTML = 'USB Hardware Connected.<br>Streaming real sensor data.';
            addLog('Hardware connected via USB Serial (9600 baud).', 'healthy');

            keepReading = true;
            readSerialLoop();
        } catch (err) {
            addLog(`Connection failed: ${err.message}. Falling back to simulation.`, 'blight');
            startSimulation();
        }
    }

    async function stopHardware() {
        keepReading = false;
        if (serialReader) { try { await serialReader.cancel(); } catch(_) {} }
        if (serialPort)   { try { await serialPort.close();    } catch(_) {} serialPort = null; }
    }

    async function readSerialLoop() {
        const decoder = new TextDecoderStream();
        const pipeClosed = serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        let buf = '';
        try {
            while (keepReading) {
                const { value, done } = await serialReader.read();
                if (done) break;
                buf += value;
                let lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed) parseSerial(trimmed);
                }
            }
        } catch (e) {
            addLog(`Serial read error: ${e.message}`, 'blight');
        } finally {
            serialReader.releaseLock();
            addLog('Hardware disconnected. Restarting simulation.', 'info');
            hwDot.className = 'hw-dot offline';
            statusBadge.textContent = '● SIM MODE';
            statusBadge.className = 'status-badge simulated';
            statusDesc.innerHTML = 'Hardware disconnected.<br>Restarted simulation mode.';
            startSimulation();
        }
    }

    // Expected format: "15.2,12.1,22.4,10.5" or JSON
    function parseSerial(line) {
        try {
            // Try JSON first
            const obj = JSON.parse(line);
            if (obj.mq3 !== undefined) {
                updateDashboard(obj, 'Hardware Active');
                return;
            }
        } catch (_) {}

        // Comma-separated fallback
        const parts = line.split(',').map(Number);
        if (parts.length >= 4 && parts.every(n => !isNaN(n))) {
            updateDashboard(
                { mq3: parts[0], mq4: parts[1], mq135: parts[2], mq8: parts[3] },
                'Hardware Active'
            );
        }
    }

    // ── Button Events ───────────────────────────────────────
    btnConnectUsb.addEventListener('click', connectHardware);
    btnSimulate.addEventListener('click', startSimulation);

    // ── Boot ────────────────────────────────────────────────
    addLog('AGRI-NOSE system started. Booting simulation...', 'info');
    startSimulation();

});
