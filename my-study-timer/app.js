// 状態管理
let currentSubject = null;
let startTime = null;
let timerInterval = null;

// DOM要素
const subjectBtns = document.querySelectorAll('.subject-btn');
const activeTimer = document.getElementById('active-timer');
const currentSubjectEl = document.getElementById('current-subject');
const elapsedTimeEl = document.getElementById('elapsed-time');
const tabBtns = document.querySelectorAll('.tab-btn');
const totalTimeEl = document.getElementById('total-time');
const topSubjectEl = document.getElementById('top-subject');

// グラフインスタンス
let barChart = null;
let pieChart = null;

// 教科定義
const subjects = ['数学', '英語', '理科', '国語', '社会'];
const subjectColors = {
    '数学': '#3182ce',
    '英語': '#dd6b20',
    '理科': '#38a169',
    '国語': '#d53f8c',
    '社会': '#805ad5'
};

// --- LocalStorage ロジック ---
function getRecords() {
    const data = localStorage.getItem('studyRecords');
    return data ? JSON.parse(data) : [];
}

function saveRecord(record) {
    const records = getRecords();
    records.push(record);
    localStorage.setItem('studyRecords', JSON.stringify(records));
}

// --- タイマー・計測ロジック ---
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
    if (!startTime) return;
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    elapsedTimeEl.textContent = formatTime(elapsedSeconds);
}

function stopCurrentSubject() {
    if (!currentSubject || !startTime) return;

    // 計測終了
    clearInterval(timerInterval);
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    // 10秒未満の誤クリックなどは記録しない（任意）
    if (duration > 0) {
        saveRecord({
            subject: currentSubject,
            startTime: startTime,
            duration: duration
        });
    }

    // UIリセット
    subjectBtns.forEach(btn => btn.classList.remove('active'));
    activeTimer.classList.add('hidden');

    currentSubject = null;
    startTime = null;

    // グラフ更新
    updateStats();
}

function startSubject(subject, btn) {
    // 別の教科を学習中なら先に停止
    if (currentSubject) {
        stopCurrentSubject();
    }

    currentSubject = subject;
    startTime = Date.now();

    btn.classList.add('active');
    currentSubjectEl.textContent = subject;
    activeTimer.classList.remove('hidden');

    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

// ボタンクリックイベント
subjectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const subject = btn.dataset.subject;
        if (currentSubject === subject) {
            // 同じボタンをクリックしたら終了
            stopCurrentSubject();
        } else {
            // 新しい教科を開始
            startSubject(subject, btn);
        }
    });
});

// --- 集計・グラフ ロジック ---
function getFilteredRecords(range) {
    const records = getRecords();
    const now = Date.now();

    return records.filter(record => {
        if (range === 'all') return true;

        const diffMs = now - record.startTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (range === 'day') return diffDays <= 1;
        if (range === 'week') return diffDays <= 7;
        if (range === 'month') return diffDays <= 30;
        return true;
    });
}

function calculateStats(records) {
    let totalDuration = 0;
    const subjectTotals = {};
    subjects.forEach(s => subjectTotals[s] = 0);

    records.forEach(r => {
        totalDuration += r.duration;
        if (subjectTotals[r.subject] !== undefined) {
            subjectTotals[r.subject] += r.duration;
        }
    });

    let topSubject = 'なし';
    let maxTime = 0;
    for (const [sub, time] of Object.entries(subjectTotals)) {
        if (time > maxTime) {
            maxTime = time;
            topSubject = sub;
        }
    }

    return { totalDuration, subjectTotals, topSubject };
}

function updateStats(range = 'day') {
    const records = getFilteredRecords(range);
    const stats = calculateStats(records);

    // テキスト更新
    const totalHours = Math.floor(stats.totalDuration / 3600);
    const totalMinutes = Math.floor((stats.totalDuration % 3600) / 60);
    totalTimeEl.textContent = `${totalHours}時間 ${totalMinutes}分`;
    topSubjectEl.textContent = stats.topSubject;

    // グラフ用データ準備
    const labels = subjects;
    const data = labels.map(sub => (stats.subjectTotals[sub] / 3600).toFixed(2)); // 時間単位で表示
    const bgColors = labels.map(sub => subjectColors[sub]);

    // 棒グラフ更新
    const barCtx = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '勉強時間 (時間)',
                data: data,
                backgroundColor: bgColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 円グラフ更新
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// タブクリックイベント
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateStats(btn.dataset.range);
    });
});

// 初期化表示
updateStats('day');
