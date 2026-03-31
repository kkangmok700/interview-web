// ===== 데이터 관리 (localStorage 기반) =====

const EVAL_CRITERIA = [
    {
        id: 1, name: '전문지식 및 근무환경 이해도', maxScore: 40,
        scores: [40, 37, 33, 30, 27],
        labels: ['탁월', '우수', '보통', '미흡', '매우 미흡'],
        questions: [
            '수행하려는 학교의 기관(지역)의 업무를 타인에게는 어떤 것인지?',
            '담당 업무 전문성이 뛰어난 것으로 보이는가?',
            '사용할 지식·경험·비전·사회공헌의식을 이끌어낼 능력이 보이는가?',
        ]
    },
    {
        id: 2, name: '컴퓨터 활용 능력', maxScore: 15,
        scores: [15, 13, 11, 9, 7],
        labels: ['탁월', '우수', '보통', '미흡', '매우 미흡'],
        questions: [
            '컴퓨터(엑셀/파워포인트/워드 등)의 활용능력이 뛰어난가?',
            '최근 IT 트렌드, 인터넷/사무 기반의 실행능력이 있는가?',
            '전산(ERP)의 이해와 능력이 보이는가?',
        ]
    },
    {
        id: 3, name: '의사표현 및 논리성', maxScore: 15,
        scores: [15, 13, 11, 9, 7],
        labels: ['탁월', '우수', '보통', '미흡', '매우 미흡'],
        questions: [
            '답변이 일관적이고 정확한 의견을 전달하는가?',
            '다양한 질문에 적절한 대응을 하였는가?',
            '언어표현 능력, 원활한 커뮤니케이션이 가능한 사람인가?',
        ]
    },
    {
        id: 4, name: '예의, 품성 및 봉사', maxScore: 15,
        scores: [15, 13, 11, 9, 7],
        labels: ['탁월', '우수', '보통', '미흡', '매우 미흡'],
        questions: [
            '진정한 인성/가치가 나타나며 인간으로서 가치를 느끼는가?',
            '차분하고 신뢰감 있는 모습에서 규칙적 태도가 느껴지는가?',
        ]
    },
    {
        id: 5, name: '창의력/역지사지/발전 가능성', maxScore: 15,
        scores: [15, 13, 11, 9, 7],
        labels: ['탁월', '우수', '보통', '미흡', '매우 미흡'],
        questions: [
            '책임감/리더십 등 강점에 대한 질문에 답할 수 있는가?',
            '면접에서 자기소개의 모습이 진정성이 있는가?',
            '발전 가능성과 조직 적합성이 느껴지는가?',
        ]
    }
];

// 기본 사용자
const DEFAULT_USERS = [
    { id: 'admin', password: '1234', name: '김경목 산단장', role: 'admin' },
    { id: 'judge1', password: '1234', name: '김예진 부총장', role: 'judge' },
    { id: 'judge2', password: '1234', name: '강병철 처장', role: 'judge' },
    { id: 'judge3', password: '1234', name: '김응기 처장', role: 'judge' },
    { id: 'judge4', password: '1234', name: '이선우 처장', role: 'judge' },
    { id: 'judge5', password: '1234', name: '주현재 처장', role: 'judge' },
    { id: 'judge6', password: '1234', name: '문동규 처장', role: 'judge' },
    { id: 'judge7', password: '1234', name: '김주선 처장', role: 'judge' },
    { id: 'judge8', password: '1234', name: '장민수 팀장', role: 'judge' },
];

function getDB(key) {
    const data = localStorage.getItem('iv_' + key);
    return data ? JSON.parse(data) : null;
}

function setDB(key, value) {
    localStorage.setItem('iv_' + key, JSON.stringify(value));
}

function initDB() {
    if (!getDB('users')) {
        setDB('users', DEFAULT_USERS);
    }
    if (!getDB('interviews')) setDB('interviews', []);
    if (!getDB('evaluations')) setDB('evaluations', []);
    if (!getDB('files')) setDB('files', []);
    if (!getDB('signatures')) setDB('signatures', []);
}

function getUsers() { return getDB('users') || []; }
function getInterviews() { return getDB('interviews') || []; }
function getEvaluations() { return getDB('evaluations') || []; }

function saveInterview(iv) {
    const list = getInterviews();
    iv.id = Date.now().toString();
    list.push(iv);
    setDB('interviews', list);
    return iv;
}

function saveEvaluation(ev) {
    const list = getEvaluations();
    const idx = list.findIndex(e => e.applicantId === ev.applicantId && e.judgeId === ev.judgeId && e.interviewId === ev.interviewId);
    if (idx >= 0) list[idx] = ev;
    else list.push(ev);
    setDB('evaluations', list);
}

function addUser(user) {
    const users = getUsers();
    if (users.find(u => u.id === user.id)) return false;
    users.push(user);
    setDB('users', users);
    return true;
}

function deleteUser(userId) {
    const users = getUsers().filter(u => u.id !== userId);
    setDB('users', users);
}

initDB();
