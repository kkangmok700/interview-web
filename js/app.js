// ===== 앱 로직 =====
let currentUser = null;

// --- 로그인 ---
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('loginId').value.trim();
    const pw = document.getElementById('loginPw').value;
    const users = getUsers();
    const user = users.find(u => u.id === id && u.password === pw);
    if (user) {
        currentUser = user;
        sessionStorage.setItem('iv_currentUser', JSON.stringify(user));
        document.getElementById('loginError').classList.add('d-none');
        enterApp();
    } else {
        document.getElementById('loginError').classList.remove('d-none');
    }
});

function enterApp() {
    document.getElementById('loginPage').classList.add('d-none');
    document.getElementById('app').classList.remove('d-none');
    document.getElementById('currentUserName').textContent = currentUser.name;
    const badge = document.getElementById('currentUserBadge');
    if (currentUser.role === 'admin') {
        badge.textContent = '관리자';
        badge.className = 'badge bg-warning text-dark ms-1';
        document.getElementById('app').classList.remove('judge-mode');
    } else {
        badge.textContent = '심사위원';
        badge.className = 'badge bg-info ms-1';
        document.getElementById('app').classList.add('judge-mode');
    }
    showPage('dashboard');
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('iv_currentUser');
    document.getElementById('app').classList.add('d-none');
    document.getElementById('loginPage').classList.remove('d-none');
    document.getElementById('loginId').value = '';
    document.getElementById('loginPw').value = '';
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

// --- 페이지 전환 ---
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('d-none'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.remove('d-none');

    // 서브 네비 표시/숨김
    document.getElementById('subNav').style.display = name === 'dashboard' ? 'none' : '';

    // 페이지별 렌더링
    if (name === 'interviews') renderInterviews();
    if (name === 'create_interview') renderCreateInterview();
    if (name === 'evaluate_select') renderEvalSelect();
    if (name === 'users') renderUsers();
    if (name === 'results_dashboard') renderResultsDashboard();
    if (name === 'files') renderFiles();
    if (name === 'committee_select') renderCommitteeSelect();
    if (name === 'eval_sig_select') renderEvalSigSelect();
}

// --- 알림 ---
function showAlert(msg, type = 'success') {
    const box = document.getElementById('alertBox');
    box.className = `alert alert-${type} alert-dismissible fade show`;
    box.innerHTML = msg + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    setTimeout(() => box.className = 'd-none', 4000);
}

// --- 면접 관리 ---
function renderInterviews() {
    const interviews = getInterviews();
    const el = document.getElementById('interviewList');
    if (!interviews.length) {
        el.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox display-1"></i><p class="mt-3">등록된 면접이 없습니다.</p></div>';
        return;
    }
    el.innerHTML = '<div class="row">' + interviews.map(iv => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card shadow-sm h-100">
                <div class="card-header main-btn"><h5 class="mb-0 text-white">${iv.title}</h5></div>
                <div class="card-body">
                    <p><i class="bi bi-calendar3"></i> ${iv.date}</p>
                    <p><i class="bi bi-people"></i> 채용인원: ${iv.hireCount}명 | 지원자: ${iv.applicants.length}명</p>
                </div>
                <div class="card-footer bg-white d-flex flex-wrap gap-1">
                    <button class="btn btn-sm btn-outline-success" onclick="startEvaluate('${iv.id}')"><i class="bi bi-pencil-square"></i> 평가</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="openSignaturePage('${iv.id}')"><i class="bi bi-pen"></i> 서명</button>
                    <button class="btn btn-sm btn-outline-info" onclick="showResults('${iv.id}')"><i class="bi bi-bar-chart"></i> 결과</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="showMinutes('${iv.id}')"><i class="bi bi-file-text"></i> 회의록</button>
                    <button class="btn btn-sm btn-outline-dark" onclick="openCommitteePage('${iv.id}')"><i class="bi bi-journal-text"></i> 운영위</button>
                </div>
            </div>
        </div>
    `).join('') + '</div>';
}

// --- 면접 생성 ---
function renderCreateInterview() {
    const judges = getUsers().filter(u => u.role === 'judge');
    document.getElementById('judgeCheckboxes').innerHTML = judges.map(j => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${j.id}" id="jc_${j.id}" checked>
            <label class="form-check-label" for="jc_${j.id}">${j.name}</label>
        </div>
    `).join('');
}

function addApplicantRow() {
    const html = `<div class="row mb-2 applicant-row">
        <div class="col-4"><input type="text" class="form-control" placeholder="이름" name="appName"></div>
        <div class="col-4"><input type="text" class="form-control" placeholder="지원분야" name="appField"></div>
        <div class="col-3"><input type="number" class="form-control" placeholder="나이" name="appAge"></div>
        <div class="col-1"><button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('.applicant-row').remove()"><i class="bi bi-x"></i></button></div>
    </div>`;
    document.getElementById('applicantInputs').insertAdjacentHTML('beforeend', html);
}

document.getElementById('createInterviewForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('ivTitle').value.trim();
    const date = document.getElementById('ivDate').value;
    const hireCount = parseInt(document.getElementById('ivHireCount').value) || 1;
    const judges = [...document.querySelectorAll('#judgeCheckboxes input:checked')].map(cb => cb.value);

    const rows = document.querySelectorAll('.applicant-row');
    const applicants = [];
    rows.forEach((row, i) => {
        const name = row.querySelector('[name=appName]').value.trim();
        const field = row.querySelector('[name=appField]').value.trim();
        const age = row.querySelector('[name=appAge]').value;
        if (name && field) {
            applicants.push({ id: Date.now().toString() + '_' + i, name, field, age: age || '' });
        }
    });

    if (!title || !date || !judges.length) {
        showAlert('면접명, 날짜, 심사위원을 입력해주세요.', 'warning');
        return;
    }

    saveInterview({ title, date, hireCount, judges, applicants, status: 'ongoing' });
    showAlert('면접이 생성되었습니다!');
    showPage('interviews');
});

// --- 평가 선택 ---
function renderEvalSelect() {
    const interviews = getInterviews();
    const el = document.getElementById('evalInterviewList');
    const myInterviews = interviews.filter(iv =>
        isAdmin() || iv.judges.includes(currentUser.id)
    );
    if (!myInterviews.length) {
        el.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox display-1"></i><p>배정된 면접이 없습니다.</p></div>';
        return;
    }
    el.innerHTML = myInterviews.map(iv => `
        <div class="card shadow-sm mb-3">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="fw-bold mb-1">${iv.title}</h5>
                    <small class="text-muted">${iv.date} | 지원자 ${iv.applicants.length}명</small>
                </div>
                <button class="btn btn-primary main-btn" onclick="startEvaluate('${iv.id}')">
                    <i class="bi bi-pencil-square"></i> 평가하기
                </button>
            </div>
        </div>
    `).join('');
}

// --- 평가 입력 ---
let currentInterview = null;
let currentApplicant = null;

function startEvaluate(ivId) {
    currentInterview = getInterviews().find(iv => iv.id === ivId);
    if (!currentInterview) return;
    renderApplicantList();
    showPage('evaluate');
}

function renderApplicantList() {
    const evals = getEvaluations();
    const html = `
        <a href="#" onclick="showPage('evaluate_select')" class="text-muted"><i class="bi bi-arrow-left"></i> 뒤로</a>
        <h3 class="mt-2 mb-4">${currentInterview.title} - 지원자 목록</h3>
        <div class="row">
        ${currentInterview.applicants.map(app => {
            const myEval = evals.find(e => e.applicantId === app.id && e.judgeId === currentUser.id && e.interviewId === currentInterview.id);
            const statusBadge = myEval
                ? (myEval.status === 'submitted' ? '<span class="badge bg-success">제출완료</span>' : '<span class="badge bg-warning text-dark">임시저장</span>')
                : '<span class="badge bg-secondary">미평가</span>';
            return `
            <div class="col-md-4 mb-3">
                <div class="card shadow-sm text-center p-4">
                    <i class="bi bi-person-circle display-4 text-primary"></i>
                    <h5 class="fw-bold mt-2">${app.name}</h5>
                    <p class="text-muted small">${app.field}${app.age ? ' | ' + app.age + '세' : ''}</p>
                    ${statusBadge}
                    <button class="btn btn-primary main-btn mt-3" onclick="openEvalForm('${app.id}')">
                        <i class="bi bi-pencil-square"></i> ${myEval ? '수정하기' : '평가하기'}
                    </button>
                </div>
            </div>`;
        }).join('')}
        </div>`;
    document.getElementById('evaluateContent').innerHTML = html;
}

function openEvalForm(appId) {
    currentApplicant = currentInterview.applicants.find(a => a.id === appId);
    const evals = getEvaluations();
    const myEval = evals.find(e => e.applicantId === appId && e.judgeId === currentUser.id && e.interviewId === currentInterview.id);

    let html = `
    <a href="#" onclick="renderApplicantList()" class="text-muted"><i class="bi bi-arrow-left"></i> 지원자 목록</a>
    <div class="eval-header mt-2 mb-0">
        <h4 class="mb-0">${currentInterview.title}</h4>
        <small>평가위원: ${currentUser.name}</small>
    </div>
    <div class="card shadow-sm rounded-top-0 mb-4">
        <div class="card-body p-4">
            <h5 class="fw-bold mb-3 text-primary border-bottom pb-2">면접자 기본 정보</h5>
            <div class="row mb-4">
                <div class="col-md-3 mb-2"><label class="form-label text-muted small">면접자 이름</label><div class="form-control-plaintext fw-bold border rounded px-3 py-2 bg-light">${currentApplicant.name}</div></div>
                <div class="col-md-3 mb-2"><label class="form-label text-muted small">면접일시</label><div class="form-control-plaintext border rounded px-3 py-2 bg-light">${currentInterview.date}</div></div>
                <div class="col-md-2 mb-2"><label class="form-label text-muted small">나이</label><div class="form-control-plaintext border rounded px-3 py-2 bg-light">${currentApplicant.age || '-'}</div></div>
                <div class="col-md-4 mb-2"><label class="form-label text-muted small">평가자 이름</label><div class="form-control-plaintext fw-bold border rounded px-3 py-2 bg-light">${currentUser.name}</div></div>
            </div>`;

    // 평가 항목
    EVAL_CRITERIA.forEach(c => {
        const savedScore = myEval ? myEval['score' + c.id] : null;
        html += `
        <div class="eval-section">
            <div class="d-flex align-items-center mb-2">
                <span class="badge bg-primary rounded-circle me-2 fs-6">${c.id}</span>
                <h5 class="fw-bold mb-0">${c.name}</h5>
                <span class="badge bg-secondary ms-2">${c.maxScore}점 만점</span>
            </div>
            <ul class="list-unstyled text-muted small ms-4 mb-3">
                ${c.questions.map(q => `<li class="mb-1"><i class="bi bi-dot"></i> ${q}</li>`).join('')}
            </ul>
            <div class="d-flex flex-wrap gap-2 ms-4">
                ${c.scores.map((s, i) => `
                    <div class="score-radio-wrapper">
                        <div class="btn btn-outline-primary score-btn ${savedScore === s ? 'selected' : ''}"
                             onclick="selectScore(this, ${c.id}, ${s})" data-criterion="${c.id}" data-score="${s}">
                            <div class="score-value">${s}</div>
                            <div class="score-label">${c.labels[i]}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });

    // 합계, 판정, 의견
    const savedTotal = myEval ? myEval.total : 0;
    html += `
            <div class="bg-light border rounded p-3 mb-4">
                <div class="d-flex justify-content-between align-items-center">
                    <div><strong>합계</strong></div>
                    <div class="fs-3"><strong id="totalScore" class="${savedTotal >= 70 ? 'text-success' : 'text-danger'}">${savedTotal}</strong><span class="text-muted fs-5"> / 100점</span></div>
                </div>
            </div>
            <h5 class="fw-bold mb-3 text-primary border-bottom pb-2">종합 의견 판정</h5>
            <div class="d-flex gap-3 mb-4">
                <div class="form-check"><input class="form-check-input" type="radio" name="judgment" value="pass" id="j_pass" ${myEval && myEval.judgment === 'pass' ? 'checked' : ''}><label class="form-check-label fw-bold text-success" for="j_pass">합격</label></div>
                <div class="form-check"><input class="form-check-input" type="radio" name="judgment" value="hold" id="j_hold" ${myEval && myEval.judgment === 'hold' ? 'checked' : ''}><label class="form-check-label fw-bold text-warning" for="j_hold">보류</label></div>
                <div class="form-check"><input class="form-check-input" type="radio" name="judgment" value="fail" id="j_fail" ${myEval && myEval.judgment === 'fail' ? 'checked' : ''}><label class="form-check-label fw-bold text-danger" for="j_fail">불합격</label></div>
            </div>
            <h5 class="fw-bold mb-3 text-primary border-bottom pb-2">평가 의견 (세줄평)</h5>
            <textarea class="form-control mb-4" id="evalComment" rows="4" placeholder="이 면접자에 대한 종합 의견을 자유롭게 작성하세요...">${myEval ? myEval.comment || '' : ''}</textarea>
            <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-outline-secondary btn-lg" onclick="submitEval('draft')"><i class="bi bi-save"></i> 임시 저장</button>
                <button class="btn btn-primary main-btn btn-lg" onclick="submitEval('submitted')"><i class="bi bi-check-lg"></i> 최종 제출</button>
            </div>
        </div>
    </div>`;

    document.getElementById('evaluateContent').innerHTML = html;
}

// 선택한 점수 저장용
let selectedScores = {};

function selectScore(el, criterionId, score) {
    document.querySelectorAll(`[data-criterion="${criterionId}"]`).forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    selectedScores[criterionId] = score;
    updateTotal();
}

function updateTotal() {
    let total = 0;
    for (let i = 1; i <= 5; i++) total += selectedScores[i] || 0;
    const el = document.getElementById('totalScore');
    el.textContent = total;
    el.className = total >= 70 ? 'text-success' : 'text-danger';
}

function submitEval(status) {
    if (status === 'submitted') {
        for (let i = 1; i <= 5; i++) {
            if (!selectedScores[i]) { showAlert('모든 항목을 선택해주세요.', 'warning'); return; }
        }
        if (!confirm('최종 제출하시겠습니까?')) return;
    }

    const judgment = document.querySelector('input[name=judgment]:checked');
    const ev = {
        interviewId: currentInterview.id,
        applicantId: currentApplicant.id,
        judgeId: currentUser.id,
        judgeName: currentUser.name,
        score1: selectedScores[1] || 0,
        score2: selectedScores[2] || 0,
        score3: selectedScores[3] || 0,
        score4: selectedScores[4] || 0,
        score5: selectedScores[5] || 0,
        total: Object.values(selectedScores).reduce((a, b) => a + b, 0),
        judgment: judgment ? judgment.value : '',
        comment: document.getElementById('evalComment').value,
        status: status,
        timestamp: new Date().toISOString()
    };
    saveEvaluation(ev);
    selectedScores = {};

    if (status === 'submitted') {
        // 모든 지원자 평가 완료 여부 확인
        const allEvals = getEvaluations().filter(e => e.interviewId === currentInterview.id && e.judgeId === currentUser.id && e.status === 'submitted');
        const allDone = currentInterview.applicants.every(app => allEvals.some(e => e.applicantId === app.id));
        if (allDone) {
            showAlert('모든 지원자 평가가 완료되었습니다! 서명을 진행해주세요.', 'success');
            openSignaturePage(currentInterview.id);
            return;
        }
        showAlert('최종 제출되었습니다!', 'success');
    } else {
        showAlert('임시 저장되었습니다.', 'info');
    }
    renderApplicantList();
}

// --- 결과 ---
function getScoreLabel(criterionId, score) {
    var c = EVAL_CRITERIA.find(function(x) { return x.id === criterionId; });
    if (!c) return '';
    var idx = c.scores.indexOf(score);
    return idx >= 0 ? c.labels[idx] : '';
}

function buildResultsData(iv) {
    var evals = getEvaluations().filter(function(e) { return e.interviewId === iv.id && e.status === 'submitted'; });
    var judges = getUsers().filter(function(u) { return iv.judges.includes(u.id); });

    var results = iv.applicants.map(function(app) {
        var appEvals = evals.filter(function(e) { return e.applicantId === app.id; });
        var avg = appEvals.length ? appEvals.reduce(function(s, e) { return s + e.total; }, 0) / appEvals.length : 0;

        // 항목별 평균 계산
        var criteriaAvg = [];
        for (var ci = 0; ci < EVAL_CRITERIA.length; ci++) {
            var cId = EVAL_CRITERIA[ci].id;
            var sum = 0;
            var cnt = 0;
            for (var ei = 0; ei < appEvals.length; ei++) {
                sum += appEvals[ei]['score' + cId] || 0;
                cnt++;
            }
            criteriaAvg.push(cnt > 0 ? Math.round(sum / cnt * 10) / 10 : 0);
        }

        return { app: app, evals: appEvals, avg: Math.round(avg * 100) / 100, criteriaAvg: criteriaAvg, complete: appEvals.length === judges.length };
    });
    results.sort(function(a, b) { return b.avg - a.avg; });

    var passed = 0;
    results.forEach(function(r) {
        if (r.complete && r.avg >= 70 && passed < iv.hireCount) { r.result = '합격'; passed++; }
        else if (r.complete && r.avg < 70) r.result = '탈락(기준미달)';
        else if (r.complete) r.result = '탈락(정원초과)';
        else r.result = '진행중';
    });

    return { results: results, judges: judges, evals: evals };
}

function showResults(ivId) {
    var iv = getInterviews().find(function(i) { return i.id === ivId; });
    if (!iv) return;
    var data = buildResultsData(iv);
    var results = data.results;
    var judges = data.judges;
    var allComplete = results.length > 0 && results.every(function(r) { return r.complete; });

    var html = '<div class="d-flex justify-content-between align-items-center mb-4">'
        + '<h3><i class="bi bi-bar-chart"></i> ' + iv.title + ' - 결과</h3>'
        + '<div>';

    // 관리자 심사완료 버튼
    if (isAdmin() && allComplete && iv.status !== 'completed') {
        html += '<button class="btn btn-success me-2" onclick="completeInterview(\'' + ivId + '\')"><i class="bi bi-check-circle"></i> 심사완료</button>';
    }
    if (iv.status === 'completed') {
        html += '<span class="badge bg-success fs-6 me-2"><i class="bi bi-check-circle"></i> 심사완료</span>';
    }
    html += '<button class="btn btn-outline-warning" onclick="openSignaturePage(\'' + ivId + '\')"><i class="bi bi-pen"></i> 서명</button>';
    html += '</div></div>';

    // 면접 정보
    html += '<div class="alert alert-info"><strong>' + iv.title + '</strong> | ' + iv.date + ' | 채용인원: ' + iv.hireCount + '명 | 합격기준: 평균 70점 이상</div>';

    // 종합 결과표
    html += '<h5 class="fw-bold mb-3">종합 결과표</h5>';
    html += '<div class="table-responsive mb-4"><table class="table table-bordered text-center shadow-sm">';
    html += '<thead class="table-dark"><tr><th>순위</th><th>지원자</th><th>분야</th>';
    for (var ji = 0; ji < judges.length; ji++) html += '<th>' + judges[ji].name + '</th>';
    html += '<th>최종평균</th><th>결과</th></tr></thead><tbody>';

    for (var ri = 0; ri < results.length; ri++) {
        var r = results[ri];
        var cls = r.result === '합격' ? 'table-success' : '';
        html += '<tr class="' + cls + '"><td class="fw-bold">' + (ri + 1) + '</td><td class="fw-bold">' + r.app.name + '</td><td>' + r.app.field + '</td>';
        for (var jj = 0; jj < judges.length; jj++) {
            var je = r.evals.find(function(e) { return e.judgeId === judges[jj].id; });
            html += '<td>' + (je ? je.total : '-') + '</td>';
        }
        var avgClass = r.avg >= 70 ? 'text-success' : 'text-danger';
        html += '<td class="fw-bold fs-5 ' + avgClass + '">' + r.avg + '</td>';
        html += '<td>' + (r.result === '합격' ? '<span class="badge bg-success fs-6">합격</span>' : (r.result === '진행중' ? '<span class="badge bg-warning text-dark">진행중</span>' : '<span class="badge bg-secondary">' + r.result + '</span>')) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    // 항목별 평균 점수표
    html += '<h5 class="fw-bold mb-3">항목별 평균 점수</h5>';
    html += '<div class="table-responsive mb-4"><table class="table table-bordered text-center shadow-sm">';
    html += '<thead class="table-dark"><tr><th>지원자</th>';
    for (var ci = 0; ci < EVAL_CRITERIA.length; ci++) {
        html += '<th>' + EVAL_CRITERIA[ci].name + '<br><small>(' + EVAL_CRITERIA[ci].maxScore + '점)</small></th>';
    }
    html += '<th>합계</th></tr></thead><tbody>';
    for (var ri2 = 0; ri2 < results.length; ri2++) {
        var r2 = results[ri2];
        html += '<tr><td class="fw-bold">' + r2.app.name + '</td>';
        for (var ci2 = 0; ci2 < EVAL_CRITERIA.length; ci2++) {
            var cavg = r2.criteriaAvg[ci2];
            var maxS = EVAL_CRITERIA[ci2].maxScore;
            var pct = maxS > 0 ? (cavg / maxS * 100) : 0;
            var color = pct >= 80 ? 'text-success' : (pct >= 60 ? 'text-warning' : 'text-danger');
            html += '<td class="' + color + ' fw-bold">' + cavg + '</td>';
        }
        html += '<td class="fw-bold fs-5">' + r2.avg + '</td></tr>';
    }
    html += '</tbody></table></div>';

    // 지원자별 상세 (심사위원 점수 + 의견)
    html += '<h5 class="fw-bold mb-3">지원자별 상세 평가</h5>';
    for (var ri3 = 0; ri3 < results.length; ri3++) {
        var r3 = results[ri3];
        var resultBadge = r3.result === '합격' ? '<span class="badge bg-success">합격</span>'
            : (r3.result === '진행중' ? '<span class="badge bg-warning text-dark">진행중</span>'
            : '<span class="badge bg-secondary">' + r3.result + '</span>');

        html += '<div class="card shadow-sm mb-4">'
            + '<div class="card-header d-flex justify-content-between align-items-center">'
            + '<div><strong class="fs-5">' + r3.app.name + '</strong> <small class="text-muted">(' + r3.app.field + ')</small></div>'
            + '<div>평균: <strong class="fs-5 ' + (r3.avg >= 70 ? 'text-success' : 'text-danger') + '">' + r3.avg + '점</strong> ' + resultBadge + '</div>'
            + '</div><div class="card-body p-0">';

        // 항목별 점수 테이블
        html += '<div class="table-responsive"><table class="table table-sm table-bordered text-center mb-0">';
        html += '<thead class="table-light"><tr><th>심사위원</th>';
        for (var ci3 = 0; ci3 < EVAL_CRITERIA.length; ci3++) {
            html += '<th>' + EVAL_CRITERIA[ci3].name + '<br><small>(' + EVAL_CRITERIA[ci3].maxScore + '점)</small></th>';
        }
        html += '<th>합계</th><th>판정</th></tr></thead><tbody>';

        for (var jk = 0; jk < judges.length; jk++) {
            var judge = judges[jk];
            var jeval = r3.evals.find(function(e) { return e.judgeId === judge.id; });
            html += '<tr><td class="fw-bold">' + judge.name + '</td>';
            if (jeval) {
                for (var ci4 = 0; ci4 < EVAL_CRITERIA.length; ci4++) {
                    var sc = jeval['score' + EVAL_CRITERIA[ci4].id];
                    var lbl = getScoreLabel(EVAL_CRITERIA[ci4].id, sc);
                    html += '<td>' + sc + ' <small class="text-muted">(' + lbl + ')</small></td>';
                }
                html += '<td class="fw-bold">' + jeval.total + '</td>';
                var jdg = jeval.judgment === 'pass' ? '<span class="text-success fw-bold">합격</span>'
                    : (jeval.judgment === 'hold' ? '<span class="text-warning fw-bold">보류</span>'
                    : (jeval.judgment === 'fail' ? '<span class="text-danger fw-bold">불합격</span>' : '-'));
                html += '<td>' + jdg + '</td>';
            } else {
                html += '<td colspan="' + (EVAL_CRITERIA.length + 2) + '" class="text-muted">미평가</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table></div>';

        // 심사위원 의견 (멘트)
        var hasComments = r3.evals.some(function(e) { return e.comment && e.comment.trim(); });
        if (hasComments) {
            html += '<div class="p-3 border-top">';
            html += '<h6 class="fw-bold mb-2"><i class="bi bi-chat-quote"></i> 심사위원 의견</h6>';
            for (var jm = 0; jm < judges.length; jm++) {
                var jeval2 = r3.evals.find(function(e) { return e.judgeId === judges[jm].id; });
                if (jeval2 && jeval2.comment && jeval2.comment.trim()) {
                    html += '<div class="mb-2 p-2 bg-light rounded">'
                        + '<strong class="text-primary">' + judges[jm].name + ':</strong> '
                        + '<span>' + jeval2.comment.replace(/\n/g, '<br>') + '</span>'
                        + '</div>';
                }
            }
            html += '</div>';
        }

        html += '</div></div>';
    }

    document.getElementById('resultsDashboard').innerHTML = html;
    showPage('results_dashboard');
}

function completeInterview(ivId) {
    if (!confirm('심사를 완료 처리하시겠습니까? 완료 후에도 결과를 확인할 수 있습니다.')) return;
    var interviews = getInterviews();
    var iv = interviews.find(function(i) { return i.id === ivId; });
    if (iv) {
        iv.status = 'completed';
        setDB('interviews', interviews);
        showAlert('심사가 완료 처리되었습니다!', 'success');
        showResults(ivId);
    }
}

function renderResultsDashboard() {
    var interviews = getInterviews();
    if (!interviews.length) {
        document.getElementById('resultsDashboard').innerHTML = '<div class="text-center py-5 text-muted"><p>등록된 면접이 없습니다.</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < interviews.length; i++) {
        var iv = interviews[i];
        var statusBadge = iv.status === 'completed'
            ? '<span class="badge bg-success me-2">완료</span>'
            : '<span class="badge bg-warning text-dark me-2">진행중</span>';
        html += '<div class="card shadow-sm mb-3"><div class="card-body d-flex justify-content-between align-items-center">'
            + '<div><h5 class="fw-bold mb-1">' + statusBadge + iv.title + '</h5><small class="text-muted">' + iv.date + ' | 채용 ' + iv.hireCount + '명</small></div>'
            + '<button class="btn btn-info text-white" onclick="showResults(\'' + iv.id + '\')"><i class="bi bi-bar-chart"></i> 결과 보기</button>'
            + '</div></div>';
    }
    document.getElementById('resultsDashboard').innerHTML = html;
}

// --- 회의록 ---
function showMinutes(ivId) {
    var iv = getInterviews().find(function(i) { return i.id === ivId; });
    if (!iv) return;
    showResults(ivId);
}

// ===== 산학협력단 운영위원회 회의록 서명 =====
var committeeCanvas = null;
var committeeCtx = null;
var committeeDrawing = false;

function renderCommitteeSelect() {
    var el = document.getElementById('committeeSelectList');
    var minutes = getDB('committee_minutes') || [];
    var committeeSigs = getDB('committee_signatures') || [];
    var allUsers = getUsers();

    var html = '';

    // 새 회의록 업로드 (관리자만)
    if (isAdmin()) {
        html += '<div class="card shadow-sm mb-4 border-start border-4 border-warning">'
            + '<div class="card-header main-btn text-white"><h5 class="mb-0"><i class="bi bi-upload"></i> 회의록 업로드</h5></div>'
            + '<div class="card-body p-4">'
            + '<form id="committeeMinutesForm">'
            + '<div class="row mb-3">'
            + '<div class="col-md-4"><label class="form-label fw-bold">회의명 *</label><input type="text" class="form-control" id="cmTitle" placeholder="예: 제1차 산학협력단 운영위원회" required></div>'
            + '<div class="col-md-2"><label class="form-label fw-bold">회차</label><input type="text" class="form-control" id="cmNumber" placeholder="제1차"></div>'
            + '<div class="col-md-3"><label class="form-label fw-bold">회의일자 *</label><input type="date" class="form-control" id="cmDate" required></div>'
            + '<div class="col-md-3"><label class="form-label fw-bold">회의록 파일 *</label><input type="file" class="form-control" id="cmFile" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.hwp" required></div>'
            + '</div>'
            + '<div class="mb-3"><label class="form-label fw-bold">안건</label><textarea class="form-control" id="cmAgenda" rows="2" placeholder="회의 안건을 입력하세요"></textarea></div>'
            + '<div class="mb-3"><label class="form-label fw-bold">서명 대상 위원 *</label><div id="cmSignerCheckboxes"></div></div>'
            + '<button type="submit" class="btn btn-primary main-btn"><i class="bi bi-upload"></i> 회의록 등록</button>'
            + '</form></div></div>';
    }

    // 등록된 회의록 목록 (카드 형태로 순서대로)
    html += '<h5 class="fw-bold mb-3"><i class="bi bi-journal-text"></i> 등록된 회의록 (' + minutes.length + '건)</h5>';

    if (!minutes.length) {
        html += '<div class="text-center py-5 text-muted"><i class="bi bi-inbox display-1"></i><p class="mt-3">등록된 회의록이 없습니다.</p></div>';
    } else {
        html += '<div class="list-group">';
        for (var i = 0; i < minutes.length; i++) {
            var m = minutes[i];
            var signers = m.signers || [];
            var signedCount = 0;
            for (var s = 0; s < signers.length; s++) {
                if (committeeSigs.some(function(sig) { return sig.minuteId === m.id && sig.userId === signers[s]; })) signedCount++;
            }
            var allSigned = signedCount === signers.length && signers.length > 0;
            var mySigned = committeeSigs.some(function(sig) { return sig.minuteId === m.id && sig.userId === currentUser.id; });

            var statusBadge = allSigned
                ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> 서명완료</span>'
                : '<span class="badge bg-warning text-dark"><i class="bi bi-pen"></i> 서명 ' + signedCount + '/' + signers.length + '</span>';
            var myBadge = mySigned
                ? '<span class="badge bg-success ms-1">내 서명완료</span>'
                : '<span class="badge bg-danger ms-1">서명필요</span>';

            var fileType = '';
            if (m.fileData) {
                if (m.fileData.startsWith('data:image')) fileType = '<i class="bi bi-file-image text-success"></i>';
                else if (m.fileData.startsWith('data:application/pdf')) fileType = '<i class="bi bi-file-pdf text-danger"></i>';
                else fileType = '<i class="bi bi-file-earmark text-primary"></i>';
            }

            html += '<div class="list-group-item list-group-item-action p-0 mb-2 rounded shadow-sm" style="cursor:pointer;" onclick="openCommitteeMinute(\'' + m.id + '\')">'
                + '<div class="d-flex align-items-center p-3">'
                // 순번
                + '<div class="text-center me-3" style="min-width:40px;">'
                + '<span class="badge bg-dark rounded-circle fs-6">' + (i + 1) + '</span></div>'
                // 파일 아이콘
                + '<div class="me-3 fs-3">' + (fileType || '<i class="bi bi-file-text text-muted"></i>') + '</div>'
                // 내용
                + '<div class="flex-grow-1">'
                + '<h6 class="fw-bold mb-1">' + (m.number ? m.number + ' ' : '') + m.title + '</h6>'
                + '<small class="text-muted">' + m.date;
            if (m.agenda) html += ' | ' + m.agenda;
            if (m.fileName) html += ' | <span class="text-primary">' + m.fileName + '</span>';
            html += '</small>'
                + '<div class="mt-1">' + statusBadge + myBadge + '</div>'
                + '</div>'
                // 화살표
                + '<div class="ms-3 text-muted"><i class="bi bi-chevron-right fs-4"></i></div>'
                + '</div>';

            // 관리자 삭제 버튼
            if (isAdmin()) {
                html += '<div class="border-top px-3 py-1 text-end" onclick="event.stopPropagation();">'
                    + '<button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); if(confirm(\'삭제하시겠습니까?\')) deleteCommitteeMinute(\'' + m.id + '\')"><i class="bi bi-trash"></i> 삭제</button>'
                    + '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
    }

    el.innerHTML = html;

    // 관리자 폼 초기화
    if (isAdmin()) {
        var checkDiv = document.getElementById('cmSignerCheckboxes');
        if (checkDiv) {
            var usersHtml = '';
            for (var u = 0; u < allUsers.length; u++) {
                usersHtml += '<div class="form-check form-check-inline">'
                    + '<input class="form-check-input" type="checkbox" value="' + allUsers[u].id + '" id="cms_' + allUsers[u].id + '" checked>'
                    + '<label class="form-check-label" for="cms_' + allUsers[u].id + '">' + allUsers[u].name + '</label></div>';
            }
            checkDiv.innerHTML = usersHtml;
        }

        var form = document.getElementById('committeeMinutesForm');
        if (form) {
            form.onsubmit = function(e) {
                e.preventDefault();
                var title = document.getElementById('cmTitle').value.trim();
                var date = document.getElementById('cmDate').value;
                var number = document.getElementById('cmNumber').value.trim();
                var agenda = document.getElementById('cmAgenda').value.trim();
                var signers = [];
                var checks = document.querySelectorAll('#cmSignerCheckboxes input:checked');
                for (var c = 0; c < checks.length; c++) signers.push(checks[c].value);
                var fileInput = document.getElementById('cmFile');
                var file = fileInput.files[0];

                if (!title || !date || !signers.length) {
                    showAlert('회의명, 일자, 서명 대상을 입력해주세요.', 'warning'); return;
                }
                if (!file) {
                    showAlert('회의록 파일을 첨부해주세요.', 'warning'); return;
                }

                var reader = new FileReader();
                reader.onload = function(ev) {
                    var mins = getDB('committee_minutes') || [];
                    mins.push({
                        id: Date.now().toString(),
                        title: title, date: date, number: number, agenda: agenda,
                        signers: signers,
                        fileData: ev.target.result,
                        fileName: file.name,
                        createdAt: new Date().toISOString()
                    });
                    setDB('committee_minutes', mins);
                    showAlert((number ? number + ' ' : '') + title + ' 회의록이 등록되었습니다!', 'success');
                    renderCommitteeSelect();
                };
                reader.readAsDataURL(file);
            };
        }
    }
}

function deleteCommitteeMinute(id) {
    var mins = (getDB('committee_minutes') || []).filter(function(m) { return m.id !== id; });
    setDB('committee_minutes', mins);
    var sigs = (getDB('committee_signatures') || []).filter(function(s) { return s.minuteId !== id; });
    setDB('committee_signatures', sigs);
    showAlert('회의록이 삭제되었습니다.', 'info');
    renderCommitteeSelect();
}

function openCommitteeMinute(minuteId) {
    try {
        var mins = getDB('committee_minutes') || [];
        var m = mins.find(function(x) { return x.id === minuteId; });
        if (!m) { showAlert('회의록을 찾을 수 없습니다.', 'danger'); return; }

        var committeeSigs = getDB('committee_signatures') || [];
        var allUsers = getUsers();

        // 서명 현황
        var sigCards = '';
        var signedCount = 0;
        for (var i = 0; i < m.signers.length; i++) {
            var uid = m.signers[i];
            var user = allUsers.find(function(u) { return u.id === uid; });
            if (!user) continue;
            var sig = committeeSigs.find(function(s) { return s.minuteId === minuteId && s.userId === uid; });
            if (sig) signedCount++;
            var hCls = sig ? 'bg-success' : 'bg-secondary';
            var bCls = sig ? 'border-success' : 'border-secondary';
            var body = sig
                ? '<img src="' + sig.dataUrl + '" alt="서명" style="max-height:70px;max-width:150px;">'
                : '<span class="text-muted small">미서명</span>';
            var footer = sig
                ? '<div class="card-footer text-center py-1"><small class="text-muted">' + new Date(sig.timestamp).toLocaleString('ko-KR') + '</small></div>'
                : '';

            sigCards += '<div class="col-md-3 col-sm-4 mb-3">'
                + '<div class="card ' + bCls + '">'
                + '<div class="card-header ' + hCls + ' text-white text-center py-2"><small class="fw-bold">' + user.name + '</small></div>'
                + '<div class="card-body sig-preview p-2" style="min-height:80px;">' + body + '</div>'
                + footer + '</div></div>';
        }

        var allSigned = signedCount === m.signers.length && m.signers.length > 0;
        var isSigner = m.signers.indexOf(currentUser.id) >= 0;
        var mySig = committeeSigs.find(function(s) { return s.minuteId === minuteId && s.userId === currentUser.id; });

        var html = ''
            + '<a href="#" onclick="showPage(\'committee_select\')" class="text-muted"><i class="bi bi-arrow-left"></i> 회의록 목록</a>'
            + '<div class="eval-header mt-2 mb-0">'
            + '<h4 class="mb-0"><i class="bi bi-journal-text"></i> ' + (m.number ? m.number + ' ' : '') + m.title + '</h4>'
            + '<small>' + m.date + (m.agenda ? ' | ' + m.agenda : '') + '</small></div>'
            + '<div class="card shadow-sm rounded-top-0 mb-4"><div class="card-body p-4">';

        // STEP 1: 회의록 내용 확인
        html += '<div class="d-flex align-items-center mb-3">'
            + '<span class="badge bg-primary rounded-circle me-2 fs-6">1</span>'
            + '<h5 class="fw-bold mb-0">회의록 내용 확인</h5></div>';

        if (m.fileData) {
            if (m.fileData.startsWith('data:image')) {
                html += '<div class="border rounded p-2 mb-4 bg-white text-center">'
                    + '<img src="' + m.fileData + '" alt="회의록" class="img-fluid" style="max-width:100%;">'
                    + '</div>';
            } else if (m.fileData.startsWith('data:application/pdf')) {
                html += '<div class="mb-4">'
                    + '<embed src="' + m.fileData + '" type="application/pdf" width="100%" height="700px" class="border rounded">'
                    + '<div class="mt-2"><a href="' + m.fileData + '" download="' + (m.fileName || '회의록.pdf') + '" class="btn btn-outline-primary btn-sm"><i class="bi bi-download"></i> PDF 다운로드</a></div>'
                    + '</div>';
            } else {
                html += '<div class="mb-4"><a href="' + m.fileData + '" download="' + (m.fileName || '회의록') + '" class="btn btn-outline-primary"><i class="bi bi-download"></i> ' + (m.fileName || '파일 다운로드') + '</a></div>';
            }
        } else {
            html += '<div class="alert alert-secondary mb-4">첨부된 파일이 없습니다.</div>';
        }

        // STEP 2: 서명 현황
        html += '<div class="d-flex align-items-center mb-3">'
            + '<span class="badge bg-primary rounded-circle me-2 fs-6">2</span>'
            + '<h5 class="fw-bold mb-0">서명 현황 (' + signedCount + '/' + m.signers.length + ')</h5></div>'
            + '<div class="row mb-4">' + sigCards + '</div>';

        // STEP 3: 서명
        if (isSigner) {
            html += '<div class="d-flex align-items-center mb-3">'
                + '<span class="badge bg-primary rounded-circle me-2 fs-6">3</span>'
                + '<h5 class="fw-bold mb-0">서명하기</h5></div>'
                + '<p class="text-muted small mb-2">위 회의록 내용을 확인하신 후, 아래에 자필 서명해주세요.</p>'
                + '<div class="sig-canvas-wrap mb-3" style="width:100%;max-width:500px;">'
                + '<canvas id="committeeCanvas" width="500" height="200"></canvas>'
                + '<span class="sig-placeholder" id="committeePlaceholder">여기에 서명하세요</span></div>'
                + '<div class="d-flex gap-2 mb-4">'
                + '<button class="btn btn-outline-secondary" onclick="clearCommitteeSignature()"><i class="bi bi-eraser"></i> 다시 쓰기</button>'
                + '<button class="btn btn-primary main-btn btn-lg" onclick="saveCommitteeMinuteSignature(\'' + minuteId + '\')"><i class="bi bi-check-lg"></i> 확인 및 서명 저장</button></div>';
            if (mySig) {
                html += '<div class="alert alert-success"><i class="bi bi-check-circle"></i> 서명이 등록되어 있습니다. 다시 서명하면 교체됩니다.</div>';
            }
        } else {
            html += '<div class="alert alert-secondary">서명 대상이 아닙니다.</div>';
        }

        if (allSigned) {
            html += '<div class="alert alert-success mt-3"><i class="bi bi-check-circle-fill"></i> <strong>모든 위원의 서명이 완료되어 회의록이 확정되었습니다.</strong>'
                + ' <button class="btn btn-success ms-3" onclick="window.print()"><i class="bi bi-printer"></i> 인쇄</button></div>';
        }

        html += '</div></div>';
        document.getElementById('committeeContent').innerHTML = html;
        showPage('committee');
        if (isSigner) setTimeout(initCommitteeCanvas, 200);
    } catch(err) {
        console.error('회의록 페이지 오류:', err);
        showAlert('페이지 로드 중 오류: ' + err.message, 'danger');
    }
}

function openCommitteePage(ivId) {
    try {
        var iv = getInterviews().find(function(i) { return i.id === ivId; });
        if (!iv) { showAlert('면접을 찾을 수 없습니다.', 'danger'); return; }

        var committeeSigs = getDB('committee_signatures') || [];
        var data = buildResultsData(iv);
        var results = data.results;
        var judges = data.judges;

        // 운영위원회 참석자 = 관리자(산단장) + 모든 심사위원
        var admin = getUsers().find(function(u) { return u.role === 'admin'; });
        var allMembers = admin ? [admin].concat(judges) : judges;

        // 서명 현황 카드
        var sigCards = '';
        var signedCount = 0;
        for (var i = 0; i < allMembers.length; i++) {
            var member = allMembers[i];
            var sig = null;
            for (var j = 0; j < committeeSigs.length; j++) {
                if (committeeSigs[j].interviewId === ivId && committeeSigs[j].userId === member.id) {
                    sig = committeeSigs[j]; break;
                }
            }
            if (sig) signedCount++;
            var headerCls = sig ? 'bg-success' : 'bg-secondary';
            var borderCls = sig ? 'border-success' : 'border-secondary';
            var body = sig
                ? '<img src="' + sig.dataUrl + '" alt="서명" style="max-height:70px;max-width:150px;">'
                : '<span class="text-muted small">미서명</span>';
            var footer = sig
                ? '<div class="card-footer text-center py-1"><small class="text-muted">' + new Date(sig.timestamp).toLocaleString('ko-KR') + '</small></div>'
                : '';
            var roleName = member.role === 'admin' ? '위원장' : '위원';

            sigCards += '<div class="col-md-3 col-sm-4 mb-3">'
                + '<div class="card ' + borderCls + '">'
                + '<div class="card-header ' + headerCls + ' text-white text-center py-2">'
                + '<small class="fw-bold">' + member.name + '</small><br>'
                + '<small>(' + roleName + ')</small>'
                + '</div>'
                + '<div class="card-body sig-preview p-2" style="min-height:80px;">' + body + '</div>'
                + footer + '</div></div>';
        }

        var allSigned = signedCount === allMembers.length;

        // 결과 요약 테이블
        var resultTable = '<table class="table table-bordered table-sm text-center mb-0">'
            + '<thead class="table-dark"><tr><th>순위</th><th>지원자</th><th>지원분야</th><th>평균점수</th><th>결과</th></tr></thead><tbody>';
        for (var ri = 0; ri < results.length; ri++) {
            var r = results[ri];
            var cls = r.result === '합격' ? 'table-success' : '';
            var resBadge = r.result === '합격' ? '<span class="badge bg-success">합격</span>'
                : (r.result === '진행중' ? '<span class="badge bg-warning text-dark">진행중</span>'
                : '<span class="badge bg-secondary">' + r.result + '</span>');
            resultTable += '<tr class="' + cls + '"><td>' + (ri+1) + '</td><td class="fw-bold">' + r.app.name + '</td><td>' + r.app.field + '</td>'
                + '<td class="fw-bold ' + (r.avg >= 70 ? 'text-success' : 'text-danger') + '">' + r.avg + '</td>'
                + '<td>' + resBadge + '</td></tr>';
        }
        resultTable += '</tbody></table>';

        // 현재 유저가 서명 대상인지 확인
        var isMember = allMembers.some(function(m) { return m.id === currentUser.id; });
        var mySig = committeeSigs.find(function(s) { return s.interviewId === ivId && s.userId === currentUser.id; });

        var html = ''
            + '<a href="#" onclick="showPage(\'committee_select\')" class="text-muted"><i class="bi bi-arrow-left"></i> 뒤로</a>'

            // 헤더
            + '<div class="eval-header mt-2 mb-0">'
            + '<h4 class="mb-0"><i class="bi bi-journal-text"></i> 산학협력단 운영위원회 회의록</h4>'
            + '<small>' + iv.title + '</small>'
            + '</div>'

            + '<div class="card shadow-sm rounded-top-0 mb-4"><div class="card-body p-4">'

            // 회의 정보
            + '<div class="row mb-4">'
            + '<div class="col-md-6">'
            + '<table class="table table-bordered mb-0">'
            + '<tr><th class="table-light" style="width:35%">회의명</th><td>산학협력단 운영위원회</td></tr>'
            + '<tr><th class="table-light">안건</th><td>' + iv.title + ' 심사결과 의결</td></tr>'
            + '<tr><th class="table-light">회의일시</th><td>' + iv.date + '</td></tr>'
            + '</table>'
            + '</div>'
            + '<div class="col-md-6">'
            + '<table class="table table-bordered mb-0">'
            + '<tr><th class="table-light" style="width:35%">위원장</th><td>' + (admin ? admin.name : '-') + '</td></tr>'
            + '<tr><th class="table-light">참석위원</th><td>' + judges.map(function(j) { return j.name; }).join(', ') + '</td></tr>'
            + '<tr><th class="table-light">채용인원</th><td>' + iv.hireCount + '명</td></tr>'
            + '</table>'
            + '</div>'
            + '</div>'

            // 안건 내용
            + '<h5 class="fw-bold mb-3 border-bottom pb-2"><i class="bi bi-card-checklist"></i> 안건: 직원채용 면접 심사결과</h5>'
            + '<p class="mb-2">상기 면접에 대한 심사위원 평가 결과를 아래와 같이 보고하고, 운영위원회의 의결을 요청합니다.</p>'

            // 결과 요약
            + '<div class="table-responsive mb-4">' + resultTable + '</div>'

            + '<div class="card bg-light border-0 mb-4"><div class="card-body">'
            + '<strong>의결 사항:</strong> 면접 심사 결과에 따라, 평균 70점 이상 취득자 중 상위 ' + iv.hireCount + '명을 최종 합격자로 선정함.'
            + '</div></div>'

            // 서명 현황
            + '<h5 class="fw-bold mb-3 border-bottom pb-2"><i class="bi bi-pen"></i> 운영위원회 위원 서명</h5>'
            + '<p class="text-muted small mb-3">모든 위원이 서명을 완료하면 회의록이 확정됩니다. (' + signedCount + '/' + allMembers.length + ')</p>'
            + '<div class="row mb-4">' + sigCards + '</div>';

        // 서명 입력 (대상자만)
        if (isMember) {
            html += '<h5 class="fw-bold mb-3 border-bottom pb-2"><i class="bi bi-pen"></i> 내 서명</h5>'
                + '<p class="text-muted small mb-2">아래 영역에 마우스 또는 터치로 서명해주세요.</p>'
                + '<div class="sig-canvas-wrap mb-3" style="width:100%;max-width:500px;">'
                + '<canvas id="committeeCanvas" width="500" height="200"></canvas>'
                + '<span class="sig-placeholder" id="committeePlaceholder">여기에 서명하세요</span>'
                + '</div>'
                + '<div class="d-flex gap-2 mb-4">'
                + '<button class="btn btn-outline-secondary" onclick="clearCommitteeSignature()"><i class="bi bi-eraser"></i> 다시 쓰기</button>'
                + '<button class="btn btn-primary main-btn" onclick="saveCommitteeSignature(\'' + ivId + '\')"><i class="bi bi-check-lg"></i> 서명 저장</button>'
                + '</div>';
            if (mySig) {
                html += '<div class="alert alert-success"><i class="bi bi-check-circle"></i> 서명이 이미 등록되어 있습니다. 다시 서명하면 기존 서명이 교체됩니다.</div>';
            }
        }

        // 모든 서명 완료
        if (allSigned) {
            html += '<div class="alert alert-success mt-3">'
                + '<i class="bi bi-check-circle-fill"></i> <strong>모든 위원의 서명이 완료되어 회의록이 확정되었습니다.</strong>'
                + '<button class="btn btn-success ms-3" onclick="printCommitteeMinutes(\'' + ivId + '\')"><i class="bi bi-printer"></i> 인쇄</button>'
                + '</div>';
        }

        html += '</div></div>';

        document.getElementById('committeeContent').innerHTML = html;
        showPage('committee');

        if (isMember) setTimeout(initCommitteeCanvas, 200);
    } catch(err) {
        console.error('운영위원회 페이지 오류:', err);
        showAlert('페이지 로드 중 오류: ' + err.message, 'danger');
    }
}

function initCommitteeCanvas() {
    committeeCanvas = document.getElementById('committeeCanvas');
    if (!committeeCanvas) return;
    committeeCtx = committeeCanvas.getContext('2d');

    var rect = committeeCanvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    committeeCanvas.width = rect.width * dpr;
    committeeCanvas.height = 200 * dpr;
    committeeCanvas.style.width = rect.width + 'px';
    committeeCanvas.style.height = '200px';
    committeeCtx.scale(dpr, dpr);
    committeeCtx.strokeStyle = '#1a237e';
    committeeCtx.lineWidth = 2.5;
    committeeCtx.lineCap = 'round';
    committeeCtx.lineJoin = 'round';
    committeeDrawing = false;

    committeeCanvas.addEventListener('mousedown', function(e) {
        committeeDrawing = true;
        var r = committeeCanvas.getBoundingClientRect();
        committeeCtx.beginPath();
        committeeCtx.moveTo(e.clientX - r.left, e.clientY - r.top);
        var ph = document.getElementById('committeePlaceholder');
        if (ph) ph.style.display = 'none';
    });
    committeeCanvas.addEventListener('mousemove', function(e) {
        if (!committeeDrawing) return;
        var r = committeeCanvas.getBoundingClientRect();
        committeeCtx.lineTo(e.clientX - r.left, e.clientY - r.top);
        committeeCtx.stroke();
    });
    committeeCanvas.addEventListener('mouseup', function() { committeeDrawing = false; });
    committeeCanvas.addEventListener('mouseleave', function() { committeeDrawing = false; });

    committeeCanvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        committeeDrawing = true;
        var t = e.touches[0], r = committeeCanvas.getBoundingClientRect();
        committeeCtx.beginPath();
        committeeCtx.moveTo(t.clientX - r.left, t.clientY - r.top);
        var ph = document.getElementById('committeePlaceholder');
        if (ph) ph.style.display = 'none';
    }, { passive: false });
    committeeCanvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (!committeeDrawing) return;
        var t = e.touches[0], r = committeeCanvas.getBoundingClientRect();
        committeeCtx.lineTo(t.clientX - r.left, t.clientY - r.top);
        committeeCtx.stroke();
    }, { passive: false });
    committeeCanvas.addEventListener('touchend', function() { committeeDrawing = false; });
}

function clearCommitteeSignature() {
    if (!committeeCtx) return;
    var dpr = window.devicePixelRatio || 1;
    committeeCtx.clearRect(0, 0, committeeCanvas.width / dpr, committeeCanvas.height / dpr);
    var ph = document.getElementById('committeePlaceholder');
    if (ph) ph.style.display = '';
}

function saveCommitteeSignature(ivId) {
    if (!committeeCanvas) { showAlert('서명을 입력해주세요.', 'warning'); return; }
    var blank = document.createElement('canvas');
    blank.width = committeeCanvas.width;
    blank.height = committeeCanvas.height;
    if (committeeCanvas.toDataURL() === blank.toDataURL()) {
        showAlert('서명을 입력해주세요.', 'warning'); return;
    }

    var dataUrl = committeeCanvas.toDataURL('image/png');
    var sigs = getDB('committee_signatures') || [];
    var idx = -1;
    for (var i = 0; i < sigs.length; i++) {
        if (sigs[i].interviewId === ivId && sigs[i].userId === currentUser.id) { idx = i; break; }
    }
    var sigData = {
        interviewId: ivId,
        userId: currentUser.id,
        userName: currentUser.name,
        dataUrl: dataUrl,
        timestamp: new Date().toISOString()
    };
    if (idx >= 0) sigs[idx] = sigData;
    else sigs.push(sigData);
    setDB('committee_signatures', sigs);

    showAlert('운영위원회 서명이 저장되었습니다!', 'success');
    openCommitteePage(ivId);
}

function saveCommitteeMinuteSignature(minuteId) {
    if (!committeeCanvas) { showAlert('서명을 입력해주세요.', 'warning'); return; }
    var blank = document.createElement('canvas');
    blank.width = committeeCanvas.width;
    blank.height = committeeCanvas.height;
    if (committeeCanvas.toDataURL() === blank.toDataURL()) {
        showAlert('서명을 입력해주세요.', 'warning'); return;
    }

    var dataUrl = committeeCanvas.toDataURL('image/png');
    var sigs = getDB('committee_signatures') || [];
    var idx = -1;
    for (var i = 0; i < sigs.length; i++) {
        if (sigs[i].minuteId === minuteId && sigs[i].userId === currentUser.id) { idx = i; break; }
    }
    var sigData = {
        minuteId: minuteId,
        userId: currentUser.id,
        userName: currentUser.name,
        dataUrl: dataUrl,
        timestamp: new Date().toISOString()
    };
    if (idx >= 0) sigs[idx] = sigData;
    else sigs.push(sigData);
    setDB('committee_signatures', sigs);

    showAlert('회의록 서명이 저장되었습니다!', 'success');
    openCommitteeMinute(minuteId);
}

function printCommitteeMinutes(ivId) {
    window.print();
}

// --- 사용자 관리 ---
function renderUsers() {
    const users = getUsers();
    const interviews = getInterviews();
    const evals = getEvaluations();
    const signatures = getDB('signatures') || [];

    let html = '<table class="table table-hover mb-0"><thead class="table-light"><tr><th>아이디</th><th>이름</th><th>역할</th><th>평가현황</th><th>서명</th><th>삭제</th></tr></thead><tbody>';
    users.forEach(u => {
        // 평가 현황 계산
        let evalStatus = '';
        if (u.role === 'judge') {
            let totalApplicants = 0;
            let submittedCount = 0;
            interviews.forEach(iv => {
                if (iv.judges && iv.judges.includes(u.id)) {
                    totalApplicants += iv.applicants.length;
                    iv.applicants.forEach(app => {
                        var submitted = evals.find(e => e.interviewId === iv.id && e.applicantId === app.id && e.judgeId === u.id && e.status === 'submitted');
                        if (submitted) submittedCount++;
                    });
                }
            });
            if (totalApplicants === 0) {
                evalStatus = '<span class="text-muted small">배정없음</span>';
            } else if (submittedCount === totalApplicants) {
                evalStatus = '<span class="badge bg-success">완료 (' + submittedCount + '/' + totalApplicants + ')</span>';
            } else {
                evalStatus = '<span class="badge bg-warning text-dark">진행중 (' + submittedCount + '/' + totalApplicants + ')</span>';
            }
        } else {
            evalStatus = '<span class="text-muted small">-</span>';
        }

        // 서명 현황
        let sigStatus = '';
        if (u.role === 'judge' || u.role === 'admin') {
            var userSigs = signatures.filter(s => s.userId === u.id);
            if (userSigs.length > 0) {
                sigStatus = '<span class="badge bg-success"><i class="bi bi-check"></i> ' + userSigs.length + '건</span>';
            } else {
                sigStatus = '<span class="badge bg-secondary">미서명</span>';
            }
        }

        html += '<tr><td>' + u.id + '</td><td class="fw-bold">' + u.name + '</td>'
            + '<td>' + (u.role === 'admin' ? '<span class="badge bg-warning text-dark">관리자</span>' : '<span class="badge bg-info">심사위원</span>') + '</td>'
            + '<td>' + evalStatus + '</td>'
            + '<td>' + sigStatus + '</td>'
            + '<td>' + (u.id !== currentUser.id ? '<button class="btn btn-sm btn-outline-danger" onclick="if(confirm(\'삭제하시겠습니까?\')){deleteUser(\'' + u.id + '\');renderUsers();}"><i class="bi bi-trash"></i></button>' : '<span class="text-muted">본인</span>') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('userTable').innerHTML = html;
}

document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const ok = addUser({
        id: document.getElementById('newUsername').value.trim(),
        password: document.getElementById('newPassword').value,
        name: document.getElementById('newName').value.trim(),
        role: document.getElementById('newRole').value
    });
    if (ok) { showAlert('사용자가 등록되었습니다!'); this.reset(); renderUsers(); }
    else showAlert('이미 존재하는 아이디입니다.', 'danger');
});

// --- 파일 관리 ---
function renderFiles() {
    const files = getDB('files') || [];
    let html = files.length ? '<ul class="list-group">' + files.map((f, i) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="bi bi-file-earmark"></i> ${f.name} <small class="text-muted">(${f.size})</small></span>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${i})"><i class="bi bi-trash"></i></button>
        </li>`).join('') + '</ul>' : '<p class="text-muted">업로드된 파일이 없습니다.</p>';
    document.getElementById('fileList').innerHTML = html;
}

document.getElementById('fileUpload').addEventListener('change', function(e) {
    const files = getDB('files') || [];
    Array.from(e.target.files).forEach(f => {
        if (files.length >= 10) { showAlert('최대 10개까지 업로드 가능합니다.', 'warning'); return; }
        files.push({ name: f.name, size: (f.size / 1024).toFixed(1) + 'KB', date: new Date().toISOString() });
    });
    setDB('files', files);
    renderFiles();
    e.target.value = '';
});

function removeFile(idx) {
    const files = getDB('files') || [];
    files.splice(idx, 1);
    setDB('files', files);
    renderFiles();
}

// ===== 심사평가 서명 선택 =====
function renderEvalSigSelect() {
    var interviews = getInterviews();
    var el = document.getElementById('evalSigSelectList');
    var myInterviews = interviews.filter(function(iv) {
        return isAdmin() || iv.judges.includes(currentUser.id);
    });
    if (!myInterviews.length) {
        el.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox display-1"></i><p class="mt-3">배정된 면접이 없습니다.</p></div>';
        return;
    }
    var sigs = getDB('signatures') || [];
    var html = '<p class="text-muted mb-4">면접 심사 평가 완료 후 개인 서명을 합니다. 운영위원회 회의록 서명과는 별도입니다.</p>';
    for (var i = 0; i < myInterviews.length; i++) {
        var iv = myInterviews[i];
        var judges = getUsers().filter(function(u) { return iv.judges.includes(u.id); });
        var admin = getUsers().find(function(u) { return u.role === 'admin'; });
        var allSigners = admin ? [admin].concat(judges) : judges;
        var signedCount = 0;
        for (var m = 0; m < allSigners.length; m++) {
            if (sigs.some(function(s) { return s.interviewId === iv.id && s.userId === allSigners[m].id; })) signedCount++;
        }
        var mySigned = sigs.some(function(s) { return s.interviewId === iv.id && s.userId === currentUser.id; });
        var statusBadge = mySigned
            ? '<span class="badge bg-success me-2"><i class="bi bi-check"></i> 서명완료</span>'
            : '<span class="badge bg-warning text-dark me-2">미서명</span>';
        var countBadge = '<span class="badge bg-secondary">전체 ' + signedCount + '/' + allSigners.length + '</span>';

        html += '<div class="card shadow-sm mb-3"><div class="card-body d-flex justify-content-between align-items-center">'
            + '<div>'
            + '<h5 class="fw-bold mb-1">' + iv.title + '</h5>'
            + '<small class="text-muted">' + iv.date + ' | 지원자 ' + iv.applicants.length + '명</small>'
            + '<div class="mt-1">' + statusBadge + countBadge + '</div>'
            + '</div>'
            + '<button class="btn btn-info text-white" onclick="openSignaturePage(\'' + iv.id + '\')">'
            + '<i class="bi bi-pen"></i> 서명하기'
            + '</button>'
            + '</div></div>';
    }
    el.innerHTML = html;
}

// ===== 심사평가 서명 페이지 =====
let sigCanvas = null;
let sigCtx = null;
let sigDrawing = false;

function openSignaturePage(ivId) {
    try {
        var iv = getInterviews().find(function(i) { return i.id === ivId; });
        if (!iv) { showAlert('면접을 찾을 수 없습니다.', 'danger'); return; }
        currentInterview = iv;

        var signatures = getDB('signatures') || [];
        var mySig = signatures.find(function(s) { return s.interviewId === ivId && s.userId === currentUser.id; });
        var judges = getUsers().filter(function(u) { return iv.judges.includes(u.id); });
        var admin = getUsers().find(function(u) { return u.role === 'admin'; });
        var allSigners = admin ? [admin].concat(judges) : judges;

        // 서명 현황 카드 생성
        var signerCards = '';
        for (var i = 0; i < allSigners.length; i++) {
            var signer = allSigners[i];
            var sig = null;
            for (var j = 0; j < signatures.length; j++) {
                if (signatures[j].interviewId === ivId && signatures[j].userId === signer.id) {
                    sig = signatures[j]; break;
                }
            }
            var headerClass = sig ? 'bg-success' : 'bg-secondary';
            var borderClass = sig ? 'border-success' : 'border-secondary';
            var bodyContent = sig
                ? '<img src="' + sig.dataUrl + '" alt="서명" style="max-height:70px;max-width:180px;">'
                : '<span class="text-muted small">미서명</span>';
            var footerHtml = sig
                ? '<div class="card-footer text-center py-1"><small class="text-muted">' + new Date(sig.timestamp).toLocaleString('ko-KR') + '</small></div>'
                : '';

            signerCards += '<div class="col-md-4 col-lg-3 mb-3">'
                + '<div class="card ' + borderClass + '">'
                + '<div class="card-header ' + headerClass + ' text-white text-center py-2"><small class="fw-bold">' + signer.name + '</small></div>'
                + '<div class="card-body sig-preview p-2">' + bodyContent + '</div>'
                + footerHtml
                + '</div></div>';
        }

        // 모든 서명 완료 확인
        var allSigned = true;
        for (var k = 0; k < allSigners.length; k++) {
            var found = false;
            for (var m = 0; m < signatures.length; m++) {
                if (signatures[m].interviewId === ivId && signatures[m].userId === allSigners[k].id) { found = true; break; }
            }
            if (!found) { allSigned = false; break; }
        }

        var mySigAlert = mySig
            ? '<div class="alert alert-success"><i class="bi bi-check-circle"></i> 서명이 이미 등록되어 있습니다. 다시 서명하면 기존 서명이 교체됩니다.</div>'
            : '';

        var allSignedAlert = allSigned
            ? '<div class="alert alert-success mt-3"><i class="bi bi-check-circle-fill"></i> <strong>모든 서명이 완료되었습니다!</strong> <button class="btn btn-success ms-3" onclick="showResults(\'' + ivId + '\')"><i class="bi bi-file-text"></i> 결과/회의록 보기</button></div>'
            : '';

        var html = ''
            + '<a href="#" onclick="showPage(\'eval_sig_select\')" class="text-muted"><i class="bi bi-arrow-left"></i> 뒤로</a>'
            + '<div class="eval-header mt-2 mb-0">'
            + '<h4 class="mb-0"><i class="bi bi-pen"></i> 심사평가 결과 서명</h4>'
            + '<small>' + iv.title + ' | ' + iv.date + '</small>'
            + '</div>'
            + '<div class="card shadow-sm rounded-top-0 mb-4"><div class="card-body p-4">'
            + '<div class="alert alert-info"><i class="bi bi-info-circle"></i> 평가가 완료되었습니다. 아래에 자필 서명을 해주세요.</div>'
            + '<h5 class="fw-bold mb-3 border-bottom pb-2">서명 현황</h5>'
            + '<div class="row mb-4">' + signerCards + '</div>'
            + '<h5 class="fw-bold mb-3 border-bottom pb-2"><i class="bi bi-pen"></i> 내 서명</h5>'
            + '<p class="text-muted small mb-2">아래 영역에 마우스 또는 터치로 서명해주세요.</p>'
            + '<div class="sig-canvas-wrap mb-3" style="width:100%;max-width:500px;">'
            + '<canvas id="sigCanvas" width="500" height="200"></canvas>'
            + '<span class="sig-placeholder" id="sigPlaceholder">여기에 서명하세요</span>'
            + '</div>'
            + '<div class="d-flex gap-2 mb-4">'
            + '<button class="btn btn-outline-secondary" onclick="clearSignature()"><i class="bi bi-eraser"></i> 다시 쓰기</button>'
            + '<button class="btn btn-primary main-btn" onclick="saveSignature(\'' + ivId + '\')"><i class="bi bi-check-lg"></i> 서명 저장</button>'
            + '</div>'
            + mySigAlert
            + allSignedAlert
            + '</div></div>';

        document.getElementById('signatureContent').innerHTML = html;
        showPage('signature');
        setTimeout(initSignatureCanvas, 200);
    } catch(err) {
        console.error('서명 페이지 오류:', err);
        showAlert('서명 페이지 로드 중 오류가 발생했습니다: ' + err.message, 'danger');
    }
}

function initSignatureCanvas() {
    sigCanvas = document.getElementById('sigCanvas');
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');

    // 고해상도 지원
    const rect = sigCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sigCanvas.width = rect.width * dpr;
    sigCanvas.height = 200 * dpr;
    sigCanvas.style.width = rect.width + 'px';
    sigCanvas.style.height = '200px';
    sigCtx.scale(dpr, dpr);

    sigCtx.strokeStyle = '#1a237e';
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigDrawing = false;

    // 마우스 이벤트
    sigCanvas.addEventListener('mousedown', sigStart);
    sigCanvas.addEventListener('mousemove', sigMove);
    sigCanvas.addEventListener('mouseup', sigEnd);
    sigCanvas.addEventListener('mouseleave', sigEnd);

    // 터치 이벤트
    sigCanvas.addEventListener('touchstart', sigTouchStart, { passive: false });
    sigCanvas.addEventListener('touchmove', sigTouchMove, { passive: false });
    sigCanvas.addEventListener('touchend', sigEnd);
}

function getPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function sigStart(e) {
    sigDrawing = true;
    const pos = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
    document.getElementById('sigPlaceholder').style.display = 'none';
}

function sigMove(e) {
    if (!sigDrawing) return;
    const pos = getPos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
}

function sigEnd() {
    sigDrawing = false;
}

function sigTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigDrawing = true;
    sigCtx.beginPath();
    sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    document.getElementById('sigPlaceholder').style.display = 'none';
}

function sigTouchMove(e) {
    e.preventDefault();
    if (!sigDrawing) return;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sigCtx.stroke();
}

function clearSignature() {
    if (!sigCtx) return;
    const dpr = window.devicePixelRatio || 1;
    sigCtx.clearRect(0, 0, sigCanvas.width / dpr, sigCanvas.height / dpr);
    document.getElementById('sigPlaceholder').style.display = '';
}

function isCanvasBlank() {
    const dpr = window.devicePixelRatio || 1;
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width;
    blank.height = sigCanvas.height;
    return sigCanvas.toDataURL() === blank.toDataURL();
}

function saveSignature(ivId) {
    if (!sigCanvas || isCanvasBlank()) {
        showAlert('서명을 입력해주세요.', 'warning');
        return;
    }

    const dataUrl = sigCanvas.toDataURL('image/png');
    const signatures = getDB('signatures') || [];
    const idx = signatures.findIndex(s => s.interviewId === ivId && s.userId === currentUser.id);
    const sigData = {
        interviewId: ivId,
        userId: currentUser.id,
        userName: currentUser.name,
        dataUrl: dataUrl,
        timestamp: new Date().toISOString()
    };

    if (idx >= 0) signatures[idx] = sigData;
    else signatures.push(sigData);
    setDB('signatures', signatures);

    showAlert('서명이 저장되었습니다!', 'success');
    openSignaturePage(ivId); // 새로고침
}

// 면접 카드에 서명 버튼 추가를 위해 renderApplicantList 수정
const _origRenderApplicantList = renderApplicantList;
renderApplicantList = function() {
    _origRenderApplicantList();
    // 모든 평가 완료 시 서명 버튼 추가
    const evals = getEvaluations().filter(e => e.interviewId === currentInterview.id && e.judgeId === currentUser.id && e.status === 'submitted');
    const allDone = currentInterview.applicants.length > 0 && currentInterview.applicants.every(app => evals.some(e => e.applicantId === app.id));
    if (allDone) {
        const container = document.getElementById('evaluateContent');
        container.innerHTML += `
        <div class="alert alert-success mt-4 d-flex justify-content-between align-items-center">
            <div><i class="bi bi-check-circle-fill"></i> <strong>모든 지원자 평가 완료!</strong> 서명을 진행해주세요.</div>
            <button class="btn btn-success btn-lg" onclick="openSignaturePage('${currentInterview.id}')">
                <i class="bi bi-pen"></i> 서명하기
            </button>
        </div>`;
    }
};

// --- 초기화 ---
window.addEventListener('load', function() {
    const saved = sessionStorage.getItem('iv_currentUser');
    if (saved) { currentUser = JSON.parse(saved); enterApp(); }
});
