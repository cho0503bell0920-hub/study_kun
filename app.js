// --- 状態管理・DOM要素などはそのまま ---
let currentSubject = null;
let startTime = null;
let timerInterval = null;

const subjectBtns = document.querySelectorAll('.subject-btn');
const activeTimer = document.getElementById('active-timer');
const currentSubjectEl = document.getElementById('current-subject');
const elapsedTimeEl = document.getElementById('elapsed-time');
const tabBtns = document.querySelectorAll('.tab-btn');
const totalTimeEl = document.getElementById('total-time');
const topSubjectEl = document.getElementById('top-subject');

let barChart = null;
let pieChart = null;

const subjects = ['数学', '英語', '理科', '国語', '社会'];
const subjectColors = {
    '数学': '#3182ce', '英語': '#dd6b20', '理科': '#38a169', '国語': '#d53f8c', '社会': '#805ad5'
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

// --- 【追加機能】データ消去ロジック ---
const clearBtn = document.getElementById('clear-data-btn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        const firstConfirm = confirm("今までの勉強記録をすべて消去します。よろしいですか？");
        if (firstConfirm) {
            const secondConfirm = confirm("本当に、本当によろしいですか？（元には戻せません）");
            if (secondConfirm) {
                localStorage.removeItem('studyRecords');
                alert("記録をリセットしました。新しい気持ちで頑張りましょう！");
                updateStats('day'); // 表示を更新
            }
        }
    });
}

// --- タイマー・計測ロジック (既存と同じ) ---
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
    clearInterval(timerInterval);
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    if (duration > 0) {
        saveRecord({
            subject: currentSubject,
            startTime: startTime,
            duration: duration
        });
    }
    subjectBtns.forEach(btn => btn.classList.remove('active'));
    activeTimer.classList.add('hidden');
    currentSubject = null;
    startTime = null;
    updateStats(document.querySelector('.tab-btn.active').dataset.range);
}

function startSubject(subject, btn) {
    if (currentSubject) stopCurrentSubject();
    currentSubject = subject;
    startTime = Date.now();
    btn.classList.add('active');
    currentSubjectEl.textContent = subject;
    activeTimer.classList.remove('hidden');
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

subjectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const subject = btn.dataset.subject;
        if (currentSubject === subject) {
            stopCurrentSubject();
        } else {
            startSubject(subject, btn);
        }
    });
});

// --- 【改良版】集計・グラフ ロジック ---
function getFilteredRecords(range) {
    const records = getRecords();
    const now = new Date();

    return records.filter(record => {
        const recordDate = new Date(record.startTime);

        if (range === 'day') {
            // 今日1日のデータ
            return recordDate.toDateString() === now.toDateString();
        } else if (range === 'week') {
            // 直近7日間のデータ
            const diffDays = (now - recordDate) / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        } else if (range === 'month') {
            // 【改良】今月1日から今日までのデータ
            return recordDate.getMonth() === now.getMonth() &&
                recordDate.getFullYear() === now.getFullYear();
        }
        return true; // 'all' の場合
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

    const totalHours = Math.floor(stats.totalDuration / 3600);
    const totalMinutes = Math.floor((stats.totalDuration % 3600) / 60);
    totalTimeEl.textContent = `${totalHours}時間 ${totalMinutes}分`;
    topSubjectEl.textContent = stats.topSubject;

    const labels = subjects;
    // 小数点第1位までに修正（見やすさ重視）
    const data = labels.map(sub => (stats.subjectTotals[sub] / 3600).toFixed(1));
    const bgColors = labels.map(sub => subjectColors[sub]);

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
            scales: { y: { beginAtZero: true, title: { display: true, text: '時間' } } }
        }
    });

    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: bgColors }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateStats(btn.dataset.range);
    });
});

updateStats('day');