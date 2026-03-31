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
function showResults(ivId) {
    const iv = getInterviews().find(i => i.id === ivId);
    if (!iv) return;
    const evals = getEvaluations().filter(e => e.interviewId === ivId && e.status === 'submitted');
    const judges = getUsers().filter(u => iv.judges.includes(u.id));

    let results = iv.applicants.map(app => {
        const appEvals = evals.filter(e => e.applicantId === app.id);
        const avg = appEvals.length ? appEvals.reduce((s, e) => s + e.total, 0) / appEvals.length : 0;
        return { app, evals: appEvals, avg: Math.round(avg * 100) / 100, complete: appEvals.length === judges.length };
    });
    results.sort((a, b) => b.avg - a.avg);

    let passed = 0;
    results.forEach(r => {
        if (r.complete && r.avg >= 70 && passed < iv.hireCount) { r.result = '합격'; passed++; }
        else if (r.complete && r.avg < 70) r.result = '탈락(기준미달)';
        else if (r.complete) r.result = '탈락(정원초과)';
        else r.result = '진행중';
    });

    let html = `<h3 class="mb-4"><i class="bi bi-bar-chart"></i> ${iv.title} - 결과</h3>
    <div class="table-responsive"><table class="table table-bordered text-center shadow-sm">
    <thead class="table-dark"><tr><th>순위</th><th>지원자</th><th>분야</th>`;
    judges.forEach(j => html += `<th>${j.name}</th>`);
    html += `<th>평균</th><th>결과</th></tr></thead><tbody>`;
    results.forEach((r, i) => {
        const cls = r.result === '합격' ? 'table-success' : '';
        html += `<tr class="${cls}"><td>${i + 1}</td><td class="fw-bold">${r.app.name}</td><td>${r.app.field}</td>`;
        judges.forEach(j => {
            const je = r.evals.find(e => e.judgeId === j.id);
            html += `<td>${je ? je.total : '-'}</td>`;
        });
        html += `<td class="fw-bold fs-5 ${r.avg >= 70 ? 'text-success' : 'text-danger'}">${r.avg}</td>`;
        html += `<td>${r.result === '합격' ? '<span class="badge bg-success fs-6">합격</span>' : r.result}</td></tr>`;
    });
    html += '</tbody></table></div>';

    document.getElementById('resultsDashboard').innerHTML = html;
    showPage('results_dashboard');
}

function renderResultsDashboard() {
    const interviews = getInterviews();
    if (!interviews.length) {
        document.getElementById('resultsDashboard').innerHTML = '<div class="text-center py-5 text-muted"><p>등록된 면접이 없습니다.</p></div>';
        return;
    }
    let html = '';
    interviews.forEach(iv => {
        html += `<div class="card shadow-sm mb-3"><div class="card-body d-flex justify-content-between align-items-center">
            <div><h5 class="fw-bold mb-1">${iv.title}</h5><small class="text-muted">${iv.date}</small></div>
            <button class="btn btn-info text-white" onclick="showResults('${iv.id}')"><i class="bi bi-bar-chart"></i> 결과 보기</button>
        </div></div>`;
    });
    document.getElementById('resultsDashboard').innerHTML = html;
}

// --- 회의록 ---
function showMinutes(ivId) {
    const iv = getInterviews().find(i => i.id === ivId);
    if (!iv) return;
    showResults(ivId); // 결과와 동일하게 표시
}

// --- 사용자 관리 ---
function renderUsers() {
    const users = getUsers();
    let html = '<table class="table table-hover mb-0"><thead class="table-light"><tr><th>아이디</th><th>이름</th><th>역할</th><th>삭제</th></tr></thead><tbody>';
    users.forEach(u => {
        html += `<tr><td>${u.id}</td><td class="fw-bold">${u.name}</td>
            <td>${u.role === 'admin' ? '<span class="badge bg-warning text-dark">관리자</span>' : '<span class="badge bg-info">심사위원</span>'}</td>
            <td>${u.id !== currentUser.id ? `<button class="btn btn-sm btn-outline-danger" onclick="if(confirm('삭제하시겠습니까?')){deleteUser('${u.id}');renderUsers();}"><i class="bi bi-trash"></i></button>` : '<span class="text-muted">본인</span>'}</td></tr>`;
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

// ===== 서명 페이지 =====
let sigCanvas = null;
let sigCtx = null;
let sigDrawing = false;

function openSignaturePage(ivId) {
    const iv = getInterviews().find(i => i.id === ivId);
    if (!iv) return;
    currentInterview = iv;

    const signatures = getDB('signatures') || [];
    const mySig = signatures.find(s => s.interviewId === ivId && s.userId === currentUser.id);
    const judges = getUsers().filter(u => iv.judges.includes(u.id));
    const admin = getUsers().find(u => u.role === 'admin');
    const allSigners = admin ? [admin, ...judges] : judges;

    let html = `
    <a href="#" onclick="showPage('evaluate_select')" class="text-muted"><i class="bi bi-arrow-left"></i> 뒤로</a>
    <div class="eval-header mt-2 mb-0">
        <h4 class="mb-0"><i class="bi bi-pen"></i> 심사위원 서명</h4>
        <small>${iv.title} | ${iv.date}</small>
    </div>
    <div class="card shadow-sm rounded-top-0 mb-4">
        <div class="card-body p-4">
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 모든 평가가 완료되었습니다. 아래에 자필 서명을 해주세요.
            </div>

            <!-- 서명 현황 -->
            <h5 class="fw-bold mb-3 border-bottom pb-2">서명 현황</h5>
            <div class="row mb-4">
                ${allSigners.map(signer => {
                    const sig = signatures.find(s => s.interviewId === ivId && s.userId === signer.id);
                    return `
                    <div class="col-md-4 col-lg-3 mb-3">
                        <div class="card ${sig ? 'border-success' : 'border-secondary'}">
                            <div class="card-header ${sig ? 'bg-success' : 'bg-secondary'} text-white text-center py-2">
                                <small class="fw-bold">${signer.name}</small>
                            </div>
                            <div class="card-body sig-preview p-2">
                                ${sig
                                    ? `<img src="${sig.dataUrl}" alt="서명"><br>`
                                    : '<span class="text-muted small">미서명</span>'}
                            </div>
                            ${sig ? `<div class="card-footer text-center py-1"><small class="text-muted">${new Date(sig.timestamp).toLocaleString('ko-KR')}</small></div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>

            <!-- 내 서명 입력 -->
            <h5 class="fw-bold mb-3 border-bottom pb-2"><i class="bi bi-pen"></i> 내 서명</h5>
            <p class="text-muted small mb-2">아래 영역에 마우스 또는 터치로 서명해주세요.</p>

            <div class="sig-canvas-wrap mb-3" style="width:100%;max-width:500px;">
                <canvas id="sigCanvas" width="500" height="200"></canvas>
                <span class="sig-placeholder" id="sigPlaceholder">여기에 서명하세요</span>
            </div>

            <div class="d-flex gap-2 mb-4">
                <button class="btn btn-outline-secondary" onclick="clearSignature()">
                    <i class="bi bi-eraser"></i> 다시 쓰기
                </button>
                <button class="btn btn-primary main-btn" onclick="saveSignature('${ivId}')">
                    <i class="bi bi-check-lg"></i> 서명 저장
                </button>
            </div>

            ${mySig ? '<div class="alert alert-success"><i class="bi bi-check-circle"></i> 서명이 이미 등록되어 있습니다. 다시 서명하면 기존 서명이 교체됩니다.</div>' : ''}

            <!-- 회의록 이동 -->
            ${(() => {
                const allSigned = allSigners.every(s => signatures.some(sig => sig.interviewId === ivId && sig.userId === s.id));
                return allSigned ? `
                <div class="alert alert-success mt-3">
                    <i class="bi bi-check-circle-fill"></i> <strong>모든 서명이 완료되었습니다!</strong>
                    <button class="btn btn-success ms-3" onclick="showMinutes('${ivId}')">
                        <i class="bi bi-file-text"></i> 회의록 보기
                    </button>
                </div>` : '';
            })()}
        </div>
    </div>`;

    document.getElementById('signatureContent').innerHTML = html;
    showPage('signature');

    // 캔버스 초기화
    setTimeout(initSignatureCanvas, 100);
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
